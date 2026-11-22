'use client'

import useSWR, { useSWRConfig } from 'swr'
import { ArrowDownCircle, ArrowUpCircle, CheckCircle2, Coins, CreditCard, FileText, Landmark, ScrollText, Smartphone, Sparkles, AudioLines } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/contexts/ToastContext'
import axios from '@/lib/axios'
import type { CreditState, CreditTransaction, Payment, Plan } from '@/types'
import { errorMessage, formatDateTime, formatMoney, PAYMENT_METHOD_LABELS } from '@/utils/format'
import { formatCredits } from '@/utils/credits'
import PaymentStatusBadge from '@/components/PaymentStatusBadge'

interface BillingData {
    credits: CreditState
    plans: Plan[]
    transactions: CreditTransaction[]
    payments: Payment[]
    driver: 'paymongo' | 'fake'
    methods: string[]
}

const fetcher = (url: string) => axios.get(url).then(r => r.data)

export default function CreditsPage() {
    const { data, error, isLoading } = useSWR<BillingData>('/api/billing', fetcher)
    const { mutate } = useSWRConfig()
    const { toast } = useToast()
    const [busyPlan, setBusyPlan] = useState<number | null>(null)
    const [needMore, setNeedMore] = useState(false)

    useEffect(() => {
        setNeedMore(new URLSearchParams(window.location.search).has('topup'))
        mutate('/api/user') // keep the header balance in step with this page
    }, [mutate])

    const checkout = async (plan: Plan) => {
        setBusyPlan(plan.id)
        try {
            const res = await axios.post('/api/billing/checkout', { plan_id: plan.id })
            window.location.href = res.data.checkout_url
        } catch (err) {
            toast(errorMessage(err, 'Unable to start checkout.'), 'error')
            setBusyPlan(null)
        }
    }

    if (isLoading)
        return (
            <div className="flex justify-center py-20">
                <Spinner className="h-7 w-7" />
            </div>
        )
    if (error || !data) return <Alert tone="error">Unable to load your credits. Please refresh the page.</Alert>

    const credits = data.credits

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Credits</h1>
                <p className="mt-1 text-muted">Buy credits and see where they went.</p>
            </div>

            {needMore && !credits.exempt && <Alert tone="warning">You don&apos;t have enough credits for that. Buy a pack below to continue.</Alert>}
            {data.driver === 'fake' && (
                <Alert tone="info">
                    <strong>Test mode:</strong> no payment gateway keys are configured, so checkout uses a simulated payment page. Add PayMongo keys in the API
                    <code className="mx-1 rounded bg-white/70 px-1">.env</code> to take real payments.
                </Alert>
            )}

            <BalanceCard credits={credits} />
            <CostTable credits={credits} />

            {!credits.exempt && (
                <section>
                    <h2 className="mb-3 text-base font-semibold">Buy credits</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                        {data.plans.map(plan => (
                            <PackCard key={plan.id} plan={plan} busy={busyPlan === plan.id} disabled={busyPlan !== null} onSelect={() => checkout(plan)} />
                        ))}
                    </div>
                    <PaymentMethods methods={data.methods} />
                </section>
            )}

            <section>
                <h2 className="mb-3 text-base font-semibold">Credit history</h2>
                <CreditHistory items={data.transactions} />
            </section>

            <section>
                <h2 className="mb-3 text-base font-semibold">Payment history</h2>
                <PaymentHistory payments={data.payments} />
            </section>
        </div>
    )
}

function BalanceCard({ credits }: { credits: CreditState }) {
    const meetings = Math.floor(Math.max(0, credits.balance) / (60 * credits.costs.transcription_per_minute + credits.costs.minutes + credits.costs.report))
    return (
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-mint text-primary-deep">
                    <Coins className="h-6 w-6" />
                </span>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-dark">Your balance</span>
                        {credits.exempt ? <Badge tone="purple">Staff account</Badge> : credits.balance < 0 ? <Badge tone="red">Below zero</Badge> : credits.low ? <Badge tone="amber">Running low</Badge> : null}
                    </div>
                    {credits.exempt ? (
                        <p className="mt-0.5 text-sm text-muted">Admin accounts are never charged.</p>
                    ) : (
                        <>
                            <p className="text-3xl font-extrabold text-dark">{formatCredits(credits.balance)}</p>
                            <p className="text-sm text-muted">
                                {credits.balance < 0
                                    ? 'A recording turned out longer than expected. Top up to start new work.'
                                    : `Enough for about ${meetings} one-hour meeting${meetings === 1 ? '' : 's'} with minutes and a report.`}
                            </p>
                        </>
                    )}
                </div>
            </div>
        </Card>
    )
}

