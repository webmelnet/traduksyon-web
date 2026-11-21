'use client'

import Link from 'next/link'
import { Lock, Mail } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import AuthShell from '@/app/(auth)/AuthShell'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import axios, { csrf } from '@/lib/axios'
import type { FieldErrors } from '@/types'

/** Invitation flow (admin-created users) — same endpoints as winv: /api/verify-invitation + /api/set-password. */
export default function SetPasswordPage() {
    const { token } = useParams<{ token: string }>()
    const router = useRouter()

    const [state, setState] = useState<'checking' | 'valid' | 'invalid'>('checking')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [errors, setErrors] = useState<FieldErrors>({})
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        csrf()
            .then(() => axios.post(`/api/verify-invitation/${token}`))
            .then(res => {
                setEmail(res.data.email)
                setState('valid')
            })
            .catch(() => setState('invalid'))
    }, [token])

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrors({})
        try {
            await csrf()
            await axios.post('/api/set-password', { token, password, password_confirmation: confirm })
            router.push('/login?passwordSet=1')
        } catch (err: any) {
            if (err.response?.status === 422) setErrors(err.response.data.errors)
            else setErrors({ password: [err.response?.data?.message || 'Unable to set your password.'] })
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthShell title="Welcome to Traduksyon.com" subtitle="Set a password to activate your account.">
            {state === 'checking' && (
                <div className="flex justify-center py-6">
                    <Spinner />
                </div>
            )}
            {state === 'invalid' && (
                <div className="space-y-4">
                    <Alert tone="error">This invitation link is invalid or has expired (links are valid for 48 hours). Ask your administrator to resend it.</Alert>
                    <Link href="/login" className="block text-center text-sm font-semibold text-primary">
                        Go to log in
                    </Link>
                </div>
            )}
            {state === 'valid' && (
                <form onSubmit={submit} className="space-y-4" noValidate>
                    <Input id="email" type="email" label="Email" icon={<Mail className="h-4 w-4" />} value={email} disabled />
                    <Input id="password" type="password" label="Password" autoComplete="new-password" icon={<Lock className="h-4 w-4" />} hint="At least 8 characters." value={password} onChange={e => setPassword(e.target.value)} error={errors.password} required autoFocus />
                    <Input id="password_confirmation" type="password" label="Confirm password" autoComplete="new-password" icon={<Lock className="h-4 w-4" />} value={confirm} onChange={e => setConfirm(e.target.value)} error={errors.password_confirmation} required />
                    <Button type="submit" size="lg" block loading={loading}>
                        Set password
                    </Button>
                </form>
            )}
        </AuthShell>
    )
}
