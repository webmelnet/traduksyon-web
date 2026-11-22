'use client'

import useSWR from 'swr'
import { Check, ExternalLink, EyeOff, RotateCcw, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import FieldInput from '@/components/admin/site/FieldInput'
import type { SectionContent, SiteAdminPayload } from '@/components/admin/site/types'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/hooks/auth'
import axios from '@/lib/axios'
import type { FieldErrors } from '@/types'
import { errorMessage, formatDateTime } from '@/utils/format'
import { hasPermission } from '@/utils/permissions'

const fetcher = (url: string) => axios.get(url).then(r => r.data)

/**
 * Superadmin editor for www.traduksyon.com. Forms are generated from the API's SiteSchema,
 * so a new field added there appears here with no frontend change.
 */
export default function WebsiteContentPage() {
    const { user } = useAuth()
    const router = useRouter()
    const { toast } = useToast()
    const allowed = hasPermission(user, 'website.manage')
    const { data, error, mutate } = useSWR<SiteAdminPayload>(allowed ? '/api/admin/site' : null, fetcher, { revalidateOnFocus: false })

    const [active, setActive] = useState('hero')
    const [drafts, setDrafts] = useState<Record<string, SectionContent>>({})
    const [errors, setErrors] = useState<FieldErrors>({})
    const [saving, setSaving] = useState(false)
    const [confirmReset, setConfirmReset] = useState(false)

    useEffect(() => {
        if (user && !allowed) router.replace('/admin')
    }, [user, allowed, router])

    const section = data?.schema.find(s => s.key === active)
    const saved = data?.content[active]
    const value = drafts[active] ?? saved
    const dirtyKeys = useMemo(
        () => Object.keys(drafts).filter(k => JSON.stringify(drafts[k]) !== JSON.stringify(data?.content[k])),
        [drafts, data],
    )
    const dirty = dirtyKeys.includes(active)

    // Warn before leaving the page with unsaved edits.
    useEffect(() => {
        if (!dirtyKeys.length) return
        const warn = (e: BeforeUnloadEvent) => e.preventDefault()
        window.addEventListener('beforeunload', warn)
        return () => window.removeEventListener('beforeunload', warn)
    }, [dirtyKeys.length])

    if (!user || !allowed) return null

    const setField = (k: string, v: any) => setDrafts(d => ({ ...d, [active]: { ...(d[active] ?? saved), [k]: v } }))

    const applySaved = (content: SectionContent) => {
        mutate(d => d && { ...d, content: { ...d.content, [active]: content } }, { revalidate: true })
        setDrafts(d => {
            const { [active]: _, ...rest } = d
            return rest
        })
        setErrors({})
    }

    const save = async () => {
        setSaving(true)
        setErrors({})
        try {
            const res = await axios.put(`/api/admin/site/${active}`, { content: value })
            applySaved(res.data.content)
            toast(res.data.message)
        } catch (e: any) {
            if (e.response?.status === 422) setErrors(e.response.data.errors ?? {})
            toast(errorMessage(e, 'Could not save.'), 'error')
        } finally {
            setSaving(false)
        }
    }

    const reset = async () => {
        setSaving(true)
        try {
            const res = await axios.post(`/api/admin/site/${active}/reset`)
            applySaved(res.data.content)
            toast(res.data.message)
            setConfirmReset(false)
        } catch (e) {
            toast(errorMessage(e), 'error')
        } finally {
            setSaving(false)
        }
    }

    const meta = data?.meta[active]

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Website content</h1>
                    <p className="mt-1 text-muted">Edit the public marketing site. Saved changes go live within a minute.</p>
                </div>
                {data && (
                    <a href={data.marketing_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                        View website <ExternalLink className="h-4 w-4" />
                    </a>
                )}
            </div>

            {error && <Alert tone="error">{errorMessage(error, 'Could not load the website content.')}</Alert>}
            {!data && !error && (
                <div className="flex justify-center py-16">
                    <Spinner className="h-6 w-6" />
                </div>
            )}

            {data && section && (
                <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
                    {/* Section picker: dropdown on phones, list on lg+ */}
                    <select value={active} onChange={e => { setActive(e.target.value); setErrors({}) }} className="h-11 rounded-xl border-line text-sm lg:hidden">
                        {data.schema.map(s => (
                            <option key={s.key} value={s.key}>
                                {s.label}
                                {dirtyKeys.includes(s.key) ? ' •' : ''}
                            </option>
                        ))}
                    </select>
                    <Card className="hidden h-fit overflow-hidden lg:block">
                        <ul className="divide-y divide-line">
                            {data.schema.map(s => {
                                const hidden = data.content[s.key]?.enabled === false
                                return (
                                    <li key={s.key}>
                                        <button
                                            onClick={() => { setActive(s.key); setErrors({}) }}
                                            className={`flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition ${
                                                s.key === active ? 'bg-primary-mint/60 font-semibold text-primary-deep' : 'text-body hover:bg-canvas'
                                            }`}>
                                            <span className="flex-1">{s.label}</span>
                                            {hidden && <EyeOff className="h-3.5 w-3.5 text-muted" aria-label="Hidden" />}
                                            {dirtyKeys.includes(s.key) && <span className="h-2 w-2 rounded-full bg-warning" title="Unsaved changes" />}
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    </Card>

                    <Card className="p-5 sm:p-6">
                        <div className="mb-5 border-b border-line pb-4">
                            <h2 className="text-lg font-semibold">{section.label}</h2>
                            {section.description && <p className="mt-1 text-sm text-muted">{section.description}</p>}
                            <p className="mt-2 text-xs text-muted">
                                {meta ? `Last saved ${formatDateTime(meta.updated_at)}${meta.updated_by ? ` by ${meta.updated_by}` : ''}` : 'Showing the default content (never edited).'}
                            </p>
                        </div>

                        <div className="space-y-5">
                            {Object.entries(section.fields).map(([k, spec]) => (
                                <FieldInput key={`${active}.${k}`} name={k} spec={spec} value={value?.[k]} onChange={v => setField(k, v)} icons={data.icons} errors={errors} path={`content.${k}`} />
                            ))}
                        </div>

                        <div className="sticky bottom-0 -mx-5 -mb-5 mt-6 flex flex-col-reverse gap-2 rounded-b-2xl border-t border-line bg-surface/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <Button variant="ghost" icon={<RotateCcw className="h-4 w-4" />} onClick={() => setConfirmReset(true)} disabled={saving || !meta}>
                                Restore default
                            </Button>
                            <div className="flex gap-2">
                                {dirty && (
                                    <Button variant="secondary" onClick={() => setDrafts(d => { const { [active]: _, ...rest } = d; return rest })} disabled={saving}>
                                        Discard
                                    </Button>
                                )}
                                <Button onClick={save} loading={saving} disabled={!dirty} icon={dirty ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />} className="flex-1 sm:flex-none">
                                    {dirty ? 'Save changes' : 'Saved'}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            <Modal
                open={confirmReset}
                onClose={() => setConfirmReset(false)}
                title="Restore default content?"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setConfirmReset(false)}>
                            Cancel
                        </Button>
                        <Button variant="danger" loading={saving} onClick={reset}>
                            Restore default
                        </Button>
                    </>
                }>
                <p className="text-sm text-body">“{section?.label}” goes back to the built-in text. Your edits to this section are deleted.</p>
            </Modal>
        </div>
    )
}
