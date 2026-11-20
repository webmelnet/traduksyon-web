'use client'

import { useEffect } from 'react'

/**
 * Registers /public/sw.js. Skipped in `next dev` because a caching worker fights hot reload;
 * set NEXT_PUBLIC_ENABLE_SW_IN_DEV=1 to test the PWA locally without building.
 */
export default function ServiceWorkerRegister() {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return
        const enabled = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_SW_IN_DEV === '1'
        if (!enabled) return
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(err => console.warn('SW registration failed', err))
    }, [])
    return null
}
