'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { adminNavFor } from '@/components/admin/nav'
import { FullPageLoader } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/auth'

/** /admin → the first admin page this user may open. */
export default function AdminIndex() {
    const { user } = useAuth()
    const router = useRouter()

    useEffect(() => {
        const first = adminNavFor(user)[0]
        if (first) router.replace(first.href)
    }, [user, router])

    return <FullPageLoader />
}
