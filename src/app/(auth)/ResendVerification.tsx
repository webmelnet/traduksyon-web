'use client'

import { MailCheck } from 'lucide-react'
import React, { useState } from 'react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useAuth } from '@/hooks/auth'

/**
 * "Resend confirmation email" used on register (after sign-up), login (unverified sentinel)
 * and /verify-email (expired link). Pass `email` to hide the input.
 */
export default function ResendVerification({ email: fixedEmail, label = 'Resend confirmation email' }: { email?: string; label?: string }) {
    const { resendVerification } = useAuth()
    const [email, setEmail] = useState(fixedEmail || '')
    const [status, setStatus] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    // Simple client-side cooldown so people don't burn the 6/min throttle by double tapping.
    const [cooldown, setCooldown] = useState(false)

    const send = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!email) return setError('Enter your email address.')
        setLoading(true)
        setError(null)
        try {
            setStatus(await resendVerification(email))
            setCooldown(true)
            setTimeout(() => setCooldown(false), 30000)
        } catch (err: any) {
            setError(err?.response?.status === 429 ? 'Too many requests. Please wait a minute and try again.' : 'Unable to send right now. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={send} className="space-y-3" noValidate>
            {status && <Alert tone="success">{status}</Alert>}
            {error && <Alert tone="error">{error}</Alert>}
            {!fixedEmail && (
                <Input id="resend-email" type="email" label="Email" autoComplete="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} required />
            )}
            <Button type="submit" variant="secondary" block loading={loading} disabled={cooldown} icon={<MailCheck className="h-4 w-4" />}>
                {cooldown ? 'Email sent' : label}
            </Button>
        </form>
    )
}
