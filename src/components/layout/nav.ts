import { ClipboardList, CreditCard, FileText, Home, Languages, Receipt, ScrollText, Settings, Users } from 'lucide-react'
import type { AuthUser } from '@/types'
import { hasPermission } from '@/utils/permissions'

export interface NavItem {
    href: string
    label: string
    Icon: any
    /** Shown in the phone bottom bar (max 4, as in the mobile mockup). */
    mobile?: boolean
    visible?: (user: AuthUser) => boolean
}

export const NAV_ITEMS: NavItem[] = [
    { href: '/home', label: 'Home', Icon: Home, mobile: true },
    { href: '/meetings', label: 'My meetings', Icon: FileText, mobile: true },
    { href: '/minutes', label: 'Minutes', Icon: ClipboardList },
    { href: '/reports', label: 'Committee reports', Icon: ScrollText },
    { href: '/translate', label: 'Translate', Icon: Languages, mobile: true },
    { href: '/billing', label: 'Subscription', Icon: CreditCard },
    { href: '/users', label: 'Users', Icon: Users, visible: u => hasPermission(u, 'users.access') },
    { href: '/payments', label: 'Payments', Icon: Receipt, visible: u => hasPermission(u, 'billing.view_all_payments') },
    { href: '/settings', label: 'Settings', Icon: Settings, mobile: true },
]

export const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + '/')
