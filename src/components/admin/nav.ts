import { Globe, Inbox, Receipt, Users } from 'lucide-react'
import type { AuthUser } from '@/types'
import { hasPermission } from '@/utils/permissions'

export interface AdminNavItem {
    href: string
    label: string
    Icon: any
    permission: string
}

/** Admin console (/admin/*). Each page is shown only with its permission (Superadmin has all). */
export const ADMIN_NAV: AdminNavItem[] = [
    { href: '/admin/website', label: 'Website content', Icon: Globe, permission: 'website.manage' },
    { href: '/admin/inquiries', label: 'Inquiries', Icon: Inbox, permission: 'website.manage' },
    { href: '/admin/users', label: 'Users', Icon: Users, permission: 'users.access' },
    { href: '/admin/payments', label: 'Payments', Icon: Receipt, permission: 'billing.view_all_payments' },
]

export const adminNavFor = (user: AuthUser | undefined | null) => ADMIN_NAV.filter(i => hasPermission(user, i.permission))

/** True if the user can open at least one admin page. Customers (role User) never can. */
export const canUseAdmin = (user: AuthUser | undefined | null) => adminNavFor(user).length > 0
