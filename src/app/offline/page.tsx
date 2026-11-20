import { WifiOff } from 'lucide-react'
import { LogoMark } from '@/components/Logo'

export const metadata = { title: 'Offline' }

export default function Offline() {
    return (
        <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
            <LogoMark size={64} />
            <WifiOff className="h-8 w-8 text-muted" />
            <h1 className="text-xl font-bold">You are offline</h1>
            <p className="max-w-xs text-muted">Check your internet connection. Traduksyon will reconnect automatically.</p>
        </main>
    )
}
