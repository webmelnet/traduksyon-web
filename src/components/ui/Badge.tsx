import React from 'react'

type Tone = 'teal' | 'green' | 'amber' | 'red' | 'gray' | 'purple'

const tones: Record<Tone, string> = {
    teal: 'bg-primary-mint text-primary-deep',
    green: 'bg-green-100 text-success',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-danger',
    gray: 'bg-slate-100 text-muted',
    purple: 'bg-ai-soft text-ai',
}

export default function Badge({ tone = 'gray', children }: { tone?: Tone; children: React.ReactNode }) {
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>
}
