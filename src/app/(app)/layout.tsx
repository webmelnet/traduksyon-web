'use client'

import React, { useEffect } from 'react'
import BottomNav from '@/components/layout/BottomNav'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import CreditBanner from '@/components/layout/CreditBanner'
import { FullPageLoader } from '@/components/ui/Spinner'
import { JUST_LOGGED_IN, useAuth } from '@/hooks/auth'
import { useToast } from '@/contexts/ToastContext'
import { formatCredits } from '@/utils/credits'

/**
 * Customer workspace shell. Admin pages have their own shell in (admin).
 * No access gate: with prepaid credits everything stays viewable; the API refuses new jobs with 402
 * insufficient_credits, and the forms show the cost and a "Buy credits" link instead.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth({ middleware: 'auth' })
    const { toast } = useToast()

    // Right after signing in, say how many credits are left (once per login; staff are never charged).
    useEffect(() => {
        if (!user) return
        let fresh = false
        try {
            fresh = sessionStorage.getItem(JUST_LOGGED_IN) === '1'
            sessionStorage.removeItem(JUST_LOGGED_IN)
        } catch {
            return
        }
        if (!fresh || user.credits.exempt) return
        const left = user.credits.balance
        toast(
            left > 0 ? `Welcome back, ${user.name.split(' ')[0]}! You have ${formatCredits(left)} left.` : 'Welcome back! You’re out of credits — buy a pack to start new work.',
            left > 0 && !user.credits.low ? 'success' : 'info',
        )
    }, [user, toast])

    if (!user) return <FullPageLoader />

    return (
        <div className="flex min-h-[100dvh] bg-canvas">
            <Sidebar user={user} onLogout={logout} />
            <div className="flex min-w-0 flex-1 flex-col">
                <Header user={user} onLogout={logout} />
                <CreditBanner credits={user.credits} />
                <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 md:pb-10">{children}</main>
            </div>
            <BottomNav />
        </div>
    )
}
