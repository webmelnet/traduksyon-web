import { Loader2 } from 'lucide-react'
import { LogoMark } from '@/components/Logo'

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
    return <Loader2 className={`animate-spin text-primary ${className}`} />
}

export function FullPageLoader() {
    return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-canvas">
            <LogoMark size={64} className="animate-pulse" />
            <Spinner />
        </div>
    )
}