function CostTable({ credits }: { credits: CreditState }) {
    const c = credits.costs
    const rows = [
        { Icon: AudioLines, label: 'Transcription', value: `${formatCredits(c.transcription_per_minute)} per minute of audio` },
        { Icon: FileText, label: 'Minutes of meeting', value: `${formatCredits(c.minutes)} each` },
        { Icon: ScrollText, label: 'Committee report', value: `${formatCredits(c.report)} each` },
    ]
    return (
        <Card className="p-5">
            <h2 className="text-base font-semibold">What things cost</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                {rows.map(({ Icon, label, value }) => (
                    <li key={label} className="flex items-start gap-3 rounded-xl bg-canvas px-3 py-2.5">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <div>
                            <div className="text-sm font-medium text-dark">{label}</div>
                            <div className="text-xs text-muted">{value}</div>
                        </div>
                    </li>
                ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Credits are taken when a job starts and returned automatically if it fails. Regenerating minutes or a report uses credits again.</p>
        </Card>
    )
}

function PackCard({ plan, busy, disabled, onSelect }: { plan: Plan; busy: boolean; disabled: boolean; onSelect: () => void }) {
    const perCredit = plan.credits > 0 ? plan.price / plan.credits : 0
    return (
        <Card className={`relative flex flex-col p-5 ${plan.is_featured ? 'border-primary ring-2 ring-primary/20' : ''}`}>
            {plan.is_featured && (
                <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-ai px-3 py-1 text-xs font-semibold text-white">
                    <Sparkles className="h-3 w-3" /> Popular
                </span>
            )}
            <h3 className="text-lg font-bold">{plan.name}</h3>
            <div className="mt-2 text-2xl font-extrabold text-dark">{formatCredits(plan.credits)}</div>
            {plan.description && <p className="mt-1 text-sm text-muted">{plan.description}</p>}
            <div className="mt-4 flex items-baseline gap-2">
                <span className="text-xl font-bold text-dark">{formatMoney(plan.price, plan.currency)}</span>
                <span className="text-xs text-muted">{formatMoney(Math.round(perCredit), plan.currency)} / credit</span>
            </div>
            <ul className="mt-3 flex-1 space-y-1.5 text-xs">
                {(plan.features ?? []).map(f => (
                    <li key={f} className="flex items-start gap-1.5">
                        <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-primary" /> {f}
                    </li>
                ))}
            </ul>
            <Button className="mt-5" block variant={plan.is_featured ? 'primary' : 'secondary'} loading={busy} disabled={disabled} onClick={onSelect}>
                Buy
            </Button>
        </Card>
    )
}

function PaymentMethods({ methods }: { methods: string[] }) {
    const icon = (m: string) => (m === 'card' ? CreditCard : m === 'gcash' || m === 'paymaya' || m === 'grab_pay' ? Smartphone : Landmark)
    return (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>Pay with:</span>
            {methods.map(m => {
                const Icon = icon(m)
                return (
                    <span key={m} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 font-medium text-body">
                        <Icon className="h-3.5 w-3.5 text-primary" /> {PAYMENT_METHOD_LABELS[m] ?? m}
                    </span>
                )
            })}
        </div>
    )
}

const TYPE_LABELS: Record<CreditTransaction['type'], string> = {
    signup: 'Welcome',
    purchase: 'Purchase',
    usage: 'Used',
    refund: 'Refund',
    adjustment: 'Adjustment',
}

function CreditHistory({ items }: { items: CreditTransaction[] }) {
    if (!items.length) return <Card className="px-5 py-8 text-center text-sm text-muted">No credit activity yet.</Card>
    return (
        <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
                {items.map(t => {
                    const plus = t.amount > 0
                    const Icon = plus ? ArrowUpCircle : ArrowDownCircle
                    return (
                        <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                            <div className="flex min-w-0 items-center gap-3">
                                <Icon className={`h-5 w-5 shrink-0 ${plus ? 'text-success' : 'text-muted'}`} />
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-dark">{t.description}</div>
                                    <div className="text-xs text-muted">
                                        {formatDateTime(t.created_at)} · {TYPE_LABELS[t.type] ?? t.type}
                                    </div>
                                </div>
                            </div>
                            <div className="shrink-0 text-right">
                                <div className={`text-sm font-semibold ${plus ? 'text-success' : 'text-dark'}`}>
                                    {plus ? '+' : '−'}
                                    {new Intl.NumberFormat('en-PH').format(Math.abs(t.amount))}
                                </div>
                                <div className="text-xs text-muted">Balance {new Intl.NumberFormat('en-PH').format(t.balance_after)}</div>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </Card>
    )
}

function PaymentHistory({ payments }: { payments: Payment[] }) {
    if (!payments.length) return <Card className="px-5 py-8 text-center text-sm text-muted">No payments yet.</Card>
    const what = (p: Payment) => (p.credits ? `${p.plan?.name ?? 'Credit pack'} · ${formatCredits(p.credits)}` : (p.plan?.name ?? 'Subscription'))
    return (
        <Card className="overflow-hidden">
            {/* Phones: stacked rows */}
            <ul className="divide-y divide-line md:hidden">
                {payments.map(p => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                            <div className="truncate font-medium text-dark">{what(p)}</div>
                            <div className="text-xs text-muted">
                                {formatDateTime(p.paid_at ?? p.created_at)} · {PAYMENT_METHOD_LABELS[p.payment_method ?? ''] ?? '—'}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-semibold">{formatMoney(p.amount, p.currency)}</div>
                            <PaymentStatusBadge status={p.status} />
                        </div>
                    </li>
                ))}
            </ul>
            <table className="hidden w-full text-sm md:table">
                <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-muted">
                    <tr>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Reference</th>
                        <th className="px-5 py-3">Pack</th>
                        <th className="px-5 py-3">Method</th>
                        <th className="px-5 py-3 text-right">Amount</th>
                        <th className="px-5 py-3">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-line">
                    {payments.map(p => (
                        <tr key={p.id}>
                            <td className="px-5 py-3">{formatDateTime(p.paid_at ?? p.created_at)}</td>
                            <td className="px-5 py-3 font-mono text-xs">{p.reference}</td>
                            <td className="px-5 py-3">{what(p)}</td>
                            <td className="px-5 py-3">{PAYMENT_METHOD_LABELS[p.payment_method ?? ''] ?? '—'}</td>
                            <td className="px-5 py-3 text-right font-semibold">{formatMoney(p.amount, p.currency)}</td>
                            <td className="px-5 py-3">
                                <PaymentStatusBadge status={p.status} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Card>
    )
}
