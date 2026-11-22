'use client'

import useSWR from 'swr'
import { ArrowLeft, ClipboardList, Copy, FileText, Pencil, RotateCcw, Sparkles, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { OUTPUT_LANGUAGE_LABELS } from '@/components/minutes/helpers'
import ReportEditor from '@/components/reports/ReportEditor'
import { exportReport } from '@/components/reports/exportReport'
import { emptyReport, findingTopic, isReportBusy, paragraphs, REPORT_STATUS, reportLabels, reportNoLine, reportToText } from '@/components/reports/helpers'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import DownloadMenu, { type DownloadFormat } from '@/components/ui/DownloadMenu'
import Modal from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/contexts/ToastContext'
import axios from '@/lib/axios'
import type { CommitteeReport, ReportContent } from '@/types'
import { errorMessage, formatDateTime } from '@/utils/format'

const fetcher = (url: string) => axios.get(url).then(r => r.data.report)

export default function ReportDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const { toast } = useToast()
    const [editing, setEditing] = useState(false)
    const [regenOpen, setRegenOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [busy, setBusy] = useState(false)

    const { data: r, error, mutate } = useSWR<CommitteeReport>(`/api/reports/${id}`, fetcher, {
        refreshInterval: d => (isReportBusy(d) ? 3000 : 0),
    })

    if (error) {
        return (
            <div className="space-y-5">
                <BackLink />
                <Alert tone="error">{error.response?.status === 404 ? 'This report no longer exists.' : errorMessage(error)}</Alert>
            </div>
        )
    }
    if (!r) {
        return (
            <div className="flex justify-center py-20">
                <Spinner className="h-7 w-7" />
            </div>
        )
    }

    const status = REPORT_STATUS[r.status]
    const content: ReportContent = { ...emptyReport(r.title), ...(r.content ?? {}) }
    const sourceGone = r.source === 'minutes' ? !r.minutes : !r.transcription

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(reportToText(content, r.output_language))
            toast('Report copied.')
        } catch {
            toast('Could not copy — your browser blocked clipboard access.', 'error')
        }
    }

    const download = async (format: DownloadFormat) => {
        try {
            await exportReport(format, content, r.output_language)
        } catch (err) {
            toast(errorMessage(err, 'Could not create the file.'), 'error')
        }
    }

    const save = async (next: ReportContent) => {
        const res = await axios.put<{ report: CommitteeReport }>(`/api/reports/${r.id}`, { content: next, title: next.title.slice(0, 150) || r.title })
        await mutate(res.data.report, { revalidate: false })
        setEditing(false)
        toast('Report saved.')
    }

    const regenerate = async (body: { output_language?: string; instructions?: string | null } = {}) => {
        setBusy(true)
        try {
            const res = await axios.post<{ report: CommitteeReport }>(`/api/reports/${r.id}/regenerate`, body)
            await mutate(res.data.report, { revalidate: false })
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
            await axios.delete(`/api/reports/${r.id}`)
            toast('Report deleted.')
            router.replace('/reports')
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
                    <h1 className="break-words text-2xl font-bold">{r.status === 'completed' ? content.title : r.title}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <Badge tone={status.tone}>{status.label}</Badge>
                        <span>{OUTPUT_LANGUAGE_LABELS[r.output_language] ?? r.output_language}</span>
                        <span>· {formatDateTime(r.created_at)}</span>
                        {r.minutes && (
                            <Link href={`/minutes/${r.minutes.id}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                                · <ClipboardList className="h-3.5 w-3.5" /> Minutes
                            </Link>
                        )}
                        {r.transcription && (
                            <Link href={`/meetings/${r.transcription.id}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                                · <FileText className="h-3.5 w-3.5" /> Transcript
                            </Link>
                        )}
                    </div>
                </div>
                {!editing && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                        {r.status === 'completed' && (
                            <>
                                <Button variant="secondary" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>
                                    Edit
                                </Button>
                                <Button variant="secondary" size="sm" icon={<Copy className="h-4 w-4" />} onClick={copy}>
                                    Copy
                                </Button>
                                <DownloadMenu onPick={download} />
                                {!sourceGone && (
                                    <Button variant="secondary" size="sm" icon={<RotateCcw className="h-4 w-4" />} onClick={() => setRegenOpen(true)}>
                                        Regenerate
                                    </Button>
                                )}
                            </>
                        )}
                        <Button variant="secondary" size="sm" icon={<Trash2 className="h-4 w-4 text-danger" />} onClick={() => setDeleteOpen(true)} disabled={r.status === 'processing'} aria-label="Delete" />
                    </div>
                )}
            </div>

            {isReportBusy(r) && (
                <Card className="flex flex-col items-center px-6 py-14 text-center">
                    <Spinner className="h-8 w-8" />
                    <h2 className="mt-4 text-lg font-semibold">
                        {r.status === 'waiting'
                            ? r.source === 'minutes'
                                ? 'Waiting for the minutes to finish…'
                                : 'Waiting for the transcript to finish…'
                            : r.status === 'queued'
                              ? 'Waiting in line…'
                              : 'Writing the committee report…'}
                    </h2>
                    <p className="mt-1 max-w-sm text-sm text-muted">
                        {r.status === 'waiting'
                            ? 'The report starts automatically once its source is ready. You can leave this page.'
                            : 'The AI is summarizing the issues and the action taken. This usually takes under a minute.'}
                    </p>
                </Card>
            )}

            {r.status === 'failed' && (
                <Alert tone="error">
                    <div className="font-semibold">Could not create the report</div>
                    <div className="mt-0.5 break-words">{r.error || 'Something went wrong.'}</div>
                    {!sourceGone && (
                        <Button size="sm" variant="secondary" className="mt-3" loading={busy} icon={<RotateCcw className="h-4 w-4" />} onClick={() => regenerate()}>
                            Try again
                        </Button>
                    )}
                </Alert>
            )}

            {r.status === 'completed' && (editing ? <ReportEditor initial={content} onSave={save} onCancel={() => setEditing(false)} /> : <ReportView c={content} lang={r.output_language} />)}

            <RegenerateModal open={regenOpen} onClose={() => setRegenOpen(false)} report={r} busy={busy} onConfirm={regenerate} />

            <Modal
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                title="Delete this report?"
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
                <p className="text-sm text-body">The report will be removed. The minutes and transcript it came from are kept.</p>
            </Modal>
        </div>
    )
}

