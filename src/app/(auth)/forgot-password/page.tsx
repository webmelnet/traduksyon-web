'use client'

import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'
import React, { useState } from 'react'
import AuthShell from '@/app/(auth)/AuthShell'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useAuth } from '@/hooks/auth'
import type { FieldErrors } from '@/types'

export default function ForgotPasswordPage() {
    const { forgotPassword } = useAuth({ middleware: 'guest', redirectIfAuthenticated: '/home' })

    const [email, setEmail] = useState('')
    const [errors, setErrors] = useState<FieldErrors>({})
    const [status, setStatus] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await forgotPassword({ email, setErrors, setStatus })
        } catch {
            setErrors({ email: ['Unable to reach the server. Please try again.'] })
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthShell
            title="Forgot your password?"
            subtitle="Enter your email and we'll send you a link to choose a new one."
            footer={
                <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:text-primary-hover">
                    <ArrowLeft className="h-4 w-4" /> Back to log in
                </Link>
            }>
            <form onSubmit={submit} className="space-y-4" noValidate>
                {status && <Alert tone="success">{status}</Alert>}
                <Input id="email" type="email" label="Email" autoComplete="email" inputMode="email" icon={<Mail className="h-4 w-4" />} value={email} onChange={e => setEmail(e.target.value)} error={errors.email} required autoFocus />
                <Button type="submit" size="lg" block loading={loading}>
                    Email reset link
                </Button>
            </form>
        </AuthShell>
    )
}
