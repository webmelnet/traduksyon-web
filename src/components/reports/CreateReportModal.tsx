'use client'

import useSWR from 'swr'
import { ClipboardList, FileText, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { OUTPUT_LANGUAGE_LABELS } from '@/components/minutes/helpers'
import { formatTimestamp } from '@/components/transcribe/helpers'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import axios from '@/lib/axios'
import type { CommitteeReport, FieldErrors, ReportOptions, ReportSource } from '@/types'
import { errorMessage, formatDate } from '@/utils/format'

const fetcher = (url: string) => axios.get(url).then(r => r.data)

const selectCls = 'h-12 w-full rounded-xl border-line text-[15px] text-ink focus:border-primary focus:ring-4 focus:ring-primary/15'
const textareaCls = 'w-full rounded-xl border-line text-[15px] text-ink placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/15'

const OUTPUT_CHOICES = [
    { code: 'eng', label: 'Full English' },
    { code: 'fil', label: 'Full Tagalog' },
]

const OUTPUT_HINTS: Record<string, string> = {
    eng: 'The whole report in formal English.',
    fil: 'Ang buong ulat sa pormal na Tagalog — walang Taglish.',
}

const SOURCES: { value: ReportSource; title: string; text: string; Icon: any }[] = [
    { value: 'minutes', title: 'From minutes of meeting', text: 'Best: uses your reviewed minutes', Icon: ClipboardList },
    { value: 'transcript', title: 'From a transcript', text: 'Straight from the transcribed meeting', Icon: FileText },
]

interface Props {
    open: boolean
    onClose: () => void
    /** Pre-select a source (e.g. from a minutes page's "Committee report" button). */
    preset?: { source: ReportSource; id: number } | null
}

export default function CreateReportModal({ open, onClose, preset }: Props) {
    const router = useRouter()
    const { data: options } = useSWR<ReportOptions>(open ? '/api/reports/options' : null, fetcher)

    const [source, setSource] = useState<ReportSource>('minutes')
    const [form, setForm] = useState({ meeting_minute_id: '', transcription_id: '', title: '', output_language: 'eng', instructions: '' })
    const [errors, setErrors] = useState<FieldErrors>({})
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (!open) return
        setErrors({})
        setBusy(false)
        setSource(preset?.source ?? 'minutes')
        setForm({
            meeting_minute_id: preset?.source === 'minutes' ? String(preset.id) : '',
            transcription_id: preset?.source === 'transcript' ? String(preset.id) : '',
            title: '',
            output_language: 'eng',
            instructions: '',
        })
    }, [open, preset])

    const minutes = options?.minutes ?? []
    const transcripts = options?.transcriptions ?? []
    // No minutes yet → start on transcripts.
    useEffect(() => {
        if (options && !options.minutes.length && !preset) setSource('transcript')
    }, [options, preset])

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

    const submit = async () => {
        if (source === 'minutes' && !form.meeting_minute_id) return setErrors({ meeting_minute_id: ['Choose minutes of meeting.'] })
        if (source === 'transcript' && !form.transcription_id) return setErrors({ transcription_id: ['Choose a transcript.'] })

        setErrors({})
        setBusy(true)
        try {
            const res = await axios.post<{ report: CommitteeReport }>('/api/reports', {
                source,
                ...(source === 'minutes' ? { meeting_minute_id: Number(form.meeting_minute_id) } : { transcription_id: Number(form.transcription_id) }),
                title: form.title || null,
                output_language: form.output_language,
                instructions: form.instructions.trim() || null,
            })
            router.push(`/reports/${res.data.report.id}`)
            onClose()
        } catch (err: any) {
            setBusy(false)
            if (err.response?.status === 422 && err.response.data.errors) setErrors(err.response.data.errors)
            else setErrors({ general: [errorMessage(err)] })
        }
    }

    const selectedMinutes = minutes.find(m => String(m.id) === form.meeting_minute_id)
    const selectedTranscript = transcripts.find(t => String(t.id) === form.transcription_id)
    const selected = source === 'minutes' ? selectedMinutes : selectedTranscript
    const stillRunning = selected && selected.status !== 'completed'

    return (
        <Modal
            open={open}
            onClose={busy ? () => undefined : onClose}
            title="Create committee report"
            size="lg"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={busy}>
                        Cancel
                    </Button>
                    <Button variant="ai" loading={busy} onClick={submit} icon={<Sparkles className="h-4 w-4" />}>
                        {busy ? 'Starting…' : 'Create report'}
                    </Button>
                </>
            }>
            <div className="space-y-5">
                {errors.general && <Alert tone="error">{errors.general[0]}</Alert>}
                {options?.driver === 'fake' && <Alert tone="warning">Demo mode: no AI key is configured, so you&apos;ll get a sample report instead of a real one.</Alert>}

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

                {source === 'minutes' ? (
                    <div>
                        <label htmlFor="r-m" className="mb-1.5 block text-sm font-medium text-body">
                            Minutes of meeting
                        </label>
                        <select id="r-m" value={form.meeting_minute_id} onChange={set('meeting_minute_id')} className={`${selectCls} ${errors.meeting_minute_id ? 'border-danger' : ''}`}>
                            <option value="">{minutes.length ? 'Choose minutes…' : 'No minutes yet'}</option>
                            {minutes.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.title} · {formatDate(m.created_at)} · {OUTPUT_LANGUAGE_LABELS[m.output_language] ?? m.output_language}
                                    {m.status !== 'completed' ? ' (still writing)' : ''}
                                </option>
                            ))}
                        </select>
                        {errors.meeting_minute_id && <p className="mt-1.5 text-xs text-danger">{errors.meeting_minute_id[0]}</p>}
                        <p className="mt-1.5 text-xs text-muted">Edits you made to the minutes are used.</p>
                    </div>
                ) : (
                    <div>
                        <label htmlFor="r-t" className="mb-1.5 block text-sm font-medium text-body">
                            Transcript
                        </label>
                        <select id="r-t" value={form.transcription_id} onChange={set('transcription_id')} className={`${selectCls} ${errors.transcription_id ? 'border-danger' : ''}`}>
                            <option value="">{transcripts.length ? 'Choose a meeting…' : 'No transcripts yet'}</option>
                            {transcripts.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.title} · {formatDate(t.created_at)}
                                    {t.status !== 'completed' ? ' (still transcribing)' : ` · ${formatTimestamp(t.duration_secs)}`}
                                </option>
                            ))}
                        </select>
                        {errors.transcription_id && <p className="mt-1.5 text-xs text-danger">{errors.transcription_id[0]}</p>}
                    </div>
                )}
                {stillRunning && <p className="-mt-3 text-xs text-muted">This is still being prepared — the report will start as soon as it&apos;s done.</p>}

                <Input id="r-title" label="Title" value={form.title} onChange={set('title')} error={errors.title} placeholder={selected?.title ?? 'e.g. Report on the road repair budget'} />

                <div>
                    <div className="mb-1.5 text-sm font-medium text-body">Write the report in</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {(options?.output_languages ?? OUTPUT_CHOICES).map(l => (
                            <label
                                key={l.code}
                                className={`cursor-pointer rounded-xl border px-4 py-3 transition ${form.output_language === l.code ? 'border-ai bg-ai-soft/60' : 'border-line hover:bg-canvas'}`}>
                                <span className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="report_language"
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
                </div>

                <div>
                    <label htmlFor="r-ins" className="mb-1.5 block text-sm font-medium text-body">
                        Committee details <span className="font-normal text-muted">(optional)</span>
                    </label>
                    <textarea
                        id="r-ins"
                        rows={3}
                        value={form.instructions}
                        onChange={set('instructions')}
                        placeholder="e.g. Committee on Disaster Risk Reduction and Management. Report No. 078-2026. Sponsor and Chairperson: Hon. Albert T. Abayon. Referred during the 66th Regular Session, 06/10/2026."
                        className={textareaCls}
                    />
                    <p className="mt-1 text-xs text-muted">Committee name, report number, who it&apos;s addressed to and the members. The meeting stays the source of truth.</p>
                    {errors.instructions && <p className="mt-1.5 text-xs text-danger">{errors.instructions[0]}</p>}
                </div>
            </div>
        </Modal>
    )
}
