'use client'

import Link from 'next/link'
import { CircleUserRound, CreditCard, LogOut, Settings, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { LogoMark } from '@/components/Logo'
import type { AuthUser } from '@/types'
import { initials } from '@/utils/format'
import { hasPermission } from '@/utils/permissions'

export default function Header({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    return (
        <header className="pt-safe sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6">
                {/* Phones: compact brand like the mockup. md+: the sidebar already shows the logo. */}
                <Link href="/home" className="flex items-center gap-2.5 md:hidden">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-card">
                        <LogoMark size={28} />
                    </span>
                    <span className="text-lg font-bold text-dark">Traduksyon</span>
                </Link>
                <div className="hidden md:block" />

                <div className="relative" ref={ref}>
                    <button
                        onClick={() => setOpen(o => !o)}
                        className="flex items-center gap-2 rounded-full p-1 text-muted hover:bg-white"
                        aria-label="Account menu">
                        <span className="hidden text-right text-sm sm:block">
                            <span className="block font-semibold text-dark">{user.name}</span>
                            <span className="block text-xs text-muted">{user.role}</span>
                        </span>
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-mint text-sm font-bold text-primary-deep">
                            {initials(user.name) || <CircleUserRound />}
                        </span>
                    </button>
                    {open && (
                        <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
                            <div className="border-b border-line px-4 py-3">
                                <div className="truncate text-sm font-semibold text-dark">{user.name}</div>
                                <div className="truncate text-xs text-muted">{user.email}</div>
                            </div>
                            <div className="py-1 text-sm" onClick={() => setOpen(false)}>
                                <MenuLink href="/settings" Icon={Settings} label="Settings" />
                                <MenuLink href="/billing" Icon={CreditCard} label="Subscription" />
                                {hasPermission(user, 'users.access') && <MenuLink href="/users" Icon={Users} label="Users" />}
                                <button onClick={onLogout} className="flex w-full items-center gap-3 px-4 py-2.5 text-danger hover:bg-red-50">
                                    <LogOut className="h-4 w-4" /> Log out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}

function MenuLink({ href, Icon, label }: { href: string; Icon: any; label: string }) {
    return (
        <Link href={href} className="flex items-center gap-3 px-4 py-2.5 text-body hover:bg-canvas">
            <Icon className="h-4 w-4 text-muted" /> {label}
        </Link>
    )
}
