'use client'

import Link from 'next/link'
import { ChevronRight, Coins, Download, Lock, LogOut, Mail, Share, ShieldCheck, User } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { TAGLINE } from '@/components/Logo'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/hooks/auth'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import axios from '@/lib/axios'
import type { FieldErrors } from '@/types'
import { errorMessage } from '@/utils/format'
import { canUseAdmin } from '@/components/admin/nav'

export default function SettingsPage() {
    const { user, mutate, logout } = useAuth()
    const { toast } = useToast()
    const { canInstall, installed, isIos, install } = useInstallPrompt()

    const [profile, setProfile] = useState({ name: '', email: '' })
    const [profileErrors, setProfileErrors] = useState<FieldErrors>({})
    const [savingProfile, setSavingProfile] = useState(false)

    const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' })
    const [pwErrors, setPwErrors] = useState<FieldErrors>({})
    const [savingPw, setSavingPw] = useState(false)

    useEffect(() => {
        if (user) setProfile({ name: user.name, email: user.email })
    }, [user])

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setSavingProfile(true)
        setProfileErrors({})
        try {
            await axios.put('/api/profile', profile)
            await mutate()
            toast('Profile updated.')
        } catch (err: any) {
            if (err.response?.status === 422) setProfileErrors(err.response.data.errors)
            else toast(errorMessage(err), 'error')
        } finally {
            setSavingProfile(false)
        }
    }

    const savePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setSavingPw(true)
        setPwErrors({})
        try {
            await axios.put('/api/profile/password', pw)
            setPw({ current_password: '', password: '', password_confirmation: '' })
            toast('Password changed.')
        } catch (err: any) {
            if (err.response?.status === 422) setPwErrors(err.response.data.errors)
            else toast(errorMessage(err), 'error')
        } finally {
            setSavingPw(false)
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Settings</h1>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="p-5 sm:p-6">
                    <h2 className="text-base font-semibold">Profile</h2>
                    <form onSubmit={saveProfile} className="mt-4 space-y-4">
                        <Input id="name" label="Full name" icon={<User className="h-4 w-4" />} value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} error={profileErrors.name} />
                        <Input id="email" type="email" label="Email" icon={<Mail className="h-4 w-4" />} value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} error={profileErrors.email} />
                        <Button type="submit" loading={savingProfile}>
                            Save changes
                        </Button>
                    </form>
                </Card>

                <Card className="p-5 sm:p-6">
                    <h2 className="text-base font-semibold">Change password</h2>
                    <form onSubmit={savePassword} className="mt-4 space-y-4">
                        <Input id="current_password" type="password" label="Current password" autoComplete="current-password" icon={<Lock className="h-4 w-4" />} value={pw.current_password} onChange={e => setPw(p => ({ ...p, current_password: e.target.value }))} error={pwErrors.current_password} />
                        <Input id="new_password" type="password" label="New password" autoComplete="new-password" icon={<Lock className="h-4 w-4" />} value={pw.password} onChange={e => setPw(p => ({ ...p, password: e.target.value }))} error={pwErrors.password} />
                        <Input id="new_password_confirmation" type="password" label="Confirm new password" autoComplete="new-password" icon={<Lock className="h-4 w-4" />} value={pw.password_confirmation} onChange={e => setPw(p => ({ ...p, password_confirmation: e.target.value }))} error={pwErrors.password_confirmation} />
                        <Button type="submit" loading={savingPw}>
                            Update password
                        </Button>
                    </form>
                </Card>
            </div>

            <Card className="divide-y divide-line overflow-hidden">
                <RowLink href="/billing" Icon={Coins} label="Credits & payments" />
                {canUseAdmin(user) && <RowLink href="/admin" Icon={ShieldCheck} label="Admin console" />}
                <div className="flex items-center gap-4 px-5 py-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-mint text-primary-deep">
                        <Download className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="font-medium text-dark">Install app</div>
                        <div className="text-sm text-muted">
                            {installed
                                ? 'Traduksyon is installed on this device.'
                                : isIos
                                  ? (
                                      <>
                                          Tap <Share className="inline h-3.5 w-3.5" /> Share, then “Add to Home Screen”.
                                      </>
                                  )
                                  : 'Add Traduksyon to your home screen or desktop.'}
                        </div>
                    </div>
                    {canInstall && (
                        <Button size="sm" onClick={install}>
                            Install
                        </Button>
                    )}
                </div>
                <button onClick={logout} className="flex w-full items-center gap-4 px-5 py-4 text-left text-danger hover:bg-red-50">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                        <LogOut className="h-5 w-5" />
                    </span>
                    <span className="font-medium">Log out</span>
                </button>
            </Card>

            <p className="text-center text-xs text-muted">Traduksyon.com · {TAGLINE}</p>
        </div>
    )
}

function RowLink({ href, Icon, label }: { href: string; Icon: any; label: string }) {
    return (
        <Link href={href} className="flex items-center gap-4 px-5 py-4 hover:bg-canvas">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-mint text-primary-deep">
                <Icon className="h-5 w-5" />
            </span>
            <span className="flex-1 font-medium text-dark">{label}</span>
            <ChevronRight className="h-5 w-5 text-muted" />
        </Link>
    )
}
