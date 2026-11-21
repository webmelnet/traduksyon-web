'use client'

import useSWR from 'swr'
import { ArrowLeft, ClipboardList, Copy, FileText, Pencil, RotateCcw, Sparkles, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { OUTPUT_LANGUAGE_LABELS } from '@/components/minutes/helpers'
import ReportEditor from '@/components/reports/ReportEditor'
import { exportReport } from '@/components/reports/exportReport'
import { emptyReport, headerRows, isReportBusy, personLine, REPORT_STATUS, reportLabels, reportToText } from '@/components/reports/helpers'
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
                            : 'The AI is turning the meeting into findings and recommendations. This usually takes under a minute.'}
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

function Paras({ text }: { text: string }) {
    if (!text) return <p className="text-muted">—</p>
    return (
        <div className="space-y-3 text-justify leading-relaxed text-body">
            {text.split(/\n+/).map((p, i) => (
                <p key={i}>{p}</p>
            ))}
        </div>
    )
}

/** Laid out like the printed report: centered title, header block, numbered sections, signatures. */
function ReportView({ c, lang }: { c: ReportContent; lang: string }) {
    const L = reportLabels(lang)
    const rows = headerRows(c, L)
    return (
        <div className="space-y-3">
            <Card className="mx-auto max-w-3xl space-y-7 p-5 sm:p-10">
                <div className="text-center">
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary-deep">{L.document}</div>
                    <h2 className="mt-2 text-xl font-bold text-dark sm:text-2xl">{c.title}</h2>
                </div>

                {rows.length > 0 && (
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-b border-line pb-5 text-sm">
                        {rows.map(([k, v]) => (
                            <React.Fragment key={k}>
                                <dt className="font-semibold text-dark">{k}:</dt>
                                <dd className="text-body">{v}</dd>
                            </React.Fragment>
                        ))}
                    </dl>
                )}

                <section>
                    <Heading>I. {L.introduction}</Heading>
                    <Paras text={c.introduction} />
                </section>

                <section>
                    <Heading>II. {L.proceedings}</Heading>
                    <Paras text={c.proceedings} />
                    {(c.members_present.length > 0 || c.others_present.length > 0) && (
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            {[
                                [L.membersPresent, c.members_present],
                                [L.othersPresent, c.others_present],
                            ].map(([h, list]) =>
                                (list as ReportContent['members_present']).length ? (
                                    <div key={h as string} className="rounded-xl bg-canvas px-4 py-3">
                                        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{h as string}</div>
                                        <ul className="space-y-1 text-sm text-body">
                                            {(list as ReportContent['members_present']).map((p, i) => (
                                                <li key={i}>{personLine(p)}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null,
                            )}
                        </div>
                    )}
                </section>

                <section>
                    <Heading>III. {L.findings}</Heading>
                    {c.findings.length ? (
                        <ol className="space-y-4">
                            {c.findings.map((f, i) => (
                                <li key={i}>
                                    <div className="font-semibold text-dark">
                                        {i + 1}. {f.topic}
                                    </div>
                                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-body marker:text-muted">
                                        {f.points.map((p, j) => (
                                            <li key={j}>{p}</li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="text-sm text-muted">{L.none}</p>
                    )}
                </section>

                <section>
                    <Heading>IV. {L.recommendations}</Heading>
                    {c.recommendations.length ? (
                        <ol className="list-decimal space-y-1.5 pl-5 text-body marker:font-semibold marker:text-dark">
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

                <section>
                    <Heading>V. {L.conclusion}</Heading>
                    <Paras text={c.conclusion} />
                </section>

                {c.members_present.length > 0 && (
                    <section className="pt-2">
                        <div className="font-semibold text-dark">{L.submitted}</div>
                        <div className="mt-2 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                            {c.members_present.map((p, i) => (
                                <div key={i} className="pt-8">
                                    <div className="border-t border-ink" />
                                    <div className="mt-1.5 text-sm font-bold uppercase text-dark">{p.name}</div>
                                    {p.role && <div className="text-xs italic text-muted">{p.role}</div>}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {c.notes && <p className="border-t border-line pt-4 text-xs italic text-muted">{L.notes}: {c.notes}</p>}
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
