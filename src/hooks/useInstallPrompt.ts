'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Exposes the browser's "Add to Home Screen" prompt (Chrome/Edge/Android). iOS needs Share → Add to Home Screen. */
export function useInstallPrompt() {
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
    const [installed, setInstalled] = useState(false)
    const [isIos, setIsIos] = useState(false)

    useEffect(() => {
        setInstalled(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true)
        setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent))
        const onPrompt = (e: Event) => {
            e.preventDefault()
            setDeferred(e as BeforeInstallPromptEvent)
        }
        const onInstalled = () => setInstalled(true)
        window.addEventListener('beforeinstallprompt', onPrompt)
        window.addEventListener('appinstalled', onInstalled)
        return () => {
            window.removeEventListener('beforeinstallprompt', onPrompt)
            window.removeEventListener('appinstalled', onInstalled)
        }
    }, [])

    const install = async () => {
        if (!deferred) return
        await deferred.prompt()
        await deferred.userChoice
        setDeferred(null)
    }

    return { canInstall: !!deferred && !installed, installed, isIos, install }
}
