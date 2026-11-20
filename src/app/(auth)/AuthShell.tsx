import Link from 'next/link'
import { AudioLines, Languages, Sparkles } from 'lucide-react'
import React from 'react'
import { Logo, LogoMark, TAGLINE } from '@/components/Logo'

interface AuthShellProps {
    title: string
    subtitle?: React.ReactNode
    children: React.ReactNode
    footer?: React.ReactNode
}

const highlights = [
    { Icon: AudioLines, title: 'Transcribe', text: 'Turn meeting audio into accurate text.' },
    { Icon: Languages, title: 'Translate', text: 'Read it in your preferred language.' },
    { Icon: Sparkles, title: 'Summarize', text: 'Get key points and action items with AI.', ai: true },
]

/** Split layout on lg+, single centred column on phones/tablets. */
export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
    return (
        <div className="flex min-h-[100dvh] bg-canvas">
            <aside className="relative hidden w-[46%] max-w-xl flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-deep via-primary to-primary-fresh p-10 text-white lg:flex">
                <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
                <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-ai/25 blur-2xl" />
                <div className="relative flex items-center gap-3">
                    <div className="rounded-2xl bg-white p-2 shadow-lg">
                        <LogoMark size={40} />
                    </div>
                    <span className="text-xl font-extrabold tracking-tight">Traduksyon.io</span>
                </div>
                <div className="relative">
                    <h2 className="text-4xl font-extrabold leading-tight text-white">{TAGLINE}</h2>
                    <p className="mt-4 max-w-md text-white/80">
                        Upload a recording and let AI transcribe, translate, and summarize your meetings.
                    </p>
                    <ul className="mt-10 space-y-4">
                        {highlights.map(({ Icon, title, text, ai }) => (
                            <li key={title} className="flex items-center gap-4">
                                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${ai ? 'bg-ai' : 'bg-white/15'}`}>
                                    <Icon className="h-5 w-5" />
                                </span>
                                <div>
                                    <div className="font-semibold">{title}</div>
                                    <div className="text-sm text-white/75">{text}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="relative text-xs text-white/60">© {new Date().getFullYear()} Traduksyon.io</p>
            </aside>

            <main className="flex flex-1 flex-col">
                <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6">
                    <div className="w-full max-w-md">
                        <Link href="/login" className="mb-8 flex justify-center lg:hidden">
                            <Logo size={44} showTagline />
                        </Link>
                        <div className="rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8">
                            <h1 className="text-2xl font-bold">{title}</h1>
                            {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
                            <div className="mt-6">{children}</div>
                        </div>
                        {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
                    </div>
                </div>
                <p className="pb-safe py-4 text-center text-xs text-muted lg:hidden">© {new Date().getFullYear()} Traduksyon.io</p>
            </main>
        </div>
    )
}
