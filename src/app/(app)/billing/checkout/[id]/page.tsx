'use client'

import { FlaskConical } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/contexts/ToastContext'
import axios from '@/lib/axios'
import type { Payment } from '@/types'
import { errorMessage, formatMoney, PAYMENT_METHOD_LABELS } from '@/utils/format'

/**
 * Simulated hosted-checkout page, used only when the API runs with PAYMENT_DRIVER=fake
 * (no gateway keys yet). Lets you exercise the full subscribe → activate flow end to end.
 */
export default function FakeCheckoutPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const { toast } = useToast()
    const [payment, setPayment] = useState<Payment | null>(null)
    const [methods, setMethods] = useState<string[]>([])
    const [method, setMethod] = useState('gcash')
    const [busy, setBusy] = useState<'paid' | 'failed' | null>(null)

    useEffect(() => {
        axios.get(`/api/billing/payments/${id}`).then(r => setPayment(r.data.payment))
        axios.get('/api/billing').then(r => setMethods(r.data.methods))
    }, [id])

    const simulate = async (outcome: 'paid' | 'failed') => {
        setBusy(outcome)
        try {
            await axios.post(`/api/billing/payments/${id}/simulate`, { outcome, method })
            router.replace(`/billing/return?payment=${id}`)
        } catch (err) {
            toast(errorMessage(err), 'error')
            setBusy(null)
        }
    }

    if (!payment)
        return (
            <div className="flex justify-center py-20">
                <Spinner className="h-7 w-7" />
            </div>
        )

    return (
        <div className="mx-auto max-w-md space-y-4 py-4">
            <Alert tone="warning">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                    <FlaskConical className="h-4 w-4" /> Simulated checkout
                </span>{' '}
                — no real money moves. Replace with PayMongo by setting its keys in the API.
            </Alert>
            <Card className="p-6">
                <div className="text-sm text-muted">Amount due</div>
                <div className="text-3xl font-extrabold text-dark">{formatMoney(payment.amount, payment.currency)}</div>
                <div className="mt-1 text-sm text-muted">{payment.plan?.name}</div>

                <fieldset className="mt-6 space-y-2" disabled={payment.status !== 'pending'}>
                    <legend className="mb-2 text-sm font-semibold text-dark">Payment method</legend>
                    {methods.map(m => (
                        <label key={m} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${method === m ? 'border-primary bg-primary-mint/40' : 'border-line'}`}>
                            <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="text-primary focus:ring-primary" />
                            {PAYMENT_METHOD_LABELS[m] ?? m}
                        </label>
                    ))}
                </fieldset>

                {payment.status !== 'pending' ? (
                    <Alert tone="info" className="mt-6">
                        This payment is already {payment.status}.
                    </Alert>
                ) : (
                    <div className="mt-6 grid gap-2">
                        <Button size="lg" block loading={busy === 'paid'} disabled={!!busy} onClick={() => simulate('paid')}>
                            Pay {formatMoney(payment.amount, payment.currency)}
                        </Button>
                        <Button size="lg" block variant="secondary" loading={busy === 'failed'} disabled={!!busy} onClick={() => simulate('failed')}>
                            Simulate failed payment
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    )
}
