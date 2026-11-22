'use client'

import useSWR from 'swr'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios, { AxiosError, csrf } from '@/lib/axios'
import type { AuthUser, FieldErrors } from '@/types'

/**
 * Ported from winv-web/src/hooks/auth.tsx (Laravel Breeze + Sanctum SPA cookie auth).
 * Differences: self-registration emails a confirmation link and does NOT sign the user in
 * (login returns the "unverified" sentinel until they confirm), and the returnUrl is read from
 * window.location so pages don't need a <Suspense> boundary for useSearchParams().
 */

interface UseAuthOptions {
    middleware?: 'auth' | 'guest'
    redirectIfAuthenticated?: string
}

type SetErrors = (errors: FieldErrors) => void
type SetStatus = (status: string | null) => void

function readReturnUrl(): string | null {
    if (typeof window === 'undefined') return null
    const value = new URLSearchParams(window.location.search).get('returnUrl')
    // Only allow same-site relative paths, never an absolute URL (open-redirect guard).
    if (!value) return null
    const decoded = decodeURIComponent(value)
    return decoded.startsWith('/') && !decoded.startsWith('//') ? decoded : null
}

export const useAuth = ({ middleware, redirectIfAuthenticated }: UseAuthOptions = {}) => {
    const router = useRouter()

    const {
        data: user,
        error,
        mutate,
        isLoading,
    } = useSWR<AuthUser, AxiosError>('/api/user', () => axios.get('/api/user').then(res => res.data), {
        // Role / credit balance changes made elsewhere (admin, payment webhook) are not pushed
        // to open sessions, so poll like winv-web does.
        refreshInterval: 60000,
        shouldRetryOnError: false,
    })

    /** Resolves to the email the confirmation link was sent to, or null on validation errors. */
    const register = async ({ setErrors, ...props }: { setErrors: SetErrors } & Record<string, any>): Promise<string | null> => {
        await csrf()
        setErrors({})
        return axios
            .post<{ status: string; email: string }>('/register', props)
            .then(res => res.data.email)
            .catch((err: AxiosError<{ errors: FieldErrors }>) => {
                if (err.response?.status !== 422) throw err
                setErrors(err.response.data.errors)
                return null
            })
    }

    /** Always resolves with the API's generic status (it never reveals whether the email exists). */
    const resendVerification = async (email: string): Promise<string> => {
        await csrf()
        const res = await axios.post<{ status: string }>('/email/verification-notification', { email })
        return res.data.status
    }

    /** `path` = "/{id}/{hash}?expires=…&signature=…" copied from the emailed SPA link. */
    const verifyEmail = async (path: string): Promise<'verified' | 'already-verified' | 'invalid'> => {
        try {
            const res = await axios.get<{ status: 'verified' | 'already-verified' }>('/email/verify' + path)
            return res.data.status
        } catch {
            return 'invalid'
        }
    }

    const login = async ({
        setErrors,
        setStatus,
        ...props
    }: { setErrors: SetErrors; setStatus: SetStatus } & Record<string, any>) => {
        await csrf()
        setErrors({})
        setStatus(null)
        return axios
            .post('/login', props)
            .then(() => mutate())
            .catch((err: AxiosError<{ errors: FieldErrors }>) => {
                if (err.response?.status !== 422) throw err
                setErrors(err.response.data.errors)
            })
    }

    const forgotPassword = async ({
        setErrors,
        setStatus,
        email,
    }: {
        setErrors: SetErrors
        setStatus: SetStatus
        email: string
    }) => {
        await csrf()
        setErrors({})
        setStatus(null)
        return axios
            .post('/forgot-password', { email })
            .then(res => setStatus(res.data.status))
            .catch((err: AxiosError<{ errors: FieldErrors }>) => {
                if (err.response?.status !== 422) throw err
                setErrors(err.response.data.errors)
            })
    }

    const validateResetToken = async (token: string, email: string): Promise<boolean> => {
        try {
            await axios.get('/reset-password/validate-token', { params: { token, email } })
            return true
        } catch {
            return false
        }
    }

    const resetPassword = async ({
        setErrors,
        setStatus,
        ...props
    }: { setErrors: SetErrors; setStatus: SetStatus; token: string } & Record<string, any>) => {
        await csrf()
        setErrors({})
        setStatus(null)
        return axios
            .post('/reset-password', props)
            .then(res => router.push('/login?reset=' + btoa(res.data.status)))
            .catch((err: AxiosError<{ errors: FieldErrors }>) => {
                if (err.response?.status !== 422) throw err
                setErrors(err.response.data.errors)
            })
    }

    /**
     * Always hit /logout (never gate it on a stale SWR `error`) with a fresh CSRF token: if this
     * request silently fails (e.g. 419), the session + remember-me cookie survive and /login
     * bounces the user straight back to /home. 401 = already signed out, which is fine.
     */
    const logout = async () => {
        const post = () => axios.post('/logout')
        try {
            await csrf()
            await post()
        } catch (err) {
            const status = (err as AxiosError).response?.status
            if (status === 419) {
                await csrf()
                await post().catch(() => undefined)
            }
        }
        await mutate(undefined, { revalidate: false })
        window.location.href = '/login'
    }

    useEffect(() => {
        if (middleware === 'guest' && user) {
            router.replace(readReturnUrl() || redirectIfAuthenticated || '/home')
        }

        if (middleware === 'auth' && error) {
            const status = error.response?.status
            if (status === 401 || status === 419) {
                const path = window.location.pathname
                window.location.href =
                    path && path !== '/' && path !== '/login'
                        ? `/login?returnUrl=${encodeURIComponent(path + window.location.search)}`
                        : '/login'
            }
        }
    }, [user, error, middleware, redirectIfAuthenticated, router])

    return {
        user,
        error,
        isLoading,
        mutate,
        register,
        resendVerification,
        verifyEmail,
        login,
        forgotPassword,
        validateResetToken,
        resetPassword,
        logout,
    }
}
