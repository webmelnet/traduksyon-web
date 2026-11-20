'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Logo, TAGLINE } from '@/components/Logo'
import type { AuthUser } from '@/types'
import { NAV_ITEMS, isActive } from './nav'

/** md: icon rail, lg+: full sidebar. Hidden on phones (bottom nav instead). */
export default function Sidebar({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
    const pathname = usePathname()
    const items = NAV_ITEMS.filter(i => !i.visible || i.visible(user))

    return (
        <aside className="sticky top-0 hidden h-[100dvh] shrink-0 flex-col border-r border-line bg-surface md:flex md:w-20 lg:w-64">
            <div className="flex h-16 items-center justify-center px-4 lg:justify-start lg:px-5">
                <Link href="/home" className="hidden lg:block">
                    <Logo size={34} />
                </Link>
                <Link href="/home" className="lg:hidden">
                    <Logo size={34} className="[&>div:last-child]:hidden" />
                </Link>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                {items.map(({ href, label, Icon }) => {
                    const active = isActive(pathname, href)
                    return (
                        <Link
                            key={href}
                            href={href}
                            title={label}
                            className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition lg:justify-start ${
                                active ? 'bg-primary-mint/70 text-primary-deep' : 'text-muted hover:bg-canvas hover:text-body'
                            }`}>
                            <Icon className="h-5 w-5 shrink-0" />
                            <span className="hidden lg:inline">{label}</span>
                        </Link>
                    )
                })}
            </nav>
            <div className="border-t border-line p-3">
                <p className="mb-3 hidden px-2 text-[11px] leading-snug text-muted lg:block">{TAGLINE}</p>
                <button
                    onClick={onLogout}
                    title="Log out"
                    className="flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-red-50 hover:text-danger lg:justify-start">
                    <LogOut className="h-5 w-5" />
                    <span className="hidden lg:inline">Log out</span>
                </button>
            </div>
        </aside>
    )
}
