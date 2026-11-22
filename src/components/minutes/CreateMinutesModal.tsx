'use client'

import useSWR from 'swr'
import { FileAudio, FileText, Sparkles, UploadCloud, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import { formatBytes, formatTimestamp } from '@/components/transcribe/helpers'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import axios from '@/lib/axios'
import type { FieldErrors, MeetingMinutes, MinutesOptions, TranscriptionOptions } from '@/types'
import { errorMessage, formatDate } from '@/utils/format'

const fetcher = (url: string) => axios.get(url).then(r => r.data)

type Source = 'transcript' | 'recording'

const selectCls = 'h-12 w-full rounded-xl border-line text-[15px] text-ink focus:border-primary focus:ring-4 focus:ring-primary/15'
const textareaCls = 'w-full rounded-xl border-line text-[15px] text-ink placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/15'

const OUTPUT_CHOICES = [
    { code: 'eng', label: 'Full English' },
    { code: 'fil', label: 'Full Tagalog' },
]

const OUTPUT_HINTS: Record<string, string> = {
    eng: 'Everything in English — Tagalog, Taglish and Bicol speech is translated.',
    fil: 'Lahat sa Tagalog — walang Taglish. English and Bicol speech is translated.',
}

const SOURCES: { value: Source; title: string; text: string; Icon: any }[] = [
    { value: 'transcript', title: 'From a transcript', text: 'Use a meeting you already transcribed', Icon: FileText },
    { value: 'recording', title: 'From a recording', text: 'Upload audio — we transcribe it first', Icon: FileAudio },
]

interface Props {
    open: boolean
    onClose: () => void
    /** Pre-select a transcript (e.g. coming from a meeting's "Minutes" button). */
    transcriptionId?: number | null
}

export default function CreateMinutesModal({ open, onClose, transcriptionId }: Props) {
    const router = useRouter()
    const { data: options } = useSWR<MinutesOptions>(open ? '/api/minutes/options' : null, fetcher)
    const { data: tOptions } = useSWR<TranscriptionOptions>(open ? '/api/transcriptions/options' : null, fetcher)
    const inputRef = useRef<HTMLInputElement>(null)

    const [source, setSource] = useState<Source>('transcript')
    const [file, setFile] = useState<File | null>(null)
    const [form, setForm] = useState({ transcription_id: '', title: '', output_language: 'eng', instructions: '', language: 'auto', num_speakers: '' })
    const [errors, setErrors] = useState<FieldErrors>({})
    const [progress, setProgress] = useState<number | null>(null)

    useEffect(() => {
        if (!open) return
        setFile(null)
        setErrors({})
        setProgress(null)
        setSource('transcript')
        setForm({ transcription_id: transcriptionId ? String(transcriptionId) : '', title: '', output_language: 'eng', instructions: '', language: 'auto', num_speakers: '' })
    }, [open, transcriptionId])

    const transcripts = options?.transcriptions ?? []
    // No transcripts yet → start on the upload tab.
    useEffect(() => {
        if (options && !options.transcriptions.length && !transcriptionId) setSource('recording')
    }, [options, transcriptionId])

    const maxMb = tOptions?.max_upload_mb ?? 300
    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

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
        const fd = new FormData()
        fd.append('source', source)
        fd.append('output_language', form.output_language)
        fd.append('title', form.title)
        if (form.instructions.trim()) fd.append('instructions', form.instructions)

        if (source === 'transcript') {
            if (!form.transcription_id) return setErrors({ transcription_id: ['Choose a transcript.'] })
            fd.append('transcription_id', form.transcription_id)
        } else {
            if (!file) return setErrors({ file: ['Choose a recording.'] })
            fd.append('file', file)
            fd.append('language', form.language)
            // Minutes don't need fillers or false starts, so transcribe in clean mode.
            fd.append('mode', 'clean')
            if (form.num_speakers) fd.append('num_speakers', form.num_speakers)
        }

        setErrors({})
        setProgress(0)
        try {
            const res = await axios.post<{ minutes: MeetingMinutes }>('/api/minutes', fd, {
                onUploadProgress: e => source === 'recording' && setProgress(e.total ? Math.round((e.loaded / e.total) * 100) : null),
            })
            router.push(`/minutes/${res.data.minutes.id}`)
            onClose()
        } catch (err: any) {
            setProgress(null)
            if (err.response?.status === 422 && err.response.data.errors) setErrors(err.response.data.errors)
            else if (err.response?.status === 413) setErrors({ file: [`The recording may not be larger than ${maxMb} MB.`] })
            else setErrors({ general: [errorMessage(err)] })
        }
    }

    const busy = progress !== null
    const selected = transcripts.find(t => String(t.id) === form.transcription_id)

    return (
        <Modal
            open={open}
            onClose={busy ? () => undefined : onClose}
            title="Create minutes of meeting"
            size="lg"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={busy}>
                        Cancel
                    </Button>
                    <Button variant="ai" loading={busy} onClick={submit} icon={<Sparkles className="h-4 w-4" />}>
                        {busy ? (source === 'recording' && progress != null && progress < 100 ? `Uploading ${progress}%` : 'Starting…') : 'Create minutes'}
                    </Button>
                </>
            }>
            <div className="space-y-5">
                {errors.general && <Alert tone="error">{errors.general[0]}</Alert>}
                {options?.driver === 'fake' && <Alert tone="warning">Demo mode: no AI key is configured, so you&apos;ll get sample minutes instead of real ones.</Alert>}

                <div className="grid gap-2 sm:grid-cols-2">
                    {SOURCES.map(({ value, title, text, Icon }) => (
                        <button
                            key={value}
                            type="button"
                            disabled={busy}
                            onClick={() => {
                                setSource(value)
                                setErrors({})
                            }}
                            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${source === value ? 'border-ai bg-ai-soft/60' : 'border-line hover:bg-canvas'}`}>
                            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${source === value ? 'text-ai' : 'text-muted'}`} />
                            <span>
                                <span className="block font-semibold text-dark">{title}</span>
                                <span className="mt-0.5 block text-xs text-muted">{text}</span>
                            </span>
                        </button>
                    ))}
                </div>

                {source === 'transcript' ? (
                    <div>
                        <label htmlFor="m-t" className="mb-1.5 block text-sm font-medium text-body">
                            Transcript
                        </label>
                        <select
                            id="m-t"
                            value={form.transcription_id}
                            onChange={e => setForm(f => ({ ...f, transcription_id: e.target.value, title: '' }))}
                            className={`${selectCls} ${errors.transcription_id ? 'border-danger' : ''}`}>
                            <option value="">{transcripts.length ? 'Choose a meeting…' : 'No transcripts yet'}</option>
                            {transcripts.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.title} · {formatDate(t.created_at)}
                                    {t.status !== 'completed' ? ' (still transcribing)' : ` · ${formatTimestamp(t.duration_secs)}`}
                                </option>
                            ))}
                        </select>
                        {errors.transcription_id && <p className="mt-1.5 text-xs text-danger">{errors.transcription_id[0]}</p>}
                        {selected && selected.status !== 'completed' && (
                            <p className="mt-1.5 text-xs text-muted">This recording is still being transcribed — the minutes will start as soon as it&apos;s done.</p>
                        )}
                    </div>
                ) : (
                    <>
                        <div>
                            <input ref={inputRef} type="file" accept="audio/*,video/*" className="hidden" onChange={e => pick(e.target.files?.[0])} />
                            {file ? (
                                <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas px-4 py-3">
                                    <FileAudio className="h-6 w-6 shrink-0 text-ai" />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium text-dark">{file.name}</div>
                                        <div className="text-xs text-muted">{formatBytes(file.size)}</div>
                                    </div>
                                    {!busy && (
                                        <button type="button" onClick={() => setFile(null)} className="rounded-lg p-1.5 text-muted hover:bg-white" aria-label="Remove file">
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => inputRef.current?.click()}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={e => {
                                        e.preventDefault()
                                        pick(e.dataTransfer.files?.[0])
                                    }}
                                    className={`flex w-full flex-col items-center rounded-2xl border-2 border-dashed px-4 py-7 text-center transition ${errors.file ? 'border-danger' : 'border-line hover:border-ai/50 hover:bg-canvas'}`}>
                                    <UploadCloud className="h-8 w-8 text-ai" />
                                    <span className="mt-2 font-semibold text-dark">Choose a recording</span>
                                    <span className="mt-0.5 text-xs text-muted">or drag it here · audio or video up to {maxMb} MB</span>
                                </button>
                            )}
                            {busy && progress != null && (
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                                    <div className="h-full bg-ai transition-all" style={{ width: `${progress}%` }} />
                                </div>
                            )}
                            {errors.file && <p className="mt-1.5 text-xs text-danger">{errors.file[0]}</p>}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="m-lang" className="mb-1.5 block text-sm font-medium text-body">
                                    Spoken language
                                </label>
                                <select id="m-lang" value={form.language} onChange={set('language')} className={selectCls}>
                                    {(tOptions?.languages ?? [{ code: 'auto', label: 'Auto-detect', supported: true }]).map(l => (
                                        <option key={l.code} value={l.code}>
                                            {l.label}
                                            {l.supported ? '' : ' (beta)'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="m-spk" className="mb-1.5 block text-sm font-medium text-body">
                                    Number of speakers
                                </label>
                                <select id="m-spk" value={form.num_speakers} onChange={set('num_speakers')} className={selectCls}>
                                    <option value="">Detect automatically</option>
                                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                                        <option key={n} value={n}>
                                            {n === 1 ? '1 speaker' : `Up to ${n} speakers`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <p className="-mt-2 text-xs text-muted">The transcript is also saved to My meetings, so you can rename speakers there and regenerate the minutes.</p>
                    </>
                )}

                <Input id="m-title" label="Title" value={form.title} onChange={set('title')} error={errors.title} placeholder={selected?.title ?? 'e.g. Barangay council meeting'} />

                <div>
                    <div className="mb-1.5 text-sm font-medium text-body">Write the minutes in</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {(options?.output_languages ?? OUTPUT_CHOICES).map(l => (
                            <label
                                key={l.code}
                                className={`cursor-pointer rounded-xl border px-4 py-3 transition ${form.output_language === l.code ? 'border-ai bg-ai-soft/60' : 'border-line hover:bg-canvas'}`}>
                                <span className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="output_language"
                                        className="text-ai focus:ring-ai"
                                        checked={form.output_language === l.code}
                                        onChange={() => setForm(f => ({ ...f, output_language: l.code }))}
                                    />
                                    <span className="font-semibold text-dark">{l.label}</span>
                                </span>
                                <span className="mt-1 block text-xs text-muted">{OUTPUT_HINTS[l.code]}</span>
                            </label>
                        ))}
                    </div>
                    {errors.output_language && <p className="mt-1.5 text-xs text-danger">{errors.output_language[0]}</p>}
                </div>

                <div>
                    <label htmlFor="m-ins" className="mb-1.5 block text-sm font-medium text-body">
                        Extra context <span className="font-normal text-muted">(optional)</span>
                    </label>
                    <textarea
                        id="m-ins"
                        rows={3}
                        value={form.instructions}
                        onChange={set('instructions')}
                        placeholder="e.g. Agenda: budget, road repair. Attendees: Kapitan Cruz (chair), Kagawad Reyes. Focus on decisions."
                        className={textareaCls}
                    />
                    <p className="mt-1 text-xs text-muted">Helps the AI name people and organize topics. The recording stays the source of truth.</p>
                    {errors.instructions && <p className="mt-1.5 text-xs text-danger">{errors.instructions[0]}</p>}
                </div>
            </div>
        </Modal>
    )
}
