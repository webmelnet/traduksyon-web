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
    committee: string
    report_no: string
    report_date: string
    addressed_to: string
    subject: string
    introduction: string
    proceedings: string
    members_present: People
    others_present: People
    findings: { topic: string; points: string }[]
    recommendations: string
    conclusion: string
    notes: string
}

const toDraft = (c: ReportContent): Draft => ({
    title: c.title,
    committee: c.committee ?? '',
    report_no: c.report_no ?? '',
    report_date: c.report_date ?? '',
    addressed_to: c.addressed_to ?? '',
    subject: c.subject,
    introduction: c.introduction,
    proceedings: c.proceedings,
    members_present: c.members_present.map(p => ({ name: p.name, role: p.role ?? '' })),
    others_present: c.others_present.map(p => ({ name: p.name, role: p.role ?? '' })),
    findings: c.findings.map(f => ({ topic: f.topic, points: toLines(f.points) })),
    recommendations: toLines(c.recommendations),
    conclusion: c.conclusion,
    notes: c.notes ?? '',
})

const people = (list: People) => list.filter(p => p.name.trim()).map(p => ({ name: p.name.trim(), role: orNull(p.role) }))

const fromDraft = (d: Draft): ReportContent => ({
    title: d.title.trim(),
    committee: orNull(d.committee),
    report_no: orNull(d.report_no),
    report_date: orNull(d.report_date),
    addressed_to: orNull(d.addressed_to),
    subject: d.subject.trim(),
    introduction: d.introduction.trim(),
    proceedings: d.proceedings.trim(),
    members_present: people(d.members_present),
    others_present: people(d.others_present),
    findings: d.findings.filter(f => f.topic.trim()).map(f => ({ topic: f.topic.trim(), points: fromLines(f.points) })),
    recommendations: fromLines(d.recommendations),
    conclusion: d.conclusion.trim(),
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
    const updateAt = <K extends 'members_present' | 'others_present' | 'findings'>(key: K, i: number, p: Partial<Draft[K][number]>) =>
        setD(v => ({ ...v, [key]: (v[key] as any[]).map((row, j) => (j === i ? { ...row, ...p } : row)) }))
    const removeAt = (key: 'members_present' | 'others_present' | 'findings', i: number) => setD(v => ({ ...v, [key]: (v[key] as any[]).filter((_, j) => j !== i) }))

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

    const peopleRows = (key: 'members_present' | 'others_present', addLabel: string, rolePh: string) => (
        <>
            <div className="space-y-2">
                {d[key].map((p, i) => (
                    <div key={i} className="flex gap-2">
                        <input value={p.name} onChange={e => updateAt(key, i, { name: e.target.value })} placeholder="Name" className={smallCls} />
                        <input value={p.role} onChange={e => updateAt(key, i, { role: e.target.value })} placeholder={rolePh} className={smallCls} />
                        <RemoveButton onClick={() => removeAt(key, i)} label="Remove person" />
                    </div>
                ))}
            </div>
            <Button size="sm" variant="ghost" className="mt-2" icon={<Plus className="h-4 w-4" />} onClick={() => patch({ [key]: [...d[key], { name: '', role: '' }] } as Partial<Draft>)}>
                {addLabel}
            </Button>
        </>
    )

    return (
        <Card className="space-y-6 p-5 sm:p-7">
            {error && <Alert tone="error">{error}</Alert>}

            <Input id="e-title" label="Title" value={d.title} onChange={e => patch({ title: e.target.value })} />

            <div className="grid gap-4 sm:grid-cols-2">
                <Input id="e-com" label="Committee" value={d.committee} onChange={e => patch({ committee: e.target.value })} placeholder="e.g. Committee on Finance" />
                <div className="grid grid-cols-2 gap-4">
                    <Input id="e-no" label="Report No." value={d.report_no} onChange={e => patch({ report_no: e.target.value })} placeholder="e.g. 12, s. 2026" />
                    <Input id="e-date" label="Date" value={d.report_date} onChange={e => patch({ report_date: e.target.value })} placeholder="21/11/2026" />
                </div>
            </div>
            <Input id="e-to" label="Addressed to" value={d.addressed_to} onChange={e => patch({ addressed_to: e.target.value })} placeholder="e.g. The Honorable Members of the Sangguniang Bayan" />
            <Input id="e-sub" label="Subject" value={d.subject} onChange={e => patch({ subject: e.target.value })} />

            <div>
                <Label htmlFor="e-intro">I. Introduction</Label>
                <textarea id="e-intro" rows={4} value={d.introduction} onChange={e => patch({ introduction: e.target.value })} className={fieldCls} />
            </div>
            <div>
                <Label htmlFor="e-proc">II. Committee proceedings</Label>
                <textarea id="e-proc" rows={4} value={d.proceedings} onChange={e => patch({ proceedings: e.target.value })} className={fieldCls} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div>
                    <Label>Members present (also the signatories)</Label>
                    {peopleRows('members_present', 'Add member', 'e.g. Chairperson')}
                </div>
                <div>
                    <Label>Resource persons and guests</Label>
                    {peopleRows('others_present', 'Add person', 'Office / role')}
                </div>
            </div>

            <div>
                <Label>III. Findings and discussion</Label>
                <div className="space-y-3">
                    {d.findings.map((f, i) => (
                        <div key={i} className="rounded-xl border border-line p-3">
                            <div className="flex gap-2">
                                <input value={f.topic} onChange={e => updateAt('findings', i, { topic: e.target.value })} placeholder="Topic" className={`${smallCls} font-semibold`} />
                                <RemoveButton onClick={() => removeAt('findings', i)} label="Remove topic" />
                            </div>
                            <textarea
                                rows={Math.max(2, f.points.split('\n').length)}
                                value={f.points}
                                onChange={e => updateAt('findings', i, { points: e.target.value })}
                                placeholder="One finding per line"
                                className={`${fieldCls} mt-2 text-sm`}
                            />
                        </div>
                    ))}
                </div>
                <Button size="sm" variant="ghost" className="mt-2" icon={<Plus className="h-4 w-4" />} onClick={() => patch({ findings: [...d.findings, { topic: '', points: '' }] })}>
                    Add topic
                </Button>
            </div>

            <div>
                <Label htmlFor="e-rec">IV. Recommendations</Label>
                <textarea id="e-rec" rows={Math.max(3, d.recommendations.split('\n').length)} value={d.recommendations} onChange={e => patch({ recommendations: e.target.value })} placeholder="One recommendation per line" className={fieldCls} />
            </div>
            <div>
                <Label htmlFor="e-con">V. Conclusion</Label>
                <textarea id="e-con" rows={3} value={d.conclusion} onChange={e => patch({ conclusion: e.target.value })} className={fieldCls} />
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
