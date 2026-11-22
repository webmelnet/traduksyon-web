import { ClipboardList, Coins, FileText, Home, Languages, ScrollText, Settings, ShieldCheck } from 'lucide-react'
import type { AuthUser } from '@/types'
import { canUseAdmin } from '@/components/admin/nav'

export interface NavItem {
    href: string
    label: string
    Icon: any
    /** Shown in the phone bottom bar (max 4, as in the mobile mockup). */
    mobile?: boolean
    visible?: (user: AuthUser) => boolean
}

/** Customer workspace nav (the (app) shell). Admin pages: components/admin/nav.ts. */
export const NAV_ITEMS: NavItem[] = [
    { href: '/home', label: 'Home', Icon: Home, mobile: true },
    { href: '/meetings', label: 'My meetings', Icon: FileText, mobile: true },
    { href: '/minutes', label: 'Minutes', Icon: ClipboardList },
    { href: '/reports', label: 'Committee reports', Icon: ScrollText },
    { href: '/translate', label: 'Translate', Icon: Languages, mobile: true },
    { href: '/billing', label: 'Credits', Icon: Coins },
    { href: '/settings', label: 'Settings', Icon: Settings, mobile: true },
    // Admin pages live in their own shell, (admin)/admin/*. Customers never see this link.
    { href: '/admin', label: 'Admin console', Icon: ShieldCheck, visible: canUseAdmin },
]

export const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + '/')
