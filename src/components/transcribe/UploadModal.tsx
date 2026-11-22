'use client'

import useSWR from 'swr'
import { FileAudio, UploadCloud, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import axios from '@/lib/axios'
import type { FieldErrors, Transcription, TranscriptionMode, TranscriptionOptions } from '@/types'
import { errorMessage } from '@/utils/format'
import { formatBytes } from './helpers'

const fetcher = (url: string) => axios.get(url).then(r => r.data)

const MODES: { value: TranscriptionMode; title: string; text: string }[] = [
    { value: 'verbatim', title: 'Verbatim', text: 'Word for word, exactly as spoken — keeps “uh”, “um”, repeats and sounds like (laughter).' },
    { value: 'clean', title: 'Clean (in toto)', text: 'The complete transcript, cleaned for reading — fillers and false starts removed. Nothing is summarized.' },
]

const selectCls = 'h-12 w-full rounded-xl border-line text-[15px] text-ink focus:border-primary focus:ring-4 focus:ring-primary/15'

export default function UploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const router = useRouter()
    const { data: options } = useSWR<TranscriptionOptions>(open ? '/api/transcriptions/options' : null, fetcher)
    const inputRef = useRef<HTMLInputElement>(null)
    const [file, setFile] = useState<File | null>(null)
    const [dragging, setDragging] = useState(false)
    const [form, setForm] = useState({ title: '', language: 'auto', mode: 'verbatim' as TranscriptionMode, num_speakers: '', keyterms: '' })
    const [errors, setErrors] = useState<FieldErrors>({})
    const [progress, setProgress] = useState<number | null>(null)

    useEffect(() => {
        if (!open) return
        setFile(null)
        setErrors({})
        setProgress(null)
        setForm({ title: '', language: 'auto', mode: 'verbatim', num_speakers: '', keyterms: '' })
    }, [open])

    const language = options?.languages.find(l => l.code === form.language)
    const maxMb = options?.max_upload_mb ?? 300

    const pick = (f?: File | null) => {
        if (!f) return
        setErrors({})
        if (f.size > maxMb * 1024 * 1024) {
            setErrors({ file: [`The recording may not be larger than ${maxMb} MB.`] })
            return
        }
        setFile(f)
        if (!form.title) setForm(v => ({ ...v, title: f.name.replace(/\.[^.]+$/, '') }))
    }

    const submit = async () => {
        if (!file) {
            setErrors({ file: ['Choose a recording to transcribe.'] })
            return
        }
        const fd = new FormData()
        fd.append('file', file)
        fd.append('title', form.title)
        fd.append('language', form.language)
        fd.append('mode', form.mode)
        if (form.num_speakers) fd.append('num_speakers', form.num_speakers)
        if (form.keyterms.trim()) fd.append('keyterms', form.keyterms)

        setErrors({})
        setProgress(0)
        try {
            const res = await axios.post<{ transcription: Transcription }>('/api/transcriptions', fd, {
                onUploadProgress: e => setProgress(e.total ? Math.round((e.loaded / e.total) * 100) : null),
            })
            router.push(`/meetings/${res.data.transcription.id}`)
            onClose()
        } catch (err: any) {
            setProgress(null)
            if (err.response?.status === 422) setErrors(err.response.data.errors)
            else if (err.response?.status === 413) setErrors({ file: [`The recording may not be larger than ${maxMb} MB.`] })
            else setErrors({ general: [errorMessage(err)] })
        }
    }

    const uploading = progress !== null

    return (
        <Modal
            open={open}
            onClose={uploading ? () => undefined : onClose}
            title="Transcribe a recording"
            size="lg"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={uploading}>
                        Cancel
                    </Button>
                    <Button loading={uploading} onClick={submit} icon={<UploadCloud className="h-4 w-4" />}>
                        {uploading ? (progress != null && progress < 100 ? `Uploading ${progress}%` : 'Starting…') : 'Upload & transcribe'}
                    </Button>
                </>
            }>
            <div className="space-y-5">
                {errors.general && <Alert tone="error">{errors.general[0]}</Alert>}
                {options?.driver === 'fake' && (
                    <Alert tone="warning">Demo mode: no speech-to-text key is configured, so you&apos;ll get a sample transcript instead of your audio.</Alert>
                )}

                {/* File picker */}
                <div>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="audio/*,video/*"
                        className="hidden"
                        onChange={e => pick(e.target.files?.[0])}
                    />
                    {file ? (
                        <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas px-4 py-3">
                            <FileAudio className="h-6 w-6 shrink-0 text-primary" />
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-dark">{file.name}</div>
                                <div className="text-xs text-muted">{formatBytes(file.size)}</div>
                            </div>
                            {!uploading && (
                                <button type="button" onClick={() => setFile(null)} className="rounded-lg p-1.5 text-muted hover:bg-white" aria-label="Remove file">
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            onDragOver={e => {
                                e.preventDefault()
                                setDragging(true)
                            }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={e => {
                                e.preventDefault()
                                setDragging(false)
                                pick(e.dataTransfer.files?.[0])
                            }}
                            className={`flex w-full flex-col items-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
                                dragging ? 'border-primary bg-primary-mint/40' : errors.file ? 'border-danger' : 'border-line hover:border-primary/50 hover:bg-canvas'
                            }`}>
                            <UploadCloud className="h-8 w-8 text-primary" />
                            <span className="mt-2 font-semibold text-dark">Choose a recording</span>
                            <span className="mt-0.5 text-xs text-muted">or drag it here · MP3, WAV, M4A, OGG, FLAC, WebM, MP4… up to {maxMb} MB</span>
                        </button>
                    )}
                    {uploading && progress != null && (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                        </div>
                    )}
                    {errors.file && <p className="mt-1.5 text-xs text-danger">{errors.file[0]}</p>}
                </div>

                <Input id="t-title" label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} error={errors.title} placeholder="e.g. Weekly team meeting" />

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="t-lang" className="mb-1.5 block text-sm font-medium text-body">
                            Spoken language
                        </label>
                        <select id="t-lang" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} className={selectCls}>
                            {(options?.languages ?? [{ code: 'auto', label: 'Auto-detect', supported: true }]).map(l => (
                                <option key={l.code} value={l.code}>
                                    {l.label}
                                    {l.supported ? '' : ' (beta)'}
                                </option>
                            ))}
                        </select>
                        {errors.language && <p className="mt-1.5 text-xs text-danger">{errors.language[0]}</p>}
                    </div>
                    <div>
                        <label htmlFor="t-spk" className="mb-1.5 block text-sm font-medium text-body">
                            Number of speakers
                        </label>
                        <select id="t-spk" value={form.num_speakers} onChange={e => setForm(f => ({ ...f, num_speakers: e.target.value }))} className={selectCls}>
                            <option value="">Detect automatically</option>
                            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                                <option key={n} value={n}>
                                    {n === 1 ? '1 speaker' : `Up to ${n} speakers`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {language && !language.supported && (
                    <Alert tone="warning">
                        {language.label} is not officially supported by the speech engine yet. We&apos;ll auto-detect the language — expect lower accuracy and some words
                        written the Tagalog way. Adding common names and local words below helps.
                    </Alert>
                )}

                <div>
                    <div className="mb-1.5 text-sm font-medium text-body">Transcript style</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {MODES.map(m => (
                            <label
                                key={m.value}
                                className={`cursor-pointer rounded-xl border px-4 py-3 transition ${form.mode === m.value ? 'border-primary bg-primary-mint/40' : 'border-line hover:bg-canvas'}`}>
                                <span className="flex items-center gap-2">
                                    <input type="radio" name="mode" className="text-primary focus:ring-primary" checked={form.mode === m.value} onChange={() => setForm(f => ({ ...f, mode: m.value }))} />
                                    <span className="font-semibold text-dark">{m.title}</span>
                                </span>
                                <span className="mt-1 block text-xs text-muted">{m.text}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="t-terms" className="mb-1.5 block text-sm font-medium text-body">
                        Names &amp; special words <span className="font-normal text-muted">(optional)</span>
                    </label>
                    <textarea
                        id="t-terms"
                        rows={2}
                        value={form.keyterms}
                        onChange={e => setForm(f => ({ ...f, keyterms: e.target.value }))}
                        placeholder="One per line or comma-separated, e.g. Juan Dela Cruz, Masbate, barangay"
                        className="w-full rounded-xl border-line text-[15px] text-ink placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/15"
                    />
                    <p className="mt-1 text-xs text-muted">Helps the engine spell people, places and local words correctly (max 5 words each).</p>
                    {errors.keyterms && <p className="mt-1.5 text-xs text-danger">{errors.keyterms[0]}</p>}
                </div>
            </div>
        </Modal>
    )
}
