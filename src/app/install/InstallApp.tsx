'use client'

import { CheckCircle2, Download, Laptop, MoreVertical, PlusSquare, Share, Smartphone, WifiOff, Zap } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LogoMark, TAGLINE } from '@/components/Logo'
import Button from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

/** How long to wait for Chrome/Edge to offer the install prompt before showing manual steps. */
const PROMPT_WAIT_MS = 3500

/**
 * Public landing page for "Install the app" links (the marketing site's buttons point here).
 * The native install dialog can only be opened from this origin and from a click, so this page
 * is one button that opens it. Browsers without an install API get short manual steps.
 */
export default function InstallApp() {
    const { ready, canInstall, installed, platform, install } = useInstallPrompt()
    const [waited, setWaited] = useState(false)
    const [installing, setInstalling] = useState(false)
    const [justInstalled, setJustInstalled] = useState(false)
    const [standalone, setStandalone] = useState(false)

    useEffect(() => {
        setStandalone(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true)
        const t = setTimeout(() => setWaited(true), PROMPT_WAIT_MS)
        return () => clearTimeout(t)
    }, [])

    const onInstall = async () => {
        setInstalling(true)
        try {
            if ((await install()) === 'accepted') setJustInstalled(true)
        } finally {
            setInstalling(false)
        }
    }

    let body: React.ReactNode
    if (!ready) {
        body = <Spinner />
    } else if (standalone) {
        body = (
            <Done title="You’re using the app" text="Traduksyon is already installed on this device.">
                <Link href="/home" className="w-full">
                    <Button size="lg" block>
                        Open Traduksyon
                    </Button>
                </Link>
            </Done>
        )
    } else if (justInstalled || installed) {
        body = (
            <Done title="Installed!" text="Traduksyon is now on your home screen or in your apps list. Open it from there anytime.">
                <Link href="/home" className="w-full">
                    <Button size="lg" variant="secondary" block>
                        Continue in the browser
                    </Button>
                </Link>
            </Done>
        )
    } else if (canInstall) {
        body = (
            <Button size="lg" block onClick={onInstall} loading={installing} icon={<Download className="h-5 w-5" />}>
                Install Traduksyon
            </Button>
        )
    } else if (platform === 'unknown' && !waited) {
        body = (
            <Button size="lg" block disabled loading>
                Getting ready…
            </Button>
        )
    } else {
        body = <ManualSteps platform={platform} />
    }

    return (
        <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-primary-mint/50 to-canvas px-4 py-10">
            <div className="w-full max-w-md rounded-3xl border border-line bg-white p-6 text-center shadow-xl shadow-dark/5 sm:p-8">
                <LogoMark size={72} className="mx-auto" />
                <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-dark">Install Traduksyon.com</h1>
                <p className="mt-1 text-sm text-muted">{TAGLINE}</p>

                <ul className="mt-6 grid grid-cols-3 gap-2 text-xs text-body">
                    <Perk icon={<Zap className="h-4 w-4" />} label="Opens instantly" />
                    <Perk icon={<Smartphone className="h-4 w-4" />} label="Full screen, no tabs" />
                    <Perk icon={<WifiOff className="h-4 w-4" />} label="Works on weak signal" />
                </ul>

                <div className="mt-7 flex flex-col items-center gap-3">{body}</div>

                <p className="mt-6 text-xs text-muted">
                    Free and small, no app store needed.{' '}
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                        Log in in the browser instead
                    </Link>
                </p>
            </div>
        </main>
    )
}

function Perk({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <li className="flex flex-col items-center gap-1.5 rounded-xl bg-canvas px-2 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-mint text-primary-deep">{icon}</span>
            {label}
        </li>
    )
}

function Done({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
    return (
        <>
            <CheckCircle2 className="h-10 w-10 text-success" />
            <div>
                <div className="font-bold text-dark">{title}</div>
                <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
            {children}
        </>
    )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{n}</span>
            <span className="pt-0.5">{children}</span>
        </li>
    )
}

const ic = 'mx-0.5 inline h-4 w-4 align-[-3px] text-primary'

/** Browsers with no install API (Safari, Firefox), or Chrome/Edge when the app is already installed. */
function ManualSteps({ platform }: { platform: string }) {
    let title = 'Install from your browser menu'
    let steps: React.ReactNode[]

    if (platform === 'ios' || platform === 'ios-other') {
        title = 'Add to your Home Screen'
        steps = [
            <>
                Tap the <Share className={ic} /> <b>Share</b> button {platform === 'ios' ? 'at the bottom of Safari' : 'in the address bar'}.
            </>,
            <>
                Scroll down and tap <PlusSquare className={ic} /> <b>Add to Home Screen</b>.
            </>,
            <>
                Tap <b>Add</b>. Traduksyon appears on your Home Screen.
            </>,
        ]
    } else if (platform === 'mac-safari') {
        title = 'Add to your Dock'
        steps = [
            <>
                In the menu bar, click <b>File</b> (or the <Share className={ic} /> Share button).
            </>,
            <>
                Choose <b>Add to Dock</b>, then click <b>Add</b>.
            </>,
        ]
    } else if (platform === 'firefox') {
        title = 'Install with Firefox'
        steps = [
            <>
                On Android, tap the <MoreVertical className={ic} /> menu, then <b>Install</b> or <b>Add to Home screen</b>.
            </>,
            <>
                Firefox on computers can’t install apps. Open this page in <b>Chrome</b> or <b>Edge</b> to install with one click.
            </>,
        ]
    } else {
        steps = [
            <>
                Already installed? Open <b>Traduksyon</b> from your home screen or apps list.
            </>,
            <>
                Otherwise tap the <MoreVertical className={ic} /> browser menu and choose <b>Install app</b> or <b>Add to Home screen</b>. On a computer, you can also click the{' '}
                <Laptop className={ic} /> install icon in the address bar.
            </>,
        ]
    }

    return (
        <div className="w-full rounded-2xl border border-line bg-canvas p-4 text-left text-sm text-body">
            <div className="mb-3 font-semibold text-dark">{title}</div>
            <ol className="space-y-3">
                {steps.map((s, i) => (
                    <Step key={i} n={i + 1}>
                        {s}
                    </Step>
                ))}
            </ol>
        </div>
    )
}
