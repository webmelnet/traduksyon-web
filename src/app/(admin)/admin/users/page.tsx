'use client'

import useSWR from 'swr'
import { Coins, KeyRound, MoreVertical, Pencil, RotateCcw, Search, Send, Trash2, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/hooks/auth'
import axios from '@/lib/axios'
import type { CreditState, ManagedUser, Paginated, Role } from '@/types'
import { errorMessage, formatDate, initials } from '@/utils/format'
import { hasPermission } from '@/utils/permissions'
import { AdjustCreditsModal, ConfirmModal, ResetPasswordModal, UserFormModal } from './UserModals'

const fetcher = (url: string) => axios.get(url).then(r => r.data)

type Dialog =
    | { kind: 'create' }
    | { kind: 'edit'; user: ManagedUser }
    | { kind: 'reset'; user: ManagedUser }
    | { kind: 'credits'; user: ManagedUser }
    | { kind: 'delete' | 'force' | 'restore' | 'resend'; user: ManagedUser }
    | null

export default function UsersPage() {
    const { user: me } = useAuth()
    const router = useRouter()
    const { toast } = useToast()

    const [search, setSearch] = useState('')
    const [debounced, setDebounced] = useState('')
    const [role, setRole] = useState('')
    const [tab, setTab] = useState<'active' | 'trashed'>('active')
    const [page, setPage] = useState(1)
    const [dialog, setDialog] = useState<Dialog>(null)

    useEffect(() => {
        const t = setTimeout(() => {
            setDebounced(search)
            setPage(1)
        }, 300)
        return () => clearTimeout(t)
    }, [search])

    const canAccess = hasPermission(me, 'users.access')
    useEffect(() => {
        if (me && !canAccess) router.replace('/admin')
    }, [me, canAccess, router])

    const query = new URLSearchParams({ search: debounced, role, status: tab, page: String(page) }).toString()
    const { data, error, isLoading, mutate } = useSWR<Paginated<ManagedUser>>(canAccess ? `/api/users?${query}` : null, fetcher, { keepPreviousData: true })
    const { data: roles } = useSWR<Role[]>(canAccess ? '/api/roles' : null, fetcher)

    if (!me || !canAccess) return null

    const can = (p: string) => hasPermission(me, p)

    const runAction = async (fn: () => Promise<any>, success: string) => {
        try {
            await fn()
            toast(success)
            setDialog(null)
            mutate()
        } catch (err) {
            toast(errorMessage(err), 'error')
        }
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Users</h1>
                    <p className="mt-1 text-muted">Invite people and manage their access.</p>
                </div>
                {can('users.add_new_user') && (
                    <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setDialog({ kind: 'create' })}>
                        Add user
                    </Button>
                )}
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="inline-flex rounded-xl border border-line bg-white p-1 text-sm">
                    {(['active', 'trashed'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => {
                                setTab(t)
                                setPage(1)
                            }}
                            className={`rounded-lg px-4 py-1.5 font-medium ${tab === t ? 'bg-primary text-white' : 'text-muted hover:text-body'}`}>
                            {t === 'active' ? 'Users' : 'Deleted'}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search name or email"
                        className="h-11 w-full rounded-xl border-line pl-10 text-sm focus:border-primary focus:ring-4 focus:ring-primary/15"
                    />
                </div>
                <select
                    value={role}
                    onChange={e => {
                        setRole(e.target.value)
                        setPage(1)
                    }}
                    className="h-11 rounded-xl border-line text-sm focus:border-primary focus:ring-4 focus:ring-primary/15 md:w-48">
                    <option value="">All roles</option>
                    {roles?.map(r => (
                        <option key={r.id} value={r.name}>
                            {r.name}
                        </option>
                    ))}
                </select>
            </div>

            {error && <Alert tone="error">{errorMessage(error, 'Unable to load users.')}</Alert>}

            <Card className="overflow-hidden">
                {isLoading && !data ? (
                    <div className="flex justify-center py-16">
                        <Spinner className="h-6 w-6" />
                    </div>
                ) : !data?.data.length ? (
                    <div className="px-5 py-12 text-center text-sm text-muted">No users found.</div>
                ) : (
                    <>
                        <ul className="divide-y divide-line md:hidden">
                            {data.data.map(u => (
                                <li key={u.id} className="flex items-start gap-3 px-4 py-4">
                                    <Avatar name={u.name} />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-semibold text-dark">{u.name}</div>
                                        <div className="truncate text-sm text-muted">{u.email}</div>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {u.roles_list.map(r => (
                                                <Badge key={r} tone="teal">
                                                    {r}
                                                </Badge>
                                            ))}
                                            <UserStatus user={u} />
                                            <CreditBadge credits={u.credits} />
                                        </div>
                                    </div>
                                    <RowActions user={u} me={me.id} tab={tab} can={can} onPick={setDialog} />
                                </li>
                            ))}
                        </ul>
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-sm">
                                <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-muted">
                                    <tr>
                                        <th className="px-5 py-3">User</th>
                                        <th className="px-5 py-3">Roles</th>
                                        <th className="px-5 py-3">Status</th>
                                        <th className="px-5 py-3">Credits</th>
                                        <th className="px-5 py-3">{tab === 'trashed' ? 'Deleted' : 'Last login'}</th>
                                        <th className="w-12 px-5 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                    {data.data.map(u => (
                                        <tr key={u.id} className="hover:bg-canvas/60">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={u.name} />
                                                    <div className="min-w-0">
                                                        <div className="truncate font-semibold text-dark">{u.name}</div>
                                                        <div className="truncate text-muted">{u.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {u.roles_list.map(r => (
                                                        <Badge key={r} tone="teal">
                                                            {r}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <UserStatus user={u} />
                                            </td>
                                            <td className="px-5 py-3">
                                                <CreditBadge credits={u.credits} />
                                            </td>
                                            <td className="px-5 py-3 text-muted">{formatDate(tab === 'trashed' ? u.deleted_at : u.last_login_at)}</td>
                                            <td className="px-5 py-3">
                                                <RowActions user={u} me={me.id} tab={tab} can={can} onPick={setDialog} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Card>

            {data && data.last_page > 1 && (
                <div className="flex items-center justify-between text-sm text-muted">
                    <span>
                        Page {data.current_page} of {data.last_page} · {data.total} users
                    </span>
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                            Previous
                        </Button>
                        <Button size="sm" variant="secondary" disabled={page >= data.last_page} onClick={() => setPage(p => p + 1)}>
                            Next
                        </Button>
                    </div>
                </div>
            )}

            <UserFormModal
                open={dialog?.kind === 'create' || dialog?.kind === 'edit'}
                user={dialog?.kind === 'edit' ? dialog.user : null}
                roles={roles ?? []}
                onClose={() => setDialog(null)}
                onSaved={msg => {
                    toast(msg)
                    setDialog(null)
                    mutate()
                }}
            />
            {dialog?.kind === 'reset' && (
                <ResetPasswordModal
                    user={dialog.user}
                    onClose={() => setDialog(null)}
                    onSaved={() => {
                        toast('Password reset and emailed to the user.')
                        setDialog(null)
                    }}
                />
            )}
            {dialog?.kind === 'credits' && (
                <AdjustCreditsModal
                    user={dialog.user}
                    onClose={() => setDialog(null)}
                    onSaved={() => {
                        toast('Credits updated.')
                        setDialog(null)
                        mutate()
                    }}
                />
            )}
            {dialog?.kind === 'delete' && (
                <ConfirmModal title="Delete user" confirmLabel="Delete" danger onClose={() => setDialog(null)} onConfirm={() => runAction(() => axios.delete(`/api/users/${dialog.user.id}`), 'User deleted.')}>
                    Delete <strong>{dialog.user.name}</strong>? They will no longer be able to log in. You can restore them from the Deleted tab.
                </ConfirmModal>
            )}
            {dialog?.kind === 'force' && (
                <ConfirmModal title="Delete permanently" confirmLabel="Delete permanently" danger onClose={() => setDialog(null)} onConfirm={() => runAction(() => axios.delete(`/api/users/${dialog.user.id}/force`), 'User permanently deleted.')}>
                    Permanently delete <strong>{dialog.user.name}</strong> and their payment history? This cannot be undone.
                </ConfirmModal>
            )}
            {dialog?.kind === 'restore' && (
                <ConfirmModal title="Restore user" confirmLabel="Restore" onClose={() => setDialog(null)} onConfirm={() => runAction(() => axios.post(`/api/users/${dialog.user.id}/restore`), 'User restored.')}>
                    Restore <strong>{dialog.user.name}</strong>? They will be able to log in again.
                </ConfirmModal>
            )}
            {dialog?.kind === 'resend' && (
                <ConfirmModal title="Resend invitation" confirmLabel="Resend" onClose={() => setDialog(null)} onConfirm={() => runAction(() => axios.post(`/api/users/${dialog.user.id}/resend-invitation`), 'Invitation sent.')}>
                    Send a new set-password link to <strong>{dialog.user.email}</strong>? Previous links stop working.
                </ConfirmModal>
            )}
        </div>
    )
}

function Avatar({ name }: { name: string }) {
    return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-mint text-sm font-bold text-primary-deep">{initials(name)}</span>
}

function UserStatus({ user }: { user: ManagedUser }) {
    if (user.deleted_at) return <Badge tone="red">Deleted</Badge>
    if (user.invitation_pending) return <Badge tone="amber">Invited</Badge>
    return user.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Inactive</Badge>
}

function CreditBadge({ credits }: { credits: CreditState }) {
    if (credits.exempt) return <Badge tone="purple">Staff</Badge>
    const n = new Intl.NumberFormat('en-PH').format(credits.balance)
    return <Badge tone={credits.balance <= 0 ? 'red' : credits.low ? 'amber' : 'green'}>{n} credits</Badge>
}

function RowActions({ user, me, tab, can, onPick }: { user: ManagedUser; me: number; tab: 'active' | 'trashed'; can: (p: string) => boolean; onPick: (d: Dialog) => void }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    const items: { label: string; Icon: any; d: Dialog; danger?: boolean }[] = []
    if (tab === 'active') {
        if (can('users.edit_user')) items.push({ label: 'Edit', Icon: Pencil, d: { kind: 'edit', user } })
        if (can('users.edit_user') && user.invitation_pending) items.push({ label: 'Resend invitation', Icon: Send, d: { kind: 'resend', user } })
        if (can('users.edit_user')) items.push({ label: 'Reset password', Icon: KeyRound, d: { kind: 'reset', user } })
        if (can('users.manage_subscription') && !user.credits.exempt) items.push({ label: 'Add / remove credits', Icon: Coins, d: { kind: 'credits', user } })
        if (can('users.delete_user') && user.id !== me) items.push({ label: 'Delete', Icon: Trash2, d: { kind: 'delete', user }, danger: true })
    } else if (can('users.delete_user')) {
        items.push({ label: 'Restore', Icon: RotateCcw, d: { kind: 'restore', user } })
        items.push({ label: 'Delete permanently', Icon: Trash2, d: { kind: 'force', user }, danger: true })
    }
    if (!items.length) return null

    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setOpen(o => !o)} className="rounded-lg p-2 text-muted hover:bg-canvas" aria-label="Actions">
                <MoreVertical className="h-5 w-5" />
            </button>
            {open && (
                <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-line bg-surface py-1 text-sm shadow-lg">
                    {items.map(({ label, Icon, d, danger }) => (
                        <button
                            key={label}
                            onClick={() => {
                                setOpen(false)
                                onPick(d)
                            }}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${danger ? 'text-danger hover:bg-red-50' : 'text-body hover:bg-canvas'}`}>
                            <Icon className="h-4 w-4" /> {label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
