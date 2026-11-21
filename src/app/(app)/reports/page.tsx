'use client'

import useSWR from 'swr'
import { ChevronRight, Plus, ScrollText, Search } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { OUTPUT_LANGUAGE_LABELS } from '@/components/minutes/helpers'
import CreateReportModal from '@/components/reports/CreateReportModal'
import { isReportBusy, REPORT_STATUS, SOURCE_LABELS } from '@/components/reports/helpers'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import axios from '@/lib/axios'
import type { CommitteeReport, Paginated, ReportSource } from '@/types'
import { formatDateTime } from '@/utils/format'

const fetcher = (url: string) => axios.get(url).then(r => r.data)

export default function ReportsPage() {
    const [createOpen, setCreateOpen] = useState(false)
    const [preset, setPreset] = useState<{ source: ReportSource; id: number } | null>(null)
    const [search, setSearch] = useState('')
    const [debounced, setDebounced] = useState('')
    const [page, setPage] = useState(1)

    // Minutes / meeting pages link here with ?minutes=ID or ?transcription=ID; ?new=1 just opens the dialog.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const m = Number(params.get('minutes'))
        const t = Number(params.get('transcription'))
        if (m || t || params.has('new')) {
            setPreset(m ? { source: 'minutes', id: m } : t ? { source: 'transcript', id: t } : null)
            setCreateOpen(true)
            window.history.replaceState(null, '', '/reports')
        }
    }, [])

    useEffect(() => {
        const t = setTimeout(() => {
            setDebounced(search)
            setPage(1)
        }, 300)
        return () => clearTimeout(t)
    }, [search])

    const qs = new URLSearchParams({ search: debounced, page: String(page) }).toString()
    const { data, isLoading } = useSWR<Paginated<CommitteeReport>>(`/api/reports?${qs}`, fetcher, {
        keepPreviousData: true,
        refreshInterval: d => (d?.data.some(isReportBusy) ? 4000 : 0),
    })

    const openCreate = () => {
        setPreset(null)
        setCreateOpen(true)
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Committee reports</h1>
                    <p className="mt-1 text-muted">A formal report with findings and recommendations, written from your minutes or a transcript.</p>
                </div>
                <Button variant="ai" icon={<Plus className="h-4 w-4" />} onClick={openCreate} className="w-full sm:w-auto">
                    Create report
                </Button>
            </div>

            <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by title"
                    className="h-11 w-full rounded-xl border-line pl-10 text-sm focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
            </div>

            <Card className="overflow-hidden">
                {isLoading && !data ? (
                    <div className="flex justify-center py-16">
                        <Spinner className="h-6 w-6" />
                    </div>
                ) : !data?.data.length ? (
                    <div className="flex flex-col items-center px-6 py-14 text-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ai-soft text-ai">
                            <ScrollText className="h-7 w-7" />
                        </span>
                        <h2 className="mt-4 text-lg font-semibold">{debounced ? 'No matches' : 'No reports yet'}</h2>
                        <p className="mt-1 max-w-sm text-sm text-muted">
                            {debounced ? 'Try a different title.' : 'Pick minutes of meeting or a transcript, and get a committee report with proceedings, findings, recommendations and a signature block.'}
                        </p>
                        {!debounced && (
                            <Button variant="ai" className="mt-5" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                                Create report
                            </Button>
                        )}
                    </div>
                ) : (
                    <ul className="divide-y divide-line">
                        {data.data.map(r => {
                            const status = REPORT_STATUS[r.status]
                            const from = r.source === 'minutes' ? r.minutes?.title : r.transcription?.title
                            return (
                                <li key={r.id}>
                                    <Link href={`/reports/${r.id}`} className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-canvas sm:px-5">
                                        <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ai-soft text-ai sm:flex">
                                            {isReportBusy(r) ? <Spinner className="h-5 w-5" /> : <ScrollText className="h-5 w-5" />}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-semibold text-dark">{r.title}</span>
                                            <span className="mt-0.5 block truncate text-xs text-muted">
                                                {formatDateTime(r.created_at)} · {OUTPUT_LANGUAGE_LABELS[r.output_language] ?? r.output_language} · {SOURCE_LABELS[r.source]}
                                                {from && from !== r.title ? ` “${from}”` : ''}
                                            </span>
                                        </span>
                                        <Badge tone={status.tone}>{status.label}</Badge>
                                        <ChevronRight className="hidden h-5 w-5 text-muted sm:block" />
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </Card>

            {data && data.last_page > 1 && (
                <div className="flex items-center justify-between text-sm text-muted">
                    <span>
                        Page {data.current_page} of {data.last_page}
                    </span>
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                            Previous
                        </Button>
                        <Button size="sm" variant="secondary" disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)}>
                            Next
                        </Button>
                    </div>
                </div>
            )}

            <CreateReportModal open={createOpen} onClose={() => setCreateOpen(false)} preset={preset} />
        </div>
    )
}
