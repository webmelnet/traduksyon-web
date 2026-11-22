'use client'

import React, { useEffect, useState } from 'react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import axios from '@/lib/axios'
import type { FieldErrors, ManagedUser, Role } from '@/types'
import { errorMessage } from '@/utils/format'

export function UserFormModal({ open, user, roles, onClose, onSaved }: { open: boolean; user: ManagedUser | null; roles: Role[]; onClose: () => void; onSaved: (msg: string) => void }) {
    const [form, setForm] = useState({ name: '', email: '', roles: ['User'] as string[], is_active: true })
    const [errors, setErrors] = useState<FieldErrors>({})
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!open) return
        setErrors({})
        setForm(user ? { name: user.name, email: user.email, roles: user.roles_list, is_active: user.is_active } : { name: '', email: '', roles: ['User'], is_active: true })
    }, [open, user])

    const toggleRole = (name: string) => setForm(f => ({ ...f, roles: f.roles.includes(name) ? f.roles.filter(r => r !== name) : [...f.roles, name] }))

    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault()
        setSaving(true)
        setErrors({})
        try {
            if (user) await axios.put(`/api/users/${user.id}`, form)
            else await axios.post('/api/users', form)
            onSaved(user ? 'User updated.' : 'User created and invitation sent.')
        } catch (err: any) {
            if (err.response?.status === 422) setErrors(err.response.data.errors)
            else setErrors({ general: [errorMessage(err)] })
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={user ? 'Edit user' : 'Add user'}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={saving} onClick={() => submit()}>
                        {user ? 'Save changes' : 'Send invitation'}
                    </Button>
                </>
            }>
            <form onSubmit={submit} className="space-y-4">
                {errors.general && <Alert tone="error">{errors.general[0]}</Alert>}
                {!user && <Alert tone="info">They&apos;ll receive an email with a link to set their password (valid for 48 hours).</Alert>}
                <Input id="u-name" label="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} error={errors.name} autoFocus />
                <Input id="u-email" type="email" label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} error={errors.email} />
                <div>
                    <div className="mb-1.5 text-sm font-medium text-body">Roles</div>
                    <div className="flex flex-wrap gap-2">
                        {roles.map(r => (
                            <label key={r.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${form.roles.includes(r.name) ? 'border-primary bg-primary-mint/40 text-primary-deep' : 'border-line'}`}>
                                <input type="checkbox" className="rounded text-primary focus:ring-primary" checked={form.roles.includes(r.name)} onChange={() => toggleRole(r.name)} />
                                {r.name}
                            </label>
                        ))}
                    </div>
                    {errors.roles && <p className="mt-1.5 text-xs text-danger">{errors.roles[0]}</p>}
                </div>
                {user && (
                    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line px-4 py-3 text-sm">
                        <span>
                            <span className="block font-medium text-dark">Active</span>
                            <span className="block text-muted">Inactive users cannot log in.</span>
                        </span>
                        <input type="checkbox" className="h-5 w-5 rounded text-primary focus:ring-primary" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                    </label>
                )}
            </form>
        </Modal>
    )
}

export function ResetPasswordModal({ user, onClose, onSaved }: { user: ManagedUser; onClose: () => void; onSaved: () => void }) {
    const [password, setPassword] = useState('')
    const [repassword, setRepassword] = useState('')
    const [errors, setErrors] = useState<FieldErrors>({})
    const [saving, setSaving] = useState(false)

    const submit = async () => {
        setSaving(true)
        setErrors({})
        try {
            await axios.post(`/api/users/${user.id}/reset-password`, { password, repassword })
            onSaved()
        } catch (err: any) {
            if (err.response?.status === 422) setErrors(err.response.data.errors)
            else setErrors({ password: [errorMessage(err)] })
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={`Reset password · ${user.name}`}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={saving} onClick={submit}>
                        Reset & email
                    </Button>
                </>
            }>
            <div className="space-y-4">
                <p className="text-sm text-muted">The new password will be emailed to {user.email}.</p>
                <Input id="rp" type="password" label="New password" value={password} onChange={e => setPassword(e.target.value)} error={errors.password} autoFocus />
                <Input id="rp2" type="password" label="Confirm password" value={repassword} onChange={e => setRepassword(e.target.value)} error={errors.repassword} />
            </div>
        </Modal>
    )
}

export function ExtendTrialModal({ user, onClose, onSaved }: { user: ManagedUser; onClose: () => void; onSaved: () => void }) {
    const [days, setDays] = useState('14')
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    const submit = async () => {
        setSaving(true)
        setError(null)
        try {
            await axios.post(`/api/users/${user.id}/extend-access`, { days: Number(days) })
            onSaved()
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    const target = user.subscription.status === 'active' ? 'paid subscription' : 'free trial'
    return (
        <Modal
            open
            onClose={onClose}
            title={`Extend access · ${user.name}`}
            size="sm"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={saving} onClick={submit}>
                        Extend
                    </Button>
                </>
            }>
            <div className="space-y-4">
                <p className="text-sm text-muted">Adds days to this user&apos;s {target} at no charge. If it has already ended, the days count from today.</p>
                <Input id="days" type="number" min={1} max={365} label="Days to add" value={days} onChange={e => setDays(e.target.value)} error={error ?? undefined} />
            </div>
        </Modal>
    )
}

export function ConfirmModal({ title, children, confirmLabel, danger, onClose, onConfirm }: { title: string; children: React.ReactNode; confirmLabel: string; danger?: boolean; onClose: () => void; onConfirm: () => Promise<void> }) {
    const [busy, setBusy] = useState(false)
    return (
        <Modal
            open
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant={danger ? 'danger' : 'primary'}
                        loading={busy}
                        onClick={async () => {
                            setBusy(true)
                            await onConfirm()
                            setBusy(false)
                        }}>
                        {confirmLabel}
                    </Button>
                </>
            }>
            <p className="text-sm text-body">{children}</p>
        </Modal>
    )
}
