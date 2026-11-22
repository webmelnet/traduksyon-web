'use client'

import useSWR from 'swr'
import { Building, Mail, Phone, Search, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { SiteLead } from '@/components/admin/site/types'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/hooks/auth'
import axios from '@/lib/axios'
import type { Paginated } from '@/types'
import { errorMessage, formatDateTime } from '@/utils/format'
import { hasPermission } from '@/utils/permissions'

const fetcher = (url: string) => axios.get(url).then(r => r.data)

const STATUS: Record<SiteLead['status'], { label: string; tone: 'amber' | 'teal' | 'gray' }> = {
    new: { label: 'New', tone: 'amber' },
    contacted: { label: 'Contacted', tone: 'teal' },
    closed: { label: 'Closed', tone: 'gray' },
}

/** Contact / demo requests sent from the marketing site's form. */
export default function InquiriesPage() {
    const { user } = useAuth()
    const router = useRouter()
    const { toast } = useToast()
    const allowed = hasPermission(user, 'website.manage')
    const [status, setStatus] = useState('')
    const [search, setSearch] = useState('')
    const [debounced, setDebounced] = useState('')
    const [page, setPage] = useState(1)
    const [openId, setOpenId] = useState<number | null>(null)
    const [deleting, setDeleting] = useState<SiteLead | null>(null)

    useEffect(() => {
        if (user && !allowed) router.replace('/admin')
    }, [user, allowed, router])

    useEffect(() => {
        const t = setTimeout(() => {
            setDebounced(search)
            setPage(1)
        }, 300)
        return () => clearTimeout(t)
    }, [search])

    const qs = new URLSearchParams({ status, search: debounced, page: String(page) }).toString()
    const { data, isLoading, mutate } = useSWR<Paginated<SiteLead> & { counts: Record<string, number> }>(allowed ? `/api/admin/site/leads?${qs}` : null, fetcher, {
        keepPreviousData: true,
    })

    if (!user || !allowed) return null

    const counts = data?.counts ?? {}
    const total = Object.values(counts).reduce((a, b) => a + Number(b), 0)

    const update = async (lead: SiteLead, patch: Partial<Pick<SiteLead, 'status' | 'notes'>>) => {
        try {
            await axios.put(`/api/admin/site/leads/${lead.id}`, patch)
            mutate()
            if (patch.status) toast(`Marked as ${STATUS[patch.status].label.toLowerCase()}.`)
            else toast('Notes saved.')
        } catch (e) {
            toast(errorMessage(e), 'error')
        }
    }

    const remove = async () => {
        if (!deleting) return
        try {
            await axios.delete(`/api/admin/site/leads/${deleting.id}`)
            toast('Inquiry deleted.')
            setDeleting(null)
            mutate()
        } catch (e) {
            toast(errorMessage(e), 'error')
        }
    }

    const tabs = [{ key: '', label: 'All', n: total }, ...(['new', 'contacted', 'closed'] as const).map(k => ({ key: k, label: STATUS[k].label, n: Number(counts[k] ?? 0) }))]

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold">Inquiries</h1>
                <p className="mt-1 text-muted">Messages from the contact form on the website.</p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-card">
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => { setStatus(t.key); setPage(1) }}
                            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${status === t.key ? 'bg-primary text-white' : 'text-muted hover:text-body'}`}>
                            {t.label} <span className="opacity-70">{t.n}</span>
                        </button>
                    ))}
                </div>
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or organization" className="h-11 w-full rounded-xl border-line pl-10 text-sm focus:border-primary focus:ring-4 focus:ring-primary/15" />
                </div>
            </div>

            {isLoading && !data ? (
                <div className="flex justify-center py-16">
                    <Spinner className="h-6 w-6" />
                </div>
            ) : !data?.data.length ? (
                <Card className="px-5 py-12 text-center text-sm text-muted">No inquiries yet.</Card>
            ) : (
                <ul className="space-y-3">
                    {data.data.map(lead => (
                        <LeadCard key={lead.id} lead={lead} open={openId === lead.id} onToggle={() => setOpenId(openId === lead.id ? null : lead.id)} onUpdate={p => update(lead, p)} onDelete={() => setDeleting(lead)} />
                    ))}
                </ul>
            )}

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

            <Modal
                open={!!deleting}
                onClose={() => setDeleting(null)}
                title="Delete inquiry?"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDeleting(null)}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={remove}>
                            Delete
                        </Button>
                    </>
                }>
                <p className="text-sm text-body">The message from {deleting?.name} will be permanently removed.</p>
            </Modal>
        </div>
    )
}

function LeadCard({ lead, open, onToggle, onUpdate, onDelete }: { lead: SiteLead; open: boolean; onToggle: () => void; onUpdate: (p: Partial<SiteLead>) => void; onDelete: () => void }) {
    const [notes, setNotes] = useState(lead.notes ?? '')
    useEffect(() => setNotes(lead.notes ?? ''), [lead.notes])
    const s = STATUS[lead.status]

    return (
        <li>
            <Card className={`overflow-hidden ${lead.status === 'new' ? 'border-l-4 border-l-warning' : ''}`}>
                <button onClick={onToggle} className="flex w-full items-start gap-3 px-4 py-3.5 text-left sm:px-5">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-dark">{lead.name}</span>
                            <Badge tone={s.tone}>{s.label}</Badge>
                        </div>
                        <div className="mt-0.5 truncate text-sm text-muted">
                            {lead.organization ? `${lead.organization} · ` : ''}
                            {lead.email}
                        </div>
                        {!open && <p className="mt-1.5 line-clamp-1 text-sm text-body">{lead.message}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-muted">{formatDateTime(lead.created_at)}</span>
                </button>
                {open && (
                    <div className="space-y-4 border-t border-line px-4 py-4 sm:px-5">
                        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                            <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                                <Mail className="h-4 w-4" /> {lead.email}
                            </a>
                            {lead.phone && (
                                <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                                    <Phone className="h-4 w-4" /> {lead.phone}
                                </a>
                            )}
                            {lead.organization && (
                                <span className="inline-flex items-center gap-1.5 text-body">
                                    <Building className="h-4 w-4 text-muted" /> {lead.organization}
                                </span>
                            )}
                        </div>
                        <p className="whitespace-pre-line rounded-xl bg-canvas px-4 py-3 text-sm text-body">{lead.message}</p>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-body">Internal notes</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="e.g. Called on 23/11, sending a quote" className="block w-full rounded-xl border-line px-3.5 py-2.5 text-sm focus:border-primary focus:ring-4 focus:ring-primary/15" />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {notes !== (lead.notes ?? '') && (
                                <Button size="sm" variant="secondary" onClick={() => onUpdate({ notes })}>
                                    Save notes
                                </Button>
                            )}
                            {lead.status !== 'contacted' && (
                                <Button size="sm" onClick={() => onUpdate({ status: 'contacted' })}>
                                    Mark contacted
                                </Button>
                            )}
                            {lead.status !== 'closed' && (
                                <Button size="sm" variant="secondary" onClick={() => onUpdate({ status: 'closed' })}>
                                    Close
                                </Button>
                            )}
                            {lead.status !== 'new' && (
                                <Button size="sm" variant="ghost" onClick={() => onUpdate({ status: 'new' })}>
                                    Reopen
                                </Button>
                            )}
                            <Button size="sm" variant="ghost" className="ml-auto text-danger" icon={<Trash2 className="h-4 w-4" />} onClick={onDelete}>
                                Delete
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </li>
    )
}
