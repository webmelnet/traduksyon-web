'use client'

import { Plus, Save, Trash2 } from 'lucide-react'
import React, { useState } from 'react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import type { MinutesContent } from '@/types'
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

interface Draft {
    title: string
    meeting_date: string
    summary: string
    attendees: { name: string; role: string }[]
    agenda: { topic: string; discussion: string }[]
    decisions: string
    action_items: { task: string; owner: string; due: string }[]
    next_meeting: string
    notes: string
}

const toDraft = (c: MinutesContent): Draft => ({
    title: c.title,
    meeting_date: c.meeting_date ?? '',
    summary: c.summary,
    attendees: c.attendees.map(a => ({ name: a.name, role: a.role ?? '' })),
    agenda: c.agenda.map(a => ({ topic: a.topic, discussion: toLines(a.discussion) })),
    decisions: toLines(c.decisions),
    action_items: c.action_items.map(a => ({ task: a.task, owner: a.owner ?? '', due: a.due ?? '' })),
    next_meeting: c.next_meeting ?? '',
    notes: c.notes ?? '',
})

const orNull = (s: string) => s.trim() || null

const fromDraft = (d: Draft): MinutesContent => ({
    title: d.title.trim(),
    meeting_date: orNull(d.meeting_date),
    summary: d.summary.trim(),
    attendees: d.attendees.filter(a => a.name.trim()).map(a => ({ name: a.name.trim(), role: orNull(a.role) })),
    agenda: d.agenda.filter(a => a.topic.trim()).map(a => ({ topic: a.topic.trim(), discussion: fromLines(a.discussion) })),
    decisions: fromLines(d.decisions),
    action_items: d.action_items.filter(a => a.task.trim()).map(a => ({ task: a.task.trim(), owner: orNull(a.owner), due: orNull(a.due) })),
    next_meeting: orNull(d.next_meeting),
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

export default function MinutesEditor({ initial, onSave, onCancel }: { initial: MinutesContent; onSave: (c: MinutesContent) => Promise<void>; onCancel: () => void }) {
    const [d, setD] = useState<Draft>(() => toDraft(initial))
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const patch = (p: Partial<Draft>) => setD(v => ({ ...v, ...p }))
    const updateAt = <K extends 'attendees' | 'agenda' | 'action_items'>(key: K, i: number, p: Partial<Draft[K][number]>) =>
        setD(v => ({ ...v, [key]: (v[key] as any[]).map((row, j) => (j === i ? { ...row, ...p } : row)) }))
    const removeAt = (key: 'attendees' | 'agenda' | 'action_items', i: number) => setD(v => ({ ...v, [key]: (v[key] as any[]).filter((_, j) => j !== i) }))

    const save = async () => {
        if (!d.title.trim()) return setError('Give the minutes a title.')
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

            <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
                <Input id="e-title" label="Title" value={d.title} onChange={e => patch({ title: e.target.value })} />
                <Input id="e-date" label="Meeting date" value={d.meeting_date} onChange={e => patch({ meeting_date: e.target.value })} placeholder="e.g. 21/11/2026" />
            </div>

            <div>
                <Label htmlFor="e-sum">Summary</Label>
                <textarea id="e-sum" rows={4} value={d.summary} onChange={e => patch({ summary: e.target.value })} className={fieldCls} />
            </div>

            <div>
                <Label>Attendees</Label>
                <div className="space-y-2">
                    {d.attendees.map((a, i) => (
                        <div key={i} className="flex gap-2">
                            <input value={a.name} onChange={e => updateAt('attendees', i, { name: e.target.value })} placeholder="Name" className={smallCls} />
                            <input value={a.role} onChange={e => updateAt('attendees', i, { role: e.target.value })} placeholder="Role (optional)" className={smallCls} />
                            <RemoveButton onClick={() => removeAt('attendees', i)} label="Remove attendee" />
                        </div>
                    ))}
                </div>
                <Button size="sm" variant="ghost" className="mt-2" icon={<Plus className="h-4 w-4" />} onClick={() => patch({ attendees: [...d.attendees, { name: '', role: '' }] })}>
                    Add attendee
                </Button>
            </div>

            <div>
                <Label>Discussion</Label>
                <div className="space-y-3">
                    {d.agenda.map((a, i) => (
                        <div key={i} className="rounded-xl border border-line p-3">
                            <div className="flex gap-2">
                                <input value={a.topic} onChange={e => updateAt('agenda', i, { topic: e.target.value })} placeholder="Topic" className={`${smallCls} font-semibold`} />
                                <RemoveButton onClick={() => removeAt('agenda', i)} label="Remove topic" />
                            </div>
                            <textarea
                                rows={Math.max(2, a.discussion.split('\n').length)}
                                value={a.discussion}
                                onChange={e => updateAt('agenda', i, { discussion: e.target.value })}
                                placeholder="One point per line"
                                className={`${fieldCls} mt-2 text-sm`}
                            />
                        </div>
                    ))}
                </div>
                <Button size="sm" variant="ghost" className="mt-2" icon={<Plus className="h-4 w-4" />} onClick={() => patch({ agenda: [...d.agenda, { topic: '', discussion: '' }] })}>
                    Add topic
                </Button>
            </div>

            <div>
                <Label htmlFor="e-dec">Decisions</Label>
                <textarea id="e-dec" rows={Math.max(2, d.decisions.split('\n').length)} value={d.decisions} onChange={e => patch({ decisions: e.target.value })} placeholder="One decision per line" className={fieldCls} />
            </div>

            <div>
                <Label>Action items</Label>
                <div className="space-y-2">
                    {d.action_items.map((a, i) => (
                        <div key={i} className="flex flex-col gap-2 rounded-xl border border-line p-2.5 sm:flex-row sm:border-0 sm:p-0">
                            <input value={a.task} onChange={e => updateAt('action_items', i, { task: e.target.value })} placeholder="Task" className={`${smallCls} sm:flex-[2]`} />
                            <div className="flex gap-2 sm:flex-[1.4]">
                                <input value={a.owner} onChange={e => updateAt('action_items', i, { owner: e.target.value })} placeholder="Owner" className={smallCls} />
                                <input value={a.due} onChange={e => updateAt('action_items', i, { due: e.target.value })} placeholder="Due" className={smallCls} />
                                <RemoveButton onClick={() => removeAt('action_items', i)} label="Remove action item" />
                            </div>
                        </div>
                    ))}
                </div>
                <Button size="sm" variant="ghost" className="mt-2" icon={<Plus className="h-4 w-4" />} onClick={() => patch({ action_items: [...d.action_items, { task: '', owner: '', due: '' }] })}>
                    Add action item
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Input id="e-next" label="Next meeting" value={d.next_meeting} onChange={e => patch({ next_meeting: e.target.value })} placeholder="Optional" />
                <Input id="e-notes" label="Notes" value={d.notes} onChange={e => patch({ notes: e.target.value })} placeholder="Optional" />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={onCancel} disabled={saving}>
                    Cancel
                </Button>
                <Button loading={saving} icon={<Save className="h-4 w-4" />} onClick={save}>
                    Save minutes
                </Button>
            </div>
        </Card>
    )
}
