import type { AuthUser } from '@/types'

export function hasRole(user: AuthUser | undefined | null, role: string): boolean {
    return !!user?.roles?.some(r => r.name === role)
}

export function isAdmin(user: AuthUser | undefined | null): boolean {
    return hasRole(user, 'Superadmin') || hasRole(user, 'Admin')
}

/** Mirrors winv-web's hasPermission: Superadmin implicitly has everything. */
export function hasPermission(user: AuthUser | undefined | null, permission: string): boolean {
    if (!user) return false
    if (hasRole(user, 'Superadmin')) return true
    return !!user.permissions?.includes(permission)
}
