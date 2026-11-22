'use client'

import { useCallback, useEffect, useState } from 'react'

export interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
    interface Window {
        /** Set by the inline script in app/layout.tsx, which runs before hydration. */
        __installPrompt?: BeforeInstallPromptEvent | null
    }
}

export type InstallPlatform = 'prompt' | 'ios' | 'ios-other' | 'mac-safari' | 'firefox' | 'unknown'

function detectPlatform(): Exclude<InstallPlatform, 'prompt'> {
    const ua = navigator.userAgent
    const isIos = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPadOS reports as Mac
    if (isIos) return /CriOS|FxiOS|EdgiOS/i.test(ua) && !/Safari/i.test(ua) ? 'ios-other' : 'ios'
    if (/Firefox/i.test(ua)) return 'firefox'
    if (/Macintosh/i.test(ua) && /Safari/i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua)) return 'mac-safari'
    return 'unknown'
}

/**
 * Exposes the browser's native install dialog (Chrome / Edge / Samsung Internet / Android).
 * Safari and Firefox have no install API, so `platform` tells the UI which manual steps to show.
 */
export function useInstallPrompt() {
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
    const [installed, setInstalled] = useState(false)
    const [fallback, setFallback] = useState<Exclude<InstallPlatform, 'prompt'>>('unknown')
    const [ready, setReady] = useState(false)

    useEffect(() => {
        setInstalled(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true)
        setFallback(detectPlatform())
        if (window.__installPrompt) setDeferred(window.__installPrompt)
        setReady(true)

        const onReady = () => setDeferred(window.__installPrompt ?? null)
        const onPrompt = (e: Event) => {
            e.preventDefault()
            window.__installPrompt = e as BeforeInstallPromptEvent
            setDeferred(e as BeforeInstallPromptEvent)
        }
        const onInstalled = () => {
            window.__installPrompt = null
            setDeferred(null)
            setInstalled(true)
        }
        window.addEventListener('installpromptready', onReady)
        window.addEventListener('beforeinstallprompt', onPrompt)
        window.addEventListener('appinstalled', onInstalled)
        return () => {
            window.removeEventListener('installpromptready', onReady)
            window.removeEventListener('beforeinstallprompt', onPrompt)
            window.removeEventListener('appinstalled', onInstalled)
        }
    }, [])

    /** Opens the native dialog. Resolves to the user's choice, or null when no prompt is available. */
    const install = useCallback(async () => {
        if (!deferred) return null
        await deferred.prompt()
        const { outcome } = await deferred.userChoice
        // A prompt event can only be used once; the browser fires a fresh one if the user dismissed it.
        window.__installPrompt = null
        setDeferred(null)
        if (outcome === 'accepted') setInstalled(true)
        return outcome
    }, [deferred])

    const platform: InstallPlatform = deferred ? 'prompt' : fallback

    return { ready, canInstall: !!deferred && !installed, installed, isIos: fallback === 'ios' || fallback === 'ios-other', platform, install }
}
