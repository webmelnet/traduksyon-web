'use client'

import Link from 'next/link'
import { Coins } from 'lucide-react'
import type { CreditState } from '@/types'
import { formatCredits } from '@/utils/credits'

/** Shown when the balance is low (API `credits.low`) or below zero. Never for staff. */
export default function CreditBanner({ credits }: { credits: CreditState }) {
    if (credits.exempt || !credits.low) return null

    const empty = credits.balance <= 0
    return (
        <div className={`px-4 py-2 text-center text-sm sm:px-6 ${empty ? 'bg-amber-50 text-amber-800' : 'bg-primary-mint/60 text-primary-deep'}`}>
            <Coins className="mr-1.5 inline h-4 w-4 align-[-3px]" />
            {empty ? 'You’re out of credits.' : `You have ${formatCredits(credits.balance)} left.`}{' '}
            <Link href="/billing" className="font-semibold underline underline-offset-2">
                Buy credits
            </Link>
        </div>
    )
}
