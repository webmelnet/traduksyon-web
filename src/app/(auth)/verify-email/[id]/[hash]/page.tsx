'use client'

import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import AuthShell from '@/app/(auth)/AuthShell'
import ResendVerification from '@/app/(auth)/ResendVerification'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/hooks/auth'

/**
 * Target of the sign-up confirmation email: /verify-email/{id}/{hash}?expires=…&signature=…
 * Forwards the same path + query to the API (GET /email/verify/…, signed:relative), then sends
 * the user to log in. Not guest-only: a signed-in admin opening someone's link shouldn't be bounced.
 */
export default function VerifyEmailPage() {
    const params = useParams<{ id: string; hash: string }>()
    const { verifyEmail } = useAuth()
    const [state, setState] = useState<'checking' | 'verified' | 'already-verified' | 'invalid'>('checking')
    const ran = useRef(false)

    useEffect(() => {
        if (ran.current) return // StrictMode double-invokes effects in dev; the link only needs one call.
        ran.current = true
        verifyEmail(`/${params.id}/${params.hash}${window.location.search}`).then(setState)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const done = state === 'verified' || state === 'already-verified'

    return (
        <AuthShell
            title={state === 'invalid' ? 'Link expired' : done ? 'Email confirmed' : 'Confirming your email'}
            subtitle={state === 'invalid' ? 'Request a new confirmation link below.' : undefined}
            footer={
                <Link href="/login" className="font-semibold text-primary hover:text-primary-hover">
                    Back to log in
                </Link>
            }>
            {state === 'checking' && (
                <div className="flex justify-center py-6">
                    <Spinner />
                </div>
            )}
            {done && (
                <div className="space-y-5">
                    <div className="flex flex-col items-center gap-3 rounded-2xl bg-green-50 px-4 py-6 text-center">
                        <CheckCircle2 className="h-10 w-10 text-success" />
                        <p className="text-sm text-body">
                            {state === 'verified'
                                ? 'Thanks! Your account is active and your 14-day free trial has started.'
                                : 'This email was already confirmed. You can log in.'}
                        </p>
                    </div>
                    <Link href="/login?verified=1">
                        <Button size="lg" block>
                            Log in
                        </Button>
                    </Link>
                </div>
            )}
            {state === 'invalid' && (
                <div className="space-y-4">
                    <Alert tone="error">This confirmation link is invalid or has expired.</Alert>
                    <ResendVerification label="Send a new link" />
                </div>
            )}
        </AuthShell>
    )
}
