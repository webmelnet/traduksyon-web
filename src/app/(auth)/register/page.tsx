'use client'

import Link from 'next/link'
import { CheckCircle2, Lock, Mail, MailCheck, User } from 'lucide-react'
import React, { useState } from 'react'
import AuthShell from '@/app/(auth)/AuthShell'
import ResendVerification from '@/app/(auth)/ResendVerification'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { FullPageLoader } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/auth'
import type { FieldErrors } from '@/types'

export default function RegisterPage() {
    const { register, user } = useAuth({ middleware: 'guest', redirectIfAuthenticated: '/home' })

    const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' })
    const [errors, setErrors] = useState<FieldErrors>({})
    const [loading, setLoading] = useState(false)
    // Set once the account exists: show "check your inbox" instead of the form.
    const [sentTo, setSentTo] = useState<string | null>(null)

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value }))

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const email = await register({ ...form, setErrors })
            if (email) setSentTo(email)
        } catch {
            setErrors({ email: ['Unable to reach the server. Please try again.'] })
        } finally {
            setLoading(false)
        }
    }

    if (user) return <FullPageLoader />

    if (sentTo) {
        return (
            <AuthShell
                title="Check your inbox"
                subtitle="One more step before you get your free credits."
                footer={
                    <>
                        Already confirmed?{' '}
                        <Link href="/login" className="font-semibold text-primary hover:text-primary-hover">
                            Log in
                        </Link>
                    </>
                }>
                <div className="space-y-5">
                    <div className="flex flex-col items-center gap-3 rounded-2xl bg-primary-mint/40 px-4 py-6 text-center">
                        <div className="rounded-full bg-white p-3 text-primary shadow-sm">
                            <MailCheck className="h-7 w-7" />
                        </div>
                        <p className="text-sm text-body">
                            We sent a confirmation link to <strong className="break-all text-dark">{sentTo}</strong>. Click it to activate your account, then log in.
                        </p>
                    </div>
                    <p className="text-center text-xs text-muted">Didn&apos;t get it? Check your spam folder, or send it again.</p>
                    <ResendVerification email={sentTo} />
                </div>
            </AuthShell>
        )
    }

    return (
        <AuthShell
            title="Create your account"
            subtitle={
                <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-success" /> 14 days free · No card required
                </span>
            }
            footer={
                <>
                    Already have an account?{' '}
                    <Link href="/login" className="font-semibold text-primary hover:text-primary-hover">
                        Log in
                    </Link>
                </>
            }>
            <form onSubmit={submit} className="space-y-4" noValidate>
                <Input id="name" label="Full name" autoComplete="name" icon={<User className="h-4 w-4" />} value={form.name} onChange={set('name')} error={errors.name} required autoFocus />
                <Input id="email" type="email" label="Email" autoComplete="email" inputMode="email" icon={<Mail className="h-4 w-4" />} value={form.email} onChange={set('email')} error={errors.email} required />
                <Input id="password" type="password" label="Password" autoComplete="new-password" icon={<Lock className="h-4 w-4" />} hint="At least 8 characters." value={form.password} onChange={set('password')} error={errors.password} required />
                <Input id="password_confirmation" type="password" label="Confirm password" autoComplete="new-password" icon={<Lock className="h-4 w-4" />} value={form.password_confirmation} onChange={set('password_confirmation')} error={errors.password_confirmation} required />
                <Button type="submit" size="lg" block loading={loading}>
                    Create account
                </Button>
            </form>
        </AuthShell>
    )
}
