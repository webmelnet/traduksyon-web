'use client'

import useSWR, { mutate as revalidateKey } from 'swr'
import CreditCostNote from '@/components/CreditCostNote'
import { useAuth } from '@/hooks/auth'
import { ArrowLeft, CalendarClock, CheckCircle2, ClipboardList, Copy, FileText, Gavel, ListChecks, Pencil, RotateCcw, ScrollText, Sparkles, Trash2, Users } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import MinutesEditor from '@/components/minutes/MinutesEditor'
import { exportMinutes } from '@/components/minutes/exportMinutes'
import { emptyMinutes, isMinutesBusy, MINUTES_STATUS, minutesLabels, minutesToText, OUTPUT_LANGUAGE_LABELS } from '@/components/minutes/helpers'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import DownloadMenu, { type DownloadFormat } from '@/components/ui/DownloadMenu'
import Modal from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/contexts/ToastContext'
import axios from '@/lib/axios'
import type { MeetingMinutes, MinutesContent } from '@/types'
import { errorMessage, formatDateTime } from '@/utils/format'

const fetcher = (url: string) => axios.get(url).then(r => r.data.minutes)

export default function MinutesDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const { toast } = useToast()
    const [editing, setEditing] = useState(false)
    const [regenOpen, setRegenOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [busy, setBusy] = useState(false)

    const { data: m, error, mutate } = useSWR<MeetingMinutes>(`/api/minutes/${id}`, fetcher, {
        refreshInterval: d => (isMinutesBusy(d) ? 3000 : 0),
    })

    if (error) {
        return (
            <div className="space-y-5">
                <BackLink />
                <Alert tone="error">{error.response?.status === 404 ? 'These minutes no longer exist.' : errorMessage(error)}</Alert>
            </div>
        )
    }
    if (!m) {
        return (
            <div className="flex justify-center py-20">
                <Spinner className="h-7 w-7" />
            </div>
        )
    }

    const status = MINUTES_STATUS[m.status]
    const content: MinutesContent = { ...emptyMinutes(m.title), ...(m.content ?? {}) }

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(minutesToText(content, m.output_language))
            toast('Minutes copied.')
        } catch {
            toast('Could not copy — your browser blocked clipboard access.', 'error')
        }
    }

    const download = async (format: DownloadFormat) => {
        try {
            await exportMinutes(format, content, m.output_language)
        } catch (err) {
            toast(errorMessage(err, 'Could not create the file.'), 'error')
        }
    }

    const save = async (next: MinutesContent) => {
        const res = await axios.put<{ minutes: MeetingMinutes }>(`/api/minutes/${m.id}`, { content: next, title: next.title.slice(0, 150) || m.title })
        await mutate(res.data.minutes, { revalidate: false })
        setEditing(false)
        toast('Minutes saved.')
    }

    const regenerate = async (body: { output_language?: string; instructions?: string | null } = {}) => {
        setBusy(true)
        try {
            const res = await axios.post<{ minutes: MeetingMinutes }>(`/api/minutes/${m.id}/regenerate`, body)
            await mutate(res.data.minutes, { revalidate: false })
            revalidateKey('/api/user') // credits were charged
            setRegenOpen(false)
            setEditing(false)
        } catch (err) {
            toast(errorMessage(err), 'error')
        } finally {
            setBusy(false)
        }
    }

    const remove = async () => {
        setBusy(true)
        try {
            await axios.delete(`/api/minutes/${m.id}`)
            toast('Minutes deleted.')
            router.replace('/minutes')
        } catch (err) {
            toast(errorMessage(err), 'error')
            setBusy(false)
        }
    }

    return (
        <div className="space-y-5">
            <BackLink />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="break-words text-2xl font-bold">{m.status === 'completed' ? content.title : m.title}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <Badge tone={status.tone}>{status.label}</Badge>
                        <span>{OUTPUT_LANGUAGE_LABELS[m.output_language] ?? m.output_language}</span>
                        <span>· {formatDateTime(m.created_at)}</span>
                        {m.transcription && (
                            <Link href={`/meetings/${m.transcription.id}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                                · <FileText className="h-3.5 w-3.5" /> Transcript
                            </Link>
                        )}
                    </div>
                </div>
                {!editing && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                        {m.status === 'completed' && (
                            <>
                                <Button variant="secondary" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>
                                    Edit
                                </Button>
                                <Button variant="secondary" size="sm" icon={<Copy className="h-4 w-4" />} onClick={copy}>
                                    Copy
                                </Button>
                                <DownloadMenu onPick={download} />
                                <Button variant="ai" size="sm" icon={<ScrollText className="h-4 w-4" />} onClick={() => router.push(`/reports?minutes=${m.id}`)}>
                                    Committee report
                                </Button>
                                <Button variant="secondary" size="sm" icon={<RotateCcw className="h-4 w-4" />} onClick={() => setRegenOpen(true)}>
                                    Regenerate
                                </Button>
                            </>
                        )}
                        <Button variant="secondary" size="sm" icon={<Trash2 className="h-4 w-4 text-danger" />} onClick={() => setDeleteOpen(true)} disabled={m.status === 'processing'} aria-label="Delete" />
                    </div>
                )}
            </div>

            {isMinutesBusy(m) && (
                <Card className="flex flex-col items-center px-6 py-14 text-center">
                    <Spinner className="h-8 w-8" />
                    <h2 className="mt-4 text-lg font-semibold">
                        {m.status === 'waiting' ? 'Transcribing the recording first…' : m.status === 'queued' ? 'Waiting in line…' : 'Writing the minutes…'}
                    </h2>
                    <p className="mt-1 max-w-sm text-sm text-muted">
                        {m.status === 'waiting'
                            ? 'Once the transcript is ready, the AI writes the minutes automatically. Long recordings can take a few minutes — you can leave this page.'
                            : 'The AI is reading the transcript and pulling out the discussion, decisions and action items. This usually takes under a minute.'}
                    </p>
                </Card>
            )}

            {m.status === 'failed' && (
                <Alert tone="error">
                    <div className="font-semibold">Could not create the minutes</div>
                    <div className="mt-0.5 break-words">{m.error || 'Something went wrong.'}</div>
                    <Button size="sm" variant="secondary" className="mt-3" loading={busy} icon={<RotateCcw className="h-4 w-4" />} onClick={() => regenerate()}>
                        Try again
                    </Button>
                </Alert>
            )}

            {m.status === 'completed' && (editing ? <MinutesEditor initial={content} onSave={save} onCancel={() => setEditing(false)} /> : <MinutesView c={content} lang={m.output_language} />)}

            <RegenerateModal open={regenOpen} onClose={() => setRegenOpen(false)} minutes={m} busy={busy} onConfirm={regenerate} />

            <Modal
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                title="Delete these minutes?"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={busy}>
                            Cancel
                        </Button>
                        <Button variant="danger" loading={busy} onClick={remove}>
                            Delete
                        </Button>
                    </>
                }>
                <p className="text-sm text-body">The minutes will be removed. The recording and its transcript stay in My meetings.</p>
            </Modal>
        </div>
    )
}

function Section({ title, Icon, children }: { title: string; Icon: any; children: React.ReactNode }) {
    return (
        <section>
            <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary-deep">
                <Icon className="h-4 w-4" /> {title}
            </h2>
            {children}
        </section>
    )
}

function MinutesView({ c, lang }: { c: MinutesContent; lang: string }) {
    const L = minutesLabels(lang)
    const empty = <p className="text-sm text-muted">{L.none}</p>
    return (
        <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
            <Card className="space-y-7 p-5 sm:p-7">
                {c.meeting_date && <p className="text-sm text-muted">{L.meetingDate}: {c.meeting_date}</p>}

                <Section title={L.summary} Icon={Sparkles}>
                    <p className="whitespace-pre-line leading-relaxed text-body">{c.summary || '—'}</p>
                </Section>

                <Section title={L.discussion} Icon={ClipboardList}>
                    {c.agenda.length ? (
                        <ol className="space-y-4">
                            {c.agenda.map((a, i) => (
                                <li key={i}>
                                    <div className="font-semibold text-dark">
                                        {i + 1}. {a.topic}
                                    </div>
                                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-body marker:text-muted">
                                        {a.discussion.map((d, j) => (
                                            <li key={j}>{d}</li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        empty
                    )}
                </Section>

                <Section title={L.decisions} Icon={Gavel}>
                    {c.decisions.length ? (
                        <ul className="space-y-2">
                            {c.decisions.map((d, i) => (
                                <li key={i} className="flex gap-2 text-body">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {d}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        empty
                    )}
                </Section>

                <Section title={L.actionItems} Icon={ListChecks}>
                    {c.action_items.length ? (
                        <>
                            {/* Cards on phones, table from md */}
                            <ul className="space-y-2 md:hidden">
                                {c.action_items.map((a, i) => (
                                    <li key={i} className="rounded-xl border border-line px-3.5 py-3">
                                        <div className="font-medium text-dark">{a.task}</div>
                                        <div className="mt-1 text-xs text-muted">
                                            {a.owner || L.noOwner} · {a.due || L.noDue}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <table className="hidden w-full text-sm md:table">
                                <thead>
                                    <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                                        <th className="py-2 pr-3 font-semibold">{L.task}</th>
                                        <th className="py-2 pr-3 font-semibold">{L.owner}</th>
                                        <th className="py-2 font-semibold">{L.due}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                    {c.action_items.map((a, i) => (
                                        <tr key={i} className="align-top">
                                            <td className="py-2.5 pr-3 text-dark">{a.task}</td>
                                            <td className="py-2.5 pr-3 text-body">{a.owner || '—'}</td>
                                            <td className="py-2.5 text-body">{a.due || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    ) : (
                        empty
                    )}
                </Section>

                {c.notes && <p className="border-t border-line pt-4 text-xs italic text-muted">{L.notes}: {c.notes}</p>}
            </Card>

            <div className="space-y-5">
                <Card className="p-5">
                    <Section title={L.attendees} Icon={Users}>
                        {c.attendees.length ? (
                            <ul className="space-y-1.5 text-sm">
                                {c.attendees.map((a, i) => (
                                    <li key={i}>
                                        <span className="font-medium text-dark">{a.name}</span>
                                        {a.role && <span className="text-muted"> · {a.role}</span>}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            empty
                        )}
                    </Section>
                </Card>
                {c.next_meeting && (
                    <Card className="p-5">
                        <Section title={L.nextMeeting} Icon={CalendarClock}>
                            <p className="text-sm text-body">{c.next_meeting}</p>
                        </Section>
                    </Card>
                )}
                <p className="px-1 text-xs text-muted">Written by AI from the transcript — please review names, figures and dates before sharing.</p>
            </div>
        </div>
    )
}

function RegenerateModal({
    open,
    onClose,
    minutes,
    busy,
    onConfirm,
}: {
    open: boolean
    onClose: () => void
    minutes: MeetingMinutes
    busy: boolean
    onConfirm: (body: { output_language: string; instructions: string | null }) => void
}) {
    const [lang, setLang] = useState(minutes.output_language)
    const [instructions, setInstructions] = useState(minutes.instructions ?? '')

    useEffect(() => {
        if (!open) return
        setLang(minutes.output_language)
        setInstructions(minutes.instructions ?? '')
    }, [open, minutes.output_language, minutes.instructions])

    return (
        <Modal
            open={open}
            onClose={busy ? () => undefined : onClose}
            title="Regenerate minutes"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={busy}>
                        Cancel
                    </Button>
                    <Button variant="ai" loading={busy} icon={<Sparkles className="h-4 w-4" />} onClick={() => onConfirm({ output_language: lang, instructions: instructions.trim() || null })}>
                        Regenerate
                    </Button>
                </>
            }>
            <div className="space-y-4">
                <Alert tone="warning">This replaces the current minutes, including any edits you made.</Alert>
                <RegenerateCost kind="minutes" />
                <p className="text-sm text-muted">Tip: rename the speakers on the transcript first, so the minutes use real names.</p>
                <div>
                    <label htmlFor="r-lang" className="mb-1.5 block text-sm font-medium text-body">
                        Write minutes in
                    </label>
                    <select id="r-lang" value={lang} onChange={e => setLang(e.target.value)} className="h-12 w-full rounded-xl border-line text-[15px] text-ink focus:border-primary focus:ring-4 focus:ring-primary/15">
                        {Object.entries(OUTPUT_LANGUAGE_LABELS).map(([code, label]) => (
                            <option key={code} value={code}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="r-ins" className="mb-1.5 block text-sm font-medium text-body">
                        Extra context <span className="font-normal text-muted">(optional)</span>
                    </label>
                    <textarea
                        id="r-ins"
                        rows={3}
                        value={instructions}
                        onChange={e => setInstructions(e.target.value)}
                        className="w-full rounded-xl border-line text-[15px] text-ink focus:border-primary focus:ring-4 focus:ring-primary/15"
                    />
                </div>
            </div>
        </Modal>
    )
}

function BackLink() {
    return (
        <Link href="/minutes" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-body">
            <ArrowLeft className="h-4 w-4" /> Minutes
        </Link>
    )
}

/** Regenerating is a new AI run, so it costs credits again (refunded if it fails). */
function RegenerateCost({ kind }: { kind: 'minutes' | 'report' }) {
    const { user } = useAuth()
    if (!user) return null
    return <CreditCostNote cost={kind === 'minutes' ? user.credits.costs.minutes : user.credits.costs.report} />
}
