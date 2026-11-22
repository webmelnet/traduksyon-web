'use client'

import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { FieldErrors } from '@/types'
import { SITE_ICONS } from './icons'
import type { FieldSpec } from './types'

const inputCls = (bad: boolean) =>
    `block w-full rounded-xl border bg-white px-3.5 text-[15px] text-ink transition focus:border-primary focus:ring-4 focus:ring-primary/15 ${bad ? 'border-danger' : 'border-line'}`

interface Props {
    name: string
    spec: FieldSpec
    value: any
    onChange: (value: any) => void
    icons: string[]
    errors: FieldErrors
    /** dotted path used for API error keys, e.g. content.items.0.title */
    path: string
}

/** One schema field. `list` renders repeatable, reorderable rows of its sub-fields. */
export default function FieldInput({ name, spec, value, onChange, icons, errors, path }: Props) {
    const err = errors[path]
    const id = path.replace(/\./g, '-')

    if (spec.type === 'bool') {
        return (
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-canvas px-4 py-3">
                <span className="text-sm font-medium text-body">{spec.label}</span>
                <span className="relative inline-flex">
                    <input type="checkbox" className="peer sr-only" checked={!!value} onChange={e => onChange(e.target.checked)} />
                    <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-primary" />
                    <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                </span>
            </label>
        )
    }

    if (spec.type === 'list') return <ListInput {...{ name, spec, value, onChange, icons, errors, path }} />

    const length = typeof value === 'string' ? value.length : 0

    return (
        <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <label htmlFor={id} className="text-sm font-medium text-body">
                    {spec.label}
                </label>
                {spec.max && (spec.type === 'string' || spec.type === 'text') && (
                    <span className={`text-[11px] ${length > spec.max ? 'text-danger' : 'text-muted'}`}>
                        {length}/{spec.max}
                    </span>
                )}
            </div>
            {spec.type === 'text' ? (
                <textarea id={id} rows={3} value={value ?? ''} onChange={e => onChange(e.target.value)} className={`${inputCls(!!err)} py-2.5`} />
            ) : spec.type === 'icon' ? (
                <IconPicker value={value} icons={icons} onChange={onChange} />
            ) : (
                <input
                    id={id}
                    type={spec.type === 'email' ? 'email' : spec.type === 'url' ? 'url' : 'text'}
                    value={value ?? ''}
                    placeholder={spec.type === 'url' ? 'https://' : undefined}
                    onChange={e => onChange(e.target.value)}
                    className={`${inputCls(!!err)} h-11`}
                />
            )}
            {spec.hint && !err && <p className="mt-1.5 text-xs text-muted">{spec.hint}</p>}
            {err?.map(m => (
                <p key={m} className="mt-1.5 text-xs text-danger">
                    {m}
                </p>
            ))}
        </div>
    )
}

function IconPicker({ value, icons, onChange }: { value: string; icons: string[]; onChange: (v: string) => void }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {icons.map(name => {
                const Icon = SITE_ICONS[name]
                if (!Icon) return null
                const on = value === name
                return (
                    <button
                        key={name}
                        type="button"
                        title={name}
                        onClick={() => onChange(name)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                            on ? 'border-primary bg-primary-mint text-primary-deep' : 'border-line bg-white text-muted hover:text-body'
                        }`}>
                        <Icon className="h-4 w-4" />
                    </button>
                )
            })}
        </div>
    )
}

function ListInput({ spec, value, onChange, icons, errors, path }: Props) {
    const rows: Record<string, any>[] = Array.isArray(value) ? value : []
    const fields = spec.fields ?? {}
    const [open, setOpen] = useState<number | null>(null)
    const max = spec.max_items ?? 20

    const blank = () => Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, f.type === 'bool' ? false : f.type === 'icon' ? icons[0] : '']))
    const set = (i: number, k: string, v: any) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
    const move = (i: number, d: number) => {
        const next = [...rows]
        ;[next[i], next[i + d]] = [next[i + d], next[i]]
        onChange(next)
        setOpen(open === i ? i + d : open)
    }
    const remove = (i: number) => {
        onChange(rows.filter((_, j) => j !== i))
        setOpen(null)
    }
    const rowHasError = (i: number) => Object.keys(errors).some(k => k.startsWith(`${path}.${i}.`))

    return (
        <div>
            <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-body">
                    {spec.label} <span className="text-muted">({rows.length}/{max})</span>
                </span>
            </div>
            <ul className="space-y-2">
                {rows.map((row, i) => {
                    const title = (spec.item_label && row[spec.item_label]) || `Item ${i + 1}`
                    const Icon = row.icon ? SITE_ICONS[row.icon] : null
                    const expanded = open === i || rowHasError(i)
                    return (
                        <li key={i} className={`rounded-xl border bg-white ${rowHasError(i) ? 'border-danger' : 'border-line'}`}>
                            <div className="flex items-center gap-2 px-3 py-2">
                                <button type="button" onClick={() => setOpen(expanded ? null : i)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                                    {Icon && (
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-mint text-primary-deep">
                                            <Icon className="h-3.5 w-3.5" />
                                        </span>
                                    )}
                                    <span className="truncate text-sm font-medium text-dark">{title}</span>
                                    {row.badge && <span className="shrink-0 rounded-full bg-ai-soft px-2 py-0.5 text-[10px] font-semibold text-ai">{row.badge}</span>}
                                </button>
                                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1.5 text-muted hover:bg-canvas disabled:opacity-30" aria-label="Move up">
                                    <ChevronUp className="h-4 w-4" />
                                </button>
                                <button type="button" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="rounded p-1.5 text-muted hover:bg-canvas disabled:opacity-30" aria-label="Move down">
                                    <ChevronDown className="h-4 w-4" />
                                </button>
                                <button type="button" onClick={() => remove(i)} className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-danger" aria-label="Remove">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                            {expanded && (
                                <div className="space-y-4 border-t border-line px-3 py-4">
                                    {Object.entries(fields).map(([k, f]) => (
                                        <FieldInput key={k} name={k} spec={f} value={row[k]} onChange={v => set(i, k, v)} icons={icons} errors={errors} path={`${path}.${i}.${k}`} />
                                    ))}
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>
            {rows.length < max && (
                <button
                    type="button"
                    onClick={() => {
                        onChange([...rows, blank()])
                        setOpen(rows.length)
                    }}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-2.5 text-sm font-medium text-primary hover:border-primary hover:bg-primary-mint/30">
                    <Plus className="h-4 w-4" /> Add
                </button>
            )}
            {errors[path]?.map(m => (
                <p key={m} className="mt-1.5 text-xs text-danger">
                    {m}
                </p>
            ))}
        </div>
    )
}
