'use client'

import { Plus, Save, Trash2 } from 'lucide-react'
import React, { useState } from 'react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import type { ReportContent } from '@/types'
import { errorMessage } from '@/utils/format'

const fieldCls = 'w-full rounded-xl border-line text-[15px] text-ink placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/15'
const smallCls = 'h-10 w-full rounded-lg border-line text-sm text-ink placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/15'

/** Lists are edited one item per line; blank lines are dropped on save. */
const toLines = (items: string[]) => items.join('\n')
const fromLines = (text: string) =>
    text
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
const orNull = (s: string) => s.trim() || null

type People = { name: string; role: string }[]

interface Draft {
    title: string
    report_no: string
    committee: string
    subject: string
    addressed_to: string
    referral: string
    background: string
    findings: { topic: string; text: string }[]
    recommendations: string
    committee_action: string
    recommendation: string
    signatories: People
    notes: string
}

const toDraft = (c: ReportContent): Draft => ({
    title: c.title,
    report_no: c.report_no ?? '',
    committee: c.committee ?? '',
    subject: c.subject,
    addressed_to: c.addressed_to ?? '',
    referral: c.referral,
    background: c.background,
    findings: c.findings.map(f => ({ topic: f.topic ?? '', text: f.text })),
    recommendations: toLines(c.recommendations),
    committee_action: c.committee_action,
    recommendation: c.recommendation,
    signatories: c.signatories.map(p => ({ name: p.name, role: p.role ?? '' })),
    notes: c.notes ?? '',
})

const fromDraft = (d: Draft): ReportContent => ({
    title: d.title.trim(),
    report_no: orNull(d.report_no),
    committee: orNull(d.committee),
    subject: d.subject.trim(),
    addressed_to: orNull(d.addressed_to),
    referral: d.referral.trim(),
    background: d.background.trim(),
    findings: d.findings.filter(f => f.text.trim()).map(f => ({ topic: orNull(f.topic), text: f.text.trim() })),
    recommendations: fromLines(d.recommendations),
    committee_action: d.committee_action.trim(),
    recommendation: d.recommendation.trim(),
    signatories: d.signatories.filter(p => p.name.trim()).map(p => ({ name: p.name.trim(), role: orNull(p.role) })),
    notes: orNull(d.notes),
})

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
    return (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-dark">
            {children}
        </label>
    )
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
    return (
        <button type="button" onClick={onClick} className="shrink-0 rounded-lg p-2 text-muted hover:bg-red-50 hover:text-danger" aria-label={label}>
            <Trash2 className="h-4 w-4" />
        </button>
    )
}

export default function ReportEditor({ initial, onSave, onCancel }: { initial: ReportContent; onSave: (c: ReportContent) => Promise<void>; onCancel: () => void }) {
    const [d, setD] = useState<Draft>(() => toDraft(initial))
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const patch = (p: Partial<Draft>) => setD(v => ({ ...v, ...p }))
    const updateAt = <K extends 'signatories' | 'findings'>(key: K, i: number, p: Partial<Draft[K][number]>) =>
        setD(v => ({ ...v, [key]: (v[key] as any[]).map((row, j) => (j === i ? { ...row, ...p } : row)) }))
    const removeAt = (key: 'signatories' | 'findings', i: number) => setD(v => ({ ...v, [key]: (v[key] as any[]).filter((_, j) => j !== i) }))
    const area = (id: string, label: string, key: keyof Draft, rows = 3, placeholder?: string) => (
        <div>
            <Label htmlFor={id}>{label}</Label>
            <textarea id={id} rows={Math.max(rows, String(d[key]).split('\n').length)} value={d[key] as string} onChange={e => patch({ [key]: e.target.value } as Partial<Draft>)} placeholder={placeholder} className={fieldCls} />
        </div>
    )

    const save = async () => {
        if (!d.title.trim()) return setError('Give the report a title.')
        setSaving(true)
        setError(null)
        try {
            await onSave(fromDraft(d))
        } catch (err) {
            setError(errorMessage(err))
            setSaving(false)
        }
    }

    return (
        <Card className="space-y-6 p-5 sm:p-7">
            {error && <Alert tone="error">{error}</Alert>}

            <Input id="e-title" label="Title (for your list)" value={d.title} onChange={e => patch({ title: e.target.value })} />

            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
                <Input id="e-no" label="Committee Report No." value={d.report_no} onChange={e => patch({ report_no: e.target.value })} placeholder="e.g. 078-2026" />
                <Input id="e-com" label="Committee" value={d.committee} onChange={e => patch({ committee: e.target.value })} placeholder="e.g. Committee on Disaster Risk Reduction and Management" />
            </div>
            <Input id="e-to" label="TO:" value={d.addressed_to} onChange={e => patch({ addressed_to: e.target.value })} placeholder="The Honorable Presiding Officer and Members of the August Body" />
            {area('e-ref', 'Referral and hearing', 'referral', 3, 'When the matter was referred and when/where the hearing was held')}
            {area('e-bg', 'I. Background', 'background', 4)}

            <div>
                <Label>II. Findings and observations (the issues)</Label>
                <div className="space-y-3">
                    {d.findings.map((f, i) => (
                        <div key={i} className="rounded-xl border border-line p-3">
                            <div className="flex gap-2">
                                <input value={f.topic} onChange={e => updateAt('findings', i, { topic: e.target.value })} placeholder="Issue, e.g. On Budgetary Requirements (optional)" className={`${smallCls} font-semibold`} />
                                <RemoveButton onClick={() => removeAt('findings', i)} label="Remove finding" />
                            </div>
                            <textarea rows={Math.max(2, Math.ceil(f.text.length / 90))} value={f.text} onChange={e => updateAt('findings', i, { text: e.target.value })} placeholder="What the committee noted" className={`${fieldCls} mt-2 text-sm`} />
                        </div>
                    ))}
                </div>
                <Button size="sm" variant="ghost" className="mt-2" icon={<Plus className="h-4 w-4" />} onClick={() => patch({ findings: [...d.findings, { topic: '', text: '' }] })}>
                    Add finding
                </Button>
            </div>

            {area('e-rec', 'III. Committee recommendations', 'recommendations', 3, 'One recommendation per line')}
            {area('e-act', 'IV. Committee action (motion, mover, seconder, result)', 'committee_action', 3)}
            {area('e-fin', 'Recommendation (closing)', 'recommendation', 3)}

            <div>
                <Label>Signed by</Label>
                <div className="space-y-2">
                    {d.signatories.map((p, i) => (
                        <div key={i} className="flex gap-2">
                            <input value={p.name} onChange={e => updateAt('signatories', i, { name: e.target.value })} placeholder="Name" className={smallCls} />
                            <input value={p.role} onChange={e => updateAt('signatories', i, { role: e.target.value })} placeholder="e.g. Chairperson" className={smallCls} />
                            <RemoveButton onClick={() => removeAt('signatories', i)} label="Remove signatory" />
                        </div>
                    ))}
                </div>
                <Button size="sm" variant="ghost" className="mt-2" icon={<Plus className="h-4 w-4" />} onClick={() => patch({ signatories: [...d.signatories, { name: '', role: '' }] })}>
                    Add signatory
                </Button>
            </div>
            <Input id="e-notes" label="Notes" value={d.notes} onChange={e => patch({ notes: e.target.value })} placeholder="Optional" />

            <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={onCancel} disabled={saving}>
                    Cancel
                </Button>
                <Button loading={saving} icon={<Save className="h-4 w-4" />} onClick={save}>
                    Save report
                </Button>
            </div>
        </Card>
    )
}
