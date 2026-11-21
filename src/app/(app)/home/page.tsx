'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, ClipboardList, FileText, Languages, Mic, Sparkles, Upload } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/auth'

const workflow = [
    { title: 'Transcribe', text: 'Speech to text with speaker labels', Icon: FileText, tone: 'bg-primary-mint text-primary-deep', href: '/meetings' },
    { title: 'Minutes of meeting', text: 'Create minutes from a transcript or recording', Icon: ClipboardList, tone: 'bg-ai-soft text-ai', href: '/minutes' },
    { title: 'Summarize', text: 'Committee report from minutes or a transcript', Icon: Sparkles, tone: 'bg-ai-soft text-ai', href: '/reports' },
    { title: 'Translate', text: 'Convert to your preferred language', Icon: Languages, tone: 'bg-primary-mint text-primary-deep', href: '/translate' },
]

export default function HomePage() {
    const { user } = useAuth()
    const router = useRouter()
    const firstName = user?.name?.split(' ')[0]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold sm:text-3xl">Hello{firstName ? `, ${firstName}` : ''}! 👋</h1>
                <p className="mt-1 text-muted">What would you like to do today?</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
                <section className="relative overflow-hidden rounded-3xl bg-primary-deep p-6 text-white sm:p-8 lg:col-span-3">
                    <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-fresh/30" />
                    <div className="absolute -bottom-20 right-10 h-40 w-40 rounded-full bg-ai/30 blur-2xl" />
                    <div className="relative">
                        <Mic className="h-7 w-7" />
                        <h2 className="mt-4 text-xl font-bold text-white sm:text-2xl">Turn your meeting into insights</h2>
                        <p className="mt-2 max-w-md text-white/85">Upload audio and let AI transcribe, translate, and summarize it.</p>
                        <Button
                            variant="white"
                            size="lg"
                            className="mt-6 w-full sm:w-auto sm:px-8"
                            icon={<Upload className="h-5 w-5" />}
                            onClick={() => router.push('/meetings?upload=1')}>
                            Upload a recording
                        </Button>
                    </div>
                </section>

                <section className="lg:col-span-2">
                    <h2 className="mb-3 text-base font-semibold">Your workflow</h2>
                    <div className="space-y-3">
                        {workflow.map(({ title, text, Icon, tone, href }) => (
                            <Link
                                key={title}
                                href={href}
                                className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:border-primary/40">
                                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                                    <Icon className="h-5 w-5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block font-semibold text-dark">{title}</span>
                                    <span className="block truncate text-sm text-muted">{text}</span>
                                </span>
                                <ChevronRight className="h-5 w-5 text-muted" />
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}
