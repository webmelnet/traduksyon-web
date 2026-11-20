import Link from 'next/link'
import { LogoMark } from '@/components/Logo'

export default function NotFound() {
    return (
        <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
            <LogoMark size={64} />
            <h1 className="text-2xl font-bold">Page not found</h1>
            <p className="text-muted">The page you are looking for does not exist.</p>
            <Link href="/home" className="font-semibold text-primary hover:text-primary-hover">
                Go home
            </Link>
        </main>
    )
}
