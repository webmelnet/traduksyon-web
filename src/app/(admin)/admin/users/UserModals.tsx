'use client'

import React, { useEffect, useState } from 'react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import axios from '@/lib/axios'
import type { FieldErrors, ManagedUser, Role } from '@/types'
import { formatCredits } from '@/utils/credits'
import { errorMessage } from '@/utils/format'

export function UserFormModal({
    open,
    user,
    roles,
    canAddCredits = false,
    onClose,
    onSaved,
}: {
    open: boolean
    user: ManagedUser | null
    roles: Role[]
    canAddCredits?: boolean
    onClose: () => void
    onSaved: (msg: string) => void
}) {
    const [form, setForm] = useState({ name: '', email: '', roles: ['User'] as string[], is_active: true })
    const [addCredits, setAddCredits] = useState('')
    const [creditNote, setCreditNote] = useState('')
    const showCredits = !!user && canAddCredits && !user.credits.exempt
    const [errors, setErrors] = useState<FieldErrors>({})
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!open) return
        setErrors({})
        setAddCredits('')
        setCreditNote('')
        setForm(user ? { name: user.name, email: user.email, roles: user.roles_list, is_active: user.is_active } : { name: '', email: '', roles: ['User'], is_active: true })
    }, [open, user])

    const toggleRole = (name: string) => setForm(f => ({ ...f, roles: f.roles.includes(name) ? f.roles.filter(r => r !== name) : [...f.roles, name] }))

    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault()
        const credits = showCredits && addCredits.trim() !== '' ? Number(addCredits) : 0
        if (credits && (!Number.isInteger(credits) || credits < 1 || credits > 100000)) {
            setErrors({ credits: ['Enter a whole number from 1 to 100,000.'] })
            return
        }
        setSaving(true)
        setErrors({})
        try {
            if (user) await axios.put(`/api/users/${user.id}`, form)
            else await axios.post('/api/users', form)
        } catch (err: any) {
            if (err.response?.status === 422) setErrors(err.response.data.errors)
            else setErrors({ general: [errorMessage(err)] })
            setSaving(false)
            return
        }
        try {
            // Separate call so the top-up lands in the credit history with its own note.
            if (user && credits) await axios.post(`/api/users/${user.id}/credits`, { amount: credits, note: creditNote.trim() || null })
            onSaved(user ? (credits ? `User updated and ${formatCredits(credits)} added.` : 'User updated.') : 'User created and invitation sent.')
        } catch (err: any) {
            // The user details are already saved at this point; only the top-up failed.
            setErrors({ credits: [`Details saved, but credits were not added: ${errorMessage(err)}`] })
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
                {showCredits && user && (
                    <div className="space-y-3 rounded-xl border border-line px-4 py-3">
                        <div className="text-sm">
                            <span className="block font-medium text-dark">Add credits</span>
                            <span className="block text-muted">
                                Current balance: <strong className="text-dark">{formatCredits(user.credits.balance)}</strong>. Leave blank to keep it as is.
                            </span>
                        </div>
                        <Input id="u-credits" type="number" min={1} max={100000} step={1} label="Credits to add" placeholder="e.g. 100" value={addCredits} onChange={e => setAddCredits(e.target.value)} error={errors.credits} />
                        {addCredits.trim() !== '' && (
                            <Input id="u-credit-note" label="Note (optional)" placeholder="e.g. Council demo, refund for a bad recording" maxLength={150} value={creditNote} onChange={e => setCreditNote(e.target.value)} />
                        )}
                    </div>
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

/** Admin top-up or correction. Recorded in the user's credit history with the note (or a default line). */
export function AdjustCreditsModal({ user, onClose, onSaved }: { user: ManagedUser; onClose: () => void; onSaved: () => void }) {
    const [mode, setMode] = useState<'add' | 'remove'>('add')
    const [amount, setAmount] = useState('100')
    const [note, setNote] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    const submit = async () => {
        const n = Math.abs(Math.trunc(Number(amount)))
        if (!n) return setError('Enter a number of credits.')
        setSaving(true)
        setError(null)
        try {
            await axios.post(`/api/users/${user.id}/credits`, { amount: mode === 'add' ? n : -n, note: note.trim() || null })
            onSaved()
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={`Credits · ${user.name}`}
            size="sm"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={saving} onClick={submit} variant={mode === 'remove' ? 'danger' : 'primary'}>
                        {mode === 'add' ? 'Add credits' : 'Remove credits'}
                    </Button>
                </>
            }>
            <div className="space-y-4">
                <p className="text-sm text-muted">
                    Current balance: <strong className="text-dark">{new Intl.NumberFormat('en-PH').format(user.credits.balance)} credits</strong>. Changes are free and show in the user&apos;s credit history.
                </p>
                <div className="grid grid-cols-2 gap-2">
                    {(['add', 'remove'] as const).map(m => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setMode(m)}
                            className={`rounded-xl border px-3 py-2 text-sm font-medium ${mode === m ? 'border-primary bg-primary-mint/50 text-primary-deep' : 'border-line text-body hover:bg-canvas'}`}>
                            {m === 'add' ? 'Add' : 'Remove'}
                        </button>
                    ))}
                </div>
                <Input id="credits" type="number" min={1} max={100000} label="Credits" value={amount} onChange={e => setAmount(e.target.value)} error={error ?? undefined} />
                <Input id="note" label="Note (optional)" placeholder="e.g. Council demo, refund for a bad recording" maxLength={150} value={note} onChange={e => setNote(e.target.value)} />
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
