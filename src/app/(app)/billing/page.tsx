'use client'

import useSWR from 'swr'
import { CheckCircle2, CreditCard, Landmark, ShieldCheck, Smartphone, Sparkles } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/contexts/ToastContext'
import axios from '@/lib/axios'
import type { Payment, Plan, SubscriptionState } from '@/types'
import { errorMessage, formatDate, formatDateTime, formatMoney, PAYMENT_METHOD_LABELS } from '@/utils/format'
import PaymentStatusBadge from '@/components/PaymentStatusBadge'

interface BillingData {
    subscription: SubscriptionState
    plans: Plan[]
    payments: Payment[]
    driver: 'paymongo' | 'fake'
    methods: string[]
}

const fetcher = (url: string) => axios.get(url).then(r => r.data)

export default function BillingPage() {
    const { data, error, isLoading } = useSWR<BillingData>('/api/billing', fetcher)
    const { toast } = useToast()
    const [busyPlan, setBusyPlan] = useState<number | null>(null)
    const [expired, setExpired] = useState(false)

    useEffect(() => setExpired(new URLSearchParams(window.location.search).has('expired')), [])

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
    if (error || !data) return <Alert tone="error">Unable to load your subscription. Please refresh the page.</Alert>

    const sub = data.subscription

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Subscription</h1>
                <p className="mt-1 text-muted">Manage your plan and payments.</p>
            </div>

            {expired && !sub.access && (
                <Alert tone="warning">
                    {sub.trial_ends_at && !sub.ends_at
                        ? 'Your 14-day free trial has ended. Choose a plan below to keep using Traduksyon.io.'
                        : 'Your subscription has expired. Renew below to continue.'}
                </Alert>
            )}
            {data.driver === 'fake' && (
                <Alert tone="info">
                    <strong>Test mode:</strong> no payment gateway keys are configured, so checkout uses a simulated payment page. Add PayMongo keys in the API
                    <code className="mx-1 rounded bg-white/70 px-1">.env</code> to take real payments.
                </Alert>
            )}

            <StatusCard sub={sub} />

            <section>
                <h2 className="mb-3 text-base font-semibold">{sub.status === 'active' ? 'Extend your subscription' : 'Choose a plan'}</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    {data.plans.map(plan => (
                        <PlanCard key={plan.id} plan={plan} busy={busyPlan === plan.id} disabled={busyPlan !== null} onSelect={() => checkout(plan)} cta={sub.status === 'active' ? 'Extend' : 'Subscribe'} />
                    ))}
                </div>
                <PaymentMethods methods={data.methods} />
            </section>

            <section>
                <h2 className="mb-3 text-base font-semibold">Payment history</h2>
                <PaymentHistory payments={data.payments} />
            </section>
        </div>
    )
}

function StatusCard({ sub }: { sub: SubscriptionState }) {
    const map = {
        trial: { tone: 'teal' as const, label: 'Free trial', line: `${sub.trial_days_left} day(s) left · ends ${formatDate(sub.trial_ends_at)}` },
        active: { tone: 'green' as const, label: sub.plan?.name ?? 'Active', line: `Active until ${formatDate(sub.ends_at)} · ${sub.days_left} day(s) left` },
        expired: { tone: 'red' as const, label: 'Expired', line: sub.ends_at ? `Ended ${formatDate(sub.ends_at)}` : `Trial ended ${formatDate(sub.trial_ends_at)}` },
        exempt: { tone: 'purple' as const, label: 'Staff account', line: 'Admin accounts have full access without a subscription.' },
    }
    const s = map[sub.status]
    return (
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-mint text-primary-deep">
                    <ShieldCheck className="h-6 w-6" />
                </span>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-dark">Current plan</span>
                        <Badge tone={s.tone}>{s.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{s.line}</p>
                </div>
            </div>
        </Card>
    )
}

function PlanCard({ plan, busy, disabled, onSelect, cta }: { plan: Plan; busy: boolean; disabled: boolean; onSelect: () => void; cta: string }) {
    const per = plan.interval === 'year' ? 'year' : 'month'
    return (
        <Card className={`relative flex flex-col p-6 ${plan.is_featured ? 'border-primary ring-2 ring-primary/20' : ''}`}>
            {plan.is_featured && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-ai px-3 py-1 text-xs font-semibold text-white">
                    <Sparkles className="h-3 w-3" /> Best value
                </span>
            )}
            <h3 className="text-lg font-bold">{plan.name}</h3>
            {plan.description && <p className="mt-1 text-sm text-muted">{plan.description}</p>}
            <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-dark">{formatMoney(plan.price, plan.currency)}</span>
                <span className="text-muted">/ {per}</span>
            </div>
            <ul className="mt-4 flex-1 space-y-2 text-sm">
                {(plan.features ?? []).map(f => (
                    <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                    </li>
                ))}
            </ul>
            <Button className="mt-6" block size="lg" variant={plan.is_featured ? 'primary' : 'secondary'} loading={busy} disabled={disabled} onClick={onSelect}>
                {cta}
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

function PaymentHistory({ payments }: { payments: Payment[] }) {
    if (!payments.length) return <Card className="px-5 py-8 text-center text-sm text-muted">No payments yet.</Card>
    return (
        <Card className="overflow-hidden">
            {/* Phones: stacked rows */}
            <ul className="divide-y divide-line md:hidden">
                {payments.map(p => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                            <div className="truncate font-medium text-dark">{p.plan?.name ?? 'Subscription'}</div>
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
                        <th className="px-5 py-3">Plan</th>
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
                            <td className="px-5 py-3">{p.plan?.name ?? '—'}</td>
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