function Heading({ children }: { children: React.ReactNode }) {
    return <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-dark">{children}</h2>
}

function Paras({ text, className = '' }: { text: string; className?: string }) {
    const ps = paragraphs(text)
    if (!ps.length) return <p className="text-muted">—</p>
    return (
        <div className={`space-y-3 text-justify leading-relaxed text-body ${className}`}>
            {ps.map((p, i) => (
                <p key={i}>{p}</p>
            ))}
        </div>
    )
}

function Signatures({ c }: { c: ReportContent }) {
    if (!c.signatories.length) return null
    return (
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {c.signatories.map((p, i) => (
                <div key={i} className="pt-8 sm:col-start-2">
                    <div className="border-t border-ink" />
                    <div className="mt-1.5 text-center text-sm font-bold uppercase text-dark">{p.name}</div>
                    {p.role && <div className="text-center text-xs italic text-muted">{p.role}</div>}
                </div>
            ))}
        </div>
    )
}

/** Laid out like the printed "Details of the Committee Report". */
function ReportView({ c, lang }: { c: ReportContent; lang: string }) {
    const L = reportLabels(lang)
    return (
        <div className="space-y-4">
            {/* Details page */}
            <Card className="mx-auto max-w-3xl space-y-7 p-5 sm:p-10">
                <div className="text-center">
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary-deep">{L.document}</div>
                    <h2 className="mt-2 text-lg font-bold text-dark sm:text-xl">{reportNoLine(c, L)}</h2>
                </div>
                <div className="text-sm">
                    <span className="font-bold text-dark">{L.to}</span> <span className="font-semibold uppercase text-dark">{c.addressed_to || L.addressedTo}</span>
                </div>
                {c.referral && <Paras text={c.referral} />}

                {c.background && (
                    <section>
                        <Heading>I. {L.background}</Heading>
                        <Paras text={c.background} />
                    </section>
                )}

                <section>
                    <Heading>II. {L.findings}</Heading>
                    <p className="mb-3 text-body">{L.findingsLead}</p>
                    {c.findings.length ? (
                        <ol className="list-decimal space-y-2.5 pl-5 text-justify leading-relaxed text-body marker:font-semibold marker:text-dark">
                            {c.findings.map((f, i) => (
                                <li key={i} className="pl-1">
                                    {f.topic && <span className="font-semibold text-dark">{findingTopic(f)} </span>}
                                    {f.text}
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="text-sm text-muted">{L.none}</p>
                    )}
                </section>

                <section>
                    <Heading>III. {L.recommendations}</Heading>
                    <p className="mb-3 text-body">{L.recommendationsLead}</p>
                    {c.recommendations.length ? (
                        <ol className="list-decimal space-y-1.5 pl-5 text-justify text-body marker:font-semibold marker:text-dark">
                            {c.recommendations.map((rec, i) => (
                                <li key={i} className="pl-1">
                                    {rec}
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="text-sm text-muted">{L.none}</p>
                    )}
                </section>

                {c.committee_action && (
                    <section>
                        <Heading>IV. {L.action}</Heading>
                        <Paras text={c.committee_action} />
                    </section>
                )}

                {c.recommendation && (
                    <section>
                        <Heading>{L.recommendation}</Heading>
                        <Paras text={c.recommendation} />
                    </section>
                )}

                <section className="pt-2">
                    {c.committee && <div className="text-sm font-semibold text-dark">{c.committee}</div>}
                    <Signatures c={c} />
                </section>

                {c.notes && (
                    <p className="border-t border-line pt-4 text-xs italic text-muted">
                        {L.notes}: {c.notes}
                    </p>
                )}
            </Card>
            <p className="mx-auto max-w-3xl px-1 text-xs text-muted">Written by AI — please review names, figures and recommendations before submitting.</p>
        </div>
    )
}

function RegenerateModal({
    open,
    onClose,
    report,
    busy,
    onConfirm,
}: {
    open: boolean
    onClose: () => void
    report: CommitteeReport
    busy: boolean
    onConfirm: (body: { output_language: string; instructions: string | null }) => void
}) {
    const [lang, setLang] = useState(report.output_language)
    const [instructions, setInstructions] = useState(report.instructions ?? '')

    useEffect(() => {
        if (!open) return
        setLang(report.output_language)
        setInstructions(report.instructions ?? '')
    }, [open, report.output_language, report.instructions])

    return (
        <Modal
            open={open}
            onClose={busy ? () => undefined : onClose}
            title="Regenerate report"
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
                <Alert tone="warning">This replaces the current report, including any edits you made.</Alert>
                <div>
                    <label htmlFor="rr-lang" className="mb-1.5 block text-sm font-medium text-body">
                        Write report in
                    </label>
                    <select id="rr-lang" value={lang} onChange={e => setLang(e.target.value)} className="h-12 w-full rounded-xl border-line text-[15px] text-ink focus:border-primary focus:ring-4 focus:ring-primary/15">
                        {Object.entries(OUTPUT_LANGUAGE_LABELS).map(([code, label]) => (
                            <option key={code} value={code}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="rr-ins" className="mb-1.5 block text-sm font-medium text-body">
                        Committee details <span className="font-normal text-muted">(optional)</span>
                    </label>
                    <textarea
                        id="rr-ins"
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
        <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-body">
            <ArrowLeft className="h-4 w-4" /> Committee reports
        </Link>
    )
}
