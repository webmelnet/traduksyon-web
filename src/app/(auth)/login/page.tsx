'use client'

import Link from 'next/link'
import { Lock, Mail } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import AuthShell from '@/app/(auth)/AuthShell'
import ResendVerification from '@/app/(auth)/ResendVerification'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FullPageLoader } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/auth'
import type { FieldErrors } from '@/types'

export default function LoginPage() {
    const { login, user } = useAuth({ middleware: 'guest', redirectIfAuthenticated: '/home' })

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [remember, setRemember] = useState(false)
    const [errors, setErrors] = useState<FieldErrors>({})
    const [status, setStatus] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const reset = params.get('reset')
        if (reset) {
            try {
                setStatus(atob(reset))
            } catch {
                /* ignore malformed */
            }
        }
        if (params.get('passwordSet')) setStatus('Your password has been set. You can now log in.')
        if (params.get('verified')) setStatus('Your email is confirmed. Log in to use your free credits.')
    }, [])

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await login({ email, password, remember, setErrors, setStatus })
        } catch {
            setErrors({ email: ['Unable to reach the server. Please try again.'] })
        } finally {
            setLoading(false)
        }
    }

    if (user) return <FullPageLoader />

    // LoginRequest returns "deleted" / "inactive" / "unverified" as sentinel messages (same idea as winv-api).
    const emailError = errors.email?.[0]
    const deleted = emailError === 'deleted'
    const inactive = emailError === 'inactive'
    const unverified = emailError === 'unverified'

    return (
        <AuthShell
            title="Welcome back"
            subtitle="Log in to continue to Traduksyon.com"
            footer={
                <>
                    New to Traduksyon?{' '}
                    <Link href="/register" className="font-semibold text-primary hover:text-primary-hover">
                        Sign up and get free credits
                    </Link>
                </>
            }>
            <form onSubmit={submit} className="space-y-4" noValidate>
                {status && <Alert tone="success">{status}</Alert>}
                {deleted && <Alert tone="error">This account has been deleted. Contact your administrator if you think this is a mistake.</Alert>}
                {inactive && <Alert tone="error">This account has been deactivated. Contact your administrator.</Alert>}
                {unverified && (
                    <Alert tone="warning">Please confirm your email first. We sent a link to {email} when you signed up.</Alert>
                )}

                <Input
                    id="email"
                    type="email"
                    label="Email"
                    autoComplete="email"
                    inputMode="email"
                    icon={<Mail className="h-4 w-4" />}
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    error={deleted || inactive || unverified ? undefined : errors.email}
                    required
                    autoFocus
                />
                <Input
                    id="password"
                    type="password"
                    label="Password"
                    autoComplete="current-password"
                    icon={<Lock className="h-4 w-4" />}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    error={errors.password}
                    required
                />

                <div className="flex items-center justify-between text-sm">
                    <label className="flex cursor-pointer items-center gap-2 text-body">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
                            checked={remember}
                            onChange={e => setRemember(e.target.checked)}
                        />
                        Remember me
                    </label>
                    <Link href="/forgot-password" className="font-medium text-primary hover:text-primary-hover">
                        Forgot password?
                    </Link>
                </div>

                <Button type="submit" size="lg" block loading={loading}>
                    Log in
                </Button>
            </form>
            {unverified && (
                <div className="mt-4">
                    <ResendVerification key={email} email={email} />
                </div>
            )}
        </AuthShell>
    )
}
