'use client'

import Link from 'next/link'
import { Lock, Mail } from 'lucide-react'
import { useParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import AuthShell from '@/app/(auth)/AuthShell'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/auth'
import type { FieldErrors } from '@/types'

export default function PasswordResetPage() {
    const params = useParams<{ token: string }>()
    const { resetPassword, validateResetToken } = useAuth({ middleware: 'guest', redirectIfAuthenticated: '/home' })

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [errors, setErrors] = useState<FieldErrors>({})
    const [status, setStatus] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [tokenState, setTokenState] = useState<'checking' | 'valid' | 'invalid'>('checking')

    useEffect(() => {
        const e = new URLSearchParams(window.location.search).get('email') || ''
        setEmail(e)
        if (!e) return setTokenState('invalid')
        validateResetToken(params.token, e).then(ok => setTokenState(ok ? 'valid' : 'invalid'))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.token])

    const submit = async (ev: React.FormEvent) => {
        ev.preventDefault()
        setLoading(true)
        try {
            await resetPassword({ token: params.token, email, password, password_confirmation: confirm, setErrors, setStatus })
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthShell title="Choose a new password" subtitle="Make it at least 8 characters.">
            {tokenState === 'checking' && (
                <div className="flex justify-center py-6">
                    <Spinner />
                </div>
            )}
            {tokenState === 'invalid' && (
                <div className="space-y-4">
                    <Alert tone="error">This password reset link is invalid or has expired.</Alert>
                    <Link href="/forgot-password">
                        <Button block size="lg">
                            Request a new link
                        </Button>
                    </Link>
                </div>
            )}
            {tokenState === 'valid' && (
                <form onSubmit={submit} className="space-y-4" noValidate>
                    {status && <Alert tone="success">{status}</Alert>}
                    <Input id="email" type="email" label="Email" icon={<Mail className="h-4 w-4" />} value={email} disabled error={errors.email} />
                    <Input id="password" type="password" label="New password" autoComplete="new-password" icon={<Lock className="h-4 w-4" />} value={password} onChange={e => setPassword(e.target.value)} error={errors.password} required autoFocus />
                    <Input id="password_confirmation" type="password" label="Confirm new password" autoComplete="new-password" icon={<Lock className="h-4 w-4" />} value={confirm} onChange={e => setConfirm(e.target.value)} error={errors.password_confirmation} required />
                    <Button type="submit" size="lg" block loading={loading}>
                        Reset password
                    </Button>
                </form>
            )}
        </AuthShell>
    )
}
