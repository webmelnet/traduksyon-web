'use client'

import useSWR from 'swr'
import { ChevronRight, FileAudio, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import UploadModal from '@/components/transcribe/UploadModal'
import { formatTimestamp, languageLabel, MODE_LABELS, STATUS_META } from '@/components/transcribe/helpers'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import axios from '@/lib/axios'
import type { Paginated, Transcription } from '@/types'
import { formatDateTime } from '@/utils/format'

const fetcher = (url: string) => axios.get(url).then(r => r.data)

export default function MeetingsPage() {
    const [uploadOpen, setUploadOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [debounced, setDebounced] = useState('')
    const [page, setPage] = useState(1)

    // Home's "Upload a recording" links here with ?upload=1
    useEffect(() => {
        if (new URLSearchParams(window.location.search).has('upload')) {
            setUploadOpen(true)
            window.history.replaceState(null, '', '/meetings')
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
    const { data, isLoading } = useSWR<Paginated<Transcription>>(`/api/transcriptions?${qs}`, fetcher, {
        keepPreviousData: true,
        // Keep refreshing while anything is still being transcribed.
        refreshInterval: d => (d?.data.some(t => t.status === 'queued' || t.status === 'processing') ? 4000 : 0),
    })

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">My meetings</h1>
                    <p className="mt-1 text-muted">Recordings you&apos;ve transcribed, with who said what.</p>
                </div>
                <Button icon={<Plus className="h-4 w-4" />} onClick={() => setUploadOpen(true)} className="w-full sm:w-auto">
                    New transcription
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
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-mint text-primary-deep">
                            <FileAudio className="h-7 w-7" />
                        </span>
                        <h2 className="mt-4 text-lg font-semibold">{debounced ? 'No matches' : 'No recordings yet'}</h2>
                        <p className="mt-1 max-w-sm text-sm text-muted">
                            {debounced ? 'Try a different title.' : 'Upload a meeting recording in English, Tagalog, Bicol or Masbateño and get a transcript with speaker labels.'}
                        </p>
                        {!debounced && (
                            <Button className="mt-5" icon={<Plus className="h-4 w-4" />} onClick={() => setUploadOpen(true)}>
                                Upload a recording
                            </Button>
                        )}
                    </div>
                ) : (
                    <ul className="divide-y divide-line">
                        {data.data.map(t => {
                            const status = STATUS_META[t.status]
                            return (
                                <li key={t.id}>
                                    <Link href={`/meetings/${t.id}`} className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-canvas sm:px-5">
                                        <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-mint text-primary-deep sm:flex">
                                            {t.status === 'processing' || t.status === 'queued' ? <Spinner className="h-5 w-5" /> : <FileAudio className="h-5 w-5" />}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-semibold text-dark">{t.title}</span>
                                            <span className="mt-0.5 block truncate text-xs text-muted">
                                                {formatDateTime(t.created_at)} · {formatTimestamp(t.duration_secs)} · {languageLabel(t.language)} · {MODE_LABELS[t.mode]}
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

            <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
        </div>
    )
}
