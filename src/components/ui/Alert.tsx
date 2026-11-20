import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import React from 'react'

type Tone = 'info' | 'success' | 'warning' | 'error'

const tones: Record<Tone, { cls: string; Icon: any }> = {
    info: { cls: 'bg-primary-mint/50 text-primary-deep border-primary-mint', Icon: Info },
    success: { cls: 'bg-green-50 text-success border-green-200', Icon: CheckCircle2 },
    warning: { cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: AlertTriangle },
    error: { cls: 'bg-red-50 text-danger border-red-200', Icon: XCircle },
}

export default function Alert({ tone = 'info', children, className = '' }: { tone?: Tone; children: React.ReactNode; className?: string }) {
    const { cls, Icon } = tones[tone]
    return (
        <div role="alert" className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${cls} ${className}`}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    )
}
