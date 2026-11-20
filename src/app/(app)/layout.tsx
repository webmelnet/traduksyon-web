'use client'

import { usePathname, useRouter } from 'next/navigation'
import React, { useEffect } from 'react'
import BottomNav from '@/components/layout/BottomNav'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import TrialBanner from '@/components/layout/TrialBanner'
import { FullPageLoader } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/auth'

/** Pages that stay reachable after the trial/subscription lapses, so the user can pay or manage their account. */
const ALWAYS_ALLOWED = ['/billing', '/settings', '/users', '/payments']

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth({ middleware: 'auth' })
    const pathname = usePathname()
    const router = useRouter()

    const locked = !!user && !user.subscription.access && !ALWAYS_ALLOWED.some(p => pathname.startsWith(p))

    useEffect(() => {
        if (locked) router.replace('/billing?expired=1')
    }, [locked, router])

    if (!user || locked) return <FullPageLoader />

    return (
        <div className="flex min-h-[100dvh] bg-canvas">
            <Sidebar user={user} onLogout={logout} />
            <div className="flex min-w-0 flex-1 flex-col">
                <Header user={user} onLogout={logout} />
                <TrialBanner sub={user.subscription} />
                <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 md:pb-10">{children}</main>
            </div>
            <BottomNav />
        </div>
    )
}
