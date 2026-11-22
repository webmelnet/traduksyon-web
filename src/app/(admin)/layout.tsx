'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'
import AdminSidebar, { AdminTabs } from '@/components/admin/AdminSidebar'
import { canUseAdmin } from '@/components/admin/nav'
import Header from '@/components/layout/Header'
import { FullPageLoader } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/auth'

/**
 * Admin console shell (/admin/*): Superadmin / Admin only. Separate from the customer shell in (app):
 * no bottom nav, its own dark sidebar. Customers are sent back to /home.
 * Each page still checks its own permission (see components/admin/nav.ts) and the API enforces it.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth({ middleware: 'auth' })
    const router = useRouter()
    const allowed = canUseAdmin(user)

    useEffect(() => {
        if (user && !allowed) router.replace('/home')
    }, [user, allowed, router])

    if (!user || !allowed) return <FullPageLoader />

    return (
        <div className="flex min-h-[100dvh] bg-canvas">
            <AdminSidebar user={user} onLogout={logout} />
            <div className="flex min-w-0 flex-1 flex-col">
                <Header user={user} onLogout={logout} />
                <AdminTabs user={user} />
                <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-5 sm:px-6">{children}</main>
            </div>
        </div>
    )
}
