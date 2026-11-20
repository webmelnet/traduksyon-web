'use client'

import Link from 'next/link'
import { Clock } from 'lucide-react'
import type { SubscriptionState } from '@/types'

/** Shown while on trial, and in the last 5 days of a paid period. */
export default function TrialBanner({ sub }: { sub: SubscriptionState }) {
    if (sub.status === 'trial') {
        const urgent = sub.trial_days_left <= 3
        return (
            <div className={`px-4 py-2 text-center text-sm sm:px-6 ${urgent ? 'bg-amber-50 text-amber-800' : 'bg-primary-mint/60 text-primary-deep'}`}>
                <Clock className="mr-1.5 inline h-4 w-4 align-[-3px]" />
                {sub.trial_days_left > 0
                    ? `Free trial: ${sub.trial_days_left} day${sub.trial_days_left === 1 ? '' : 's'} left.`
                    : 'Your free trial ends today.'}{' '}
                <Link href="/billing" className="font-semibold underline underline-offset-2">
                    Subscribe now
                </Link>
            </div>
        )
    }
    if (sub.status === 'active' && sub.days_left <= 5) {
        return (
            <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-800 sm:px-6">
                Your subscription ends in {sub.days_left} day{sub.days_left === 1 ? '' : 's'}.{' '}
                <Link href="/billing" className="font-semibold underline underline-offset-2">
                    Renew
                </Link>
            </div>
        )
    }
    return null
}
