'use client'

import Link from 'next/link'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSWRConfig } from 'swr'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import axios from '@/lib/axios'
import type { CreditState, Payment } from '@/types'
import { formatMoney } from '@/utils/format'
import { formatCredits } from '@/utils/credits'

/**
 * Landing page for the gateway's success/cancel redirect. GET /api/billing/payments/{id} asks the
 * gateway for the real status (never trust the redirect alone), so this works even if the webhook
 * hasn't arrived yet. Polls a few times while the payment is still pending.
 */
export default function BillingReturnPage() {
    const { mutate } = useSWRConfig()
    const [payment, setPayment] = useState<Payment | null>(null)
    const [credits, setCredits] = useState<CreditState | null>(null)
    const [failed, setFailed] = useState(false)
    const tries = useRef(0)

    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get('payment')
        if (!id) return setFailed(true)
        let timer: ReturnType<typeof setTimeout>

        const check = async () => {
            try {
                const res = await axios.get(`/api/billing/payments/${id}`)
                setPayment(res.data.payment)
                setCredits(res.data.credits)
                if (res.data.payment.status === 'pending' && tries.current++ < 10) timer = setTimeout(check, 3000)
                if (res.data.payment.status === 'paid') mutate('/api/user')
            } catch {
                setFailed(true)
            }
        }
        check()
        return () => clearTimeout(timer)
    }, [mutate])

    const status = failed ? 'error' : payment?.status

    return (
        <div className="mx-auto max-w-md py-6">
            <Card className="flex flex-col items-center px-6 py-10 text-center">
                {!status && <Spinner className="h-8 w-8" />}
                {status === 'paid' && (
                    <>
                        <CheckCircle2 className="h-14 w-14 text-success" />
                        <h1 className="mt-4 text-xl font-bold">Payment successful</h1>
                        <p className="mt-2 text-sm text-muted">
                            {formatMoney(payment!.amount, payment!.currency)} received for the {payment!.plan?.name} pack.
                            {payment!.credits ? <> {formatCredits(payment!.credits)} added.</> : null}
                            {credits && <> Your balance is now {formatCredits(credits.balance)}.</>}
                        </p>
                    </>
                )}
                {status === 'pending' && (
                    <>
                        <Clock className="h-14 w-14 text-warning" />
                        <h1 className="mt-4 text-xl font-bold">Waiting for confirmation</h1>
                        <p className="mt-2 text-sm text-muted">We haven&apos;t received confirmation from the payment provider yet. This page will update automatically.</p>
                    </>
                )}
                {(status === 'failed' || status === 'expired' || status === 'cancelled' || status === 'error') && (
                    <>
                        <XCircle className="h-14 w-14 text-danger" />
                        <h1 className="mt-4 text-xl font-bold">Payment not completed</h1>
                        <p className="mt-2 text-sm text-muted">No charge was made. You can try again from the Credits page.</p>
                    </>
                )}
                <Link href={status === 'paid' ? '/home' : '/billing'} className="mt-8 w-full">
                    <Button block size="lg">
                        {status === 'paid' ? 'Go to home' : 'Back to Credits'}
                    </Button>
                </Link>
            </Card>
        </div>
    )
}
