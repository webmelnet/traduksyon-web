'use client'

import Link from 'next/link'
import { Coins } from 'lucide-react'
import { useAuth } from '@/hooks/auth'
import { formatCredits } from '@/utils/credits'

/**
 * "This will use N credits · you have M" under a create form. `cost` null = not known yet
 * (e.g. no recording picked); `hint` is shown instead. Hidden for staff, who are never charged.
 */
export default function CreditCostNote({ cost, hint }: { cost: number | null; hint?: string }) {
    const { user } = useAuth()
    const credits = user?.credits
    if (!credits || credits.exempt) return null

    const short = cost != null && credits.balance < cost
    return (
        <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl px-3 py-2.5 text-sm ${short ? 'bg-amber-50 text-amber-800' : 'bg-canvas text-body'}`}>
            <Coins className="h-4 w-4 shrink-0 text-primary" />
            <span>
                {cost != null ? (
                    <>
                        This will use <strong>{formatCredits(cost)}</strong>.
                    </>
                ) : (
                    hint
                )}{' '}
                You have {formatCredits(credits.balance)}.
            </span>
            {short && (
                <Link href="/billing?topup=1" className="font-semibold underline underline-offset-2">
                    Buy credits
                </Link>
            )}
        </div>
    )
}
