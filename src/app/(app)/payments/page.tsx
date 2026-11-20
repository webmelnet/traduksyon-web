'use client'

import useSWR from 'swr'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PaymentStatusBadge from '@/components/PaymentStatusBadge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/auth'
import axios from '@/lib/axios'
import type { Paginated, Payment } from '@/types'
import { formatDateTime, formatMoney, PAYMENT_METHOD_LABELS } from '@/utils/format'
import { hasPermission } from '@/utils/permissions'

const fetcher = (url: string) => axios.get(url).then(r => r.data)

/** Admin view of every payment across all users. */
export default function PaymentsPage() {
    const { user } = useAuth()
    const router = useRouter()
    const allowed = hasPermission(user, 'billing.view_all_payments')
    const [search, setSearch] = useState('')
    const [debounced, setDebounced] = useState('')
    const [status, setStatus] = useState('')
    const [page, setPage] = useState(1)

    useEffect(() => {
        const t = setTimeout(() => {
            setDebounced(search)
            setPage(1)
        }, 300)
        return () => clearTimeout(t)
    }, [search])

    useEffect(() => {
        if (user && !allowed) router.replace('/home')
    }, [user, allowed, router])

    const qs = new URLSearchParams({ search: debounced, status, page: String(page) }).toString()
    const { data, isLoading } = useSWR<Paginated<Payment> & { totals: { paid: number } }>(allowed ? `/api/admin/payments?${qs}` : null, fetcher, { keepPreviousData: true })

    if (!user || !allowed) return null

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold">Payments</h1>
                <p className="mt-1 text-muted">All subscription payments{data ? ` · ${formatMoney(data.totals.paid)} collected` : ''}.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user or reference" className="h-11 w-full rounded-xl border-line pl-10 text-sm focus:border-primary focus:ring-4 focus:ring-primary/15" />
                </div>
                <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="h-11 rounded-xl border-line text-sm focus:border-primary focus:ring-4 focus:ring-primary/15 sm:w-44">
                    <option value="">All statuses</option>
                    {['paid', 'pending', 'failed', 'expired'].map(s => (
                        <option key={s} value={s}>
                            {s[0].toUpperCase() + s.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            <Card className="overflow-hidden">
                {isLoading && !data ? (
                    <div className="flex justify-center py-16">
                        <Spinner className="h-6 w-6" />
                    </div>
                ) : !data?.data.length ? (
                    <div className="px-5 py-12 text-center text-sm text-muted">No payments found.</div>
                ) : (
                    <>
                        <ul className="divide-y divide-line md:hidden">
                            {data.data.map(p => (
                                <li key={p.id} className="px-4 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate font-semibold text-dark">{p.user?.name}</div>
                                            <div className="truncate text-xs text-muted">{p.user?.email}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-semibold">{formatMoney(p.amount, p.currency)}</div>
                                            <PaymentStatusBadge status={p.status} />
                                        </div>
                                    </div>
                                    <div className="mt-1 text-xs text-muted">
                                        {formatDateTime(p.paid_at ?? p.created_at)} · {p.plan?.name} · {PAYMENT_METHOD_LABELS[p.payment_method ?? ''] ?? '—'}
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-sm">
                                <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-muted">
                                    <tr>
                                        <th className="px-5 py-3">Date</th>
                                        <th className="px-5 py-3">User</th>
                                        <th className="px-5 py-3">Plan</th>
                                        <th className="px-5 py-3">Method</th>
                                        <th className="px-5 py-3">Reference</th>
                                        <th className="px-5 py-3 text-right">Amount</th>
                                        <th className="px-5 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                    {data.data.map(p => (
                                        <tr key={p.id}>
                                            <td className="whitespace-nowrap px-5 py-3">{formatDateTime(p.paid_at ?? p.created_at)}</td>
                                            <td className="px-5 py-3">
                                                <div className="font-medium text-dark">{p.user?.name}</div>
                                                <div className="text-xs text-muted">{p.user?.email}</div>
                                            </td>
                                            <td className="px-5 py-3">{p.plan?.name}</td>
                                            <td className="px-5 py-3">{PAYMENT_METHOD_LABELS[p.payment_method ?? ''] ?? '—'}</td>
                                            <td className="px-5 py-3 font-mono text-xs">{p.reference}</td>
                                            <td className="px-5 py-3 text-right font-semibold">{formatMoney(p.amount, p.currency)}</td>
                                            <td className="px-5 py-3">
                                                <PaymentStatusBadge status={p.status} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
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
        </div>
    )
}
