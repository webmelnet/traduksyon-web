'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, LogOut, ShieldCheck } from 'lucide-react'
import { LogoMark } from '@/components/Logo'
import { isActive } from '@/components/layout/nav'
import type { AuthUser } from '@/types'
import { adminNavFor } from './nav'

/** md: icon rail, lg+: full sidebar. Phones use AdminTabs under the header instead. */
export default function AdminSidebar({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
    const pathname = usePathname()
    const items = adminNavFor(user)

    return (
        <aside className="sticky top-0 hidden h-[100dvh] shrink-0 flex-col bg-dark text-white md:flex md:w-20 lg:w-64">
            <div className="flex h-16 items-center justify-center px-4 lg:justify-start lg:px-5">
                <Link href="/admin" className="flex items-center gap-2.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                        <LogoMark size={28} />
                    </span>
                    <span className="hidden text-lg font-extrabold tracking-tight lg:inline">Traduksyon</span>
                </Link>
            </div>
            <div className="hidden items-center gap-2 px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/50 lg:flex">
                <ShieldCheck className="h-3.5 w-3.5" /> Admin console
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
                {items.map(({ href, label, Icon }) => {
                    const active = isActive(pathname, href)
                    return (
                        <Link
                            key={href}
                            href={href}
                            title={label}
                            className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition lg:justify-start ${
                                active ? 'bg-primary text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                            }`}>
                            <Icon className="h-5 w-5 shrink-0" />
                            <span className="hidden lg:inline">{label}</span>
                        </Link>
                    )
                })}
            </nav>
            <div className="space-y-1 border-t border-white/10 p-3">
                <Link
                    href="/home"
                    title="Back to app"
                    className="flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white lg:justify-start">
                    <ArrowLeft className="h-5 w-5" />
                    <span className="hidden lg:inline">Back to app</span>
                </Link>
                <button
                    onClick={onLogout}
                    title="Log out"
                    className="flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-red-500/20 hover:text-white lg:justify-start">
                    <LogOut className="h-5 w-5" />
                    <span className="hidden lg:inline">Log out</span>
                </button>
            </div>
        </aside>
    )
}

/** Phone-only horizontal tabs for the admin console. */
export function AdminTabs({ user }: { user: AuthUser }) {
    const pathname = usePathname()
    return (
        <nav className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 border-b border-line bg-surface md:hidden">
            <ul className="flex gap-1 overflow-x-auto px-3 py-2">
                <li>
                    <Link href="/home" className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-muted">
                        <ArrowLeft className="h-4 w-4" /> App
                    </Link>
                </li>
                {adminNavFor(user).map(({ href, label, Icon }) => (
                    <li key={href}>
                        <Link
                            href={href}
                            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                                isActive(pathname, href) ? 'bg-primary-mint text-primary-deep' : 'text-muted'
                            }`}>
                            <Icon className="h-4 w-4" /> {label}
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    )
}
