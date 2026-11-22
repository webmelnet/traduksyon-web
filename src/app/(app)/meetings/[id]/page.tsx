'use client'

import useSWR from 'swr'
import { AlertTriangle, ArrowLeft, ArrowUpToLine, Check, ChevronDown, ClipboardList, Copy, Pencil, RotateCcw, Scissors, Trash2, UserPlus, Users, X } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { type ExportFormat, exportTranscript } from '@/components/transcribe/exportTranscript'
import { formatTimestamp, languageLabel, MODE_LABELS, speakerName, speakerTone, STATUS_META, transcriptToText } from '@/components/transcribe/helpers'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import DownloadMenu from '@/components/ui/DownloadMenu'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/contexts/ToastContext'
import axios from '@/lib/axios'
import type { TranscriptSegment, TranscriptSpeaker, Transcription } from '@/types'
import { errorMessage, formatDateTime } from '@/utils/format'

const fetcher = (url: string) => axios.get(url).then(r => r.data.transcription)

export default function TranscriptionPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const { toast } = useToast()
    const audioRef = useRef<HTMLAudioElement>(null)
    const [time, setTime] = useState(0)
    const [view, setView] = useState<'speakers' | 'text'>('speakers')
    const [showTimes, setShowTimes] = useState(true)
    const [renameOpen, setRenameOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [busy, setBusy] = useState(false)

    const { data: t, error, mutate } = useSWR<Transcription>(`/api/transcriptions/${id}`, fetcher, {
        refreshInterval: d => (d && (d.status === 'queued' || d.status === 'processing') ? 3000 : 0),
    })

    const speakers = useMemo(() => t?.speakers ?? [], [t?.speakers])
    const segments = useMemo(() => t?.segments ?? [], [t?.segments])
    const activeIndex = useMemo(() => {
        // Last segment that has started — fine for a linear transcript.
        let idx = -1
        for (let i = 0; i < segments.length; i++) {
            if (segments[i].start <= time + 0.05) idx = i
            else break
        }
        return idx >= 0 && time <= segments[idx].end + 1.5 ? idx : -1
    }, [segments, time])

    const seek = useCallback((secs: number) => {
        const a = audioRef.current
        if (!a) return
        a.currentTime = secs
        a.play().catch(() => undefined)
    }, [])

    /** Editing a line pauses playback; saving resumes it if it was playing when the edit began. */
    const resumeAfterEditRef = useRef(false)
    const pauseForEdit = useCallback(() => {
        const a = audioRef.current
        if (!a) return
        resumeAfterEditRef.current = !a.paused && !a.ended
        a.pause()
    }, [])
    const resumeAfterEdit = useCallback(() => {
        const a = audioRef.current
        if (a && resumeAfterEditRef.current) a.play().catch(() => undefined)
        resumeAfterEditRef.current = false
    }, [])

    /**
     * Saves a manual correction to one line — new text (the API realigns word timings so seeking/highlighting
     * keep working) and/or who said it. An unknown speaker id makes the API add that speaker.
     */
    const saveSegment = useCallback(
        async (index: number, patch: SegmentPatch) => {
            const res = await axios.put(`/api/transcriptions/${id}`, { segments: [{ index, ...patch }] })
            await mutate(res.data.transcription, { revalidate: false })
        },
        [id, mutate],
    )

    /** Splits line `index` before word `at`; the second part goes to `speaker` (a new id adds that speaker). */
    const splitSegment = useCallback(
        async (index: number, at: number, speaker: string) => {
            const res = await axios.put(`/api/transcriptions/${id}`, { split: { index, at, speaker } })
            await mutate(res.data.transcription, { revalidate: false })
        },
        [id, mutate],
    )

    /** Joins line `index` onto the line above it (undo for a split). */
    const mergeSegment = useCallback(
        async (index: number) => {
            const res = await axios.put(`/api/transcriptions/${id}`, { merge: { index } })
            await mutate(res.data.transcription, { revalidate: false })
        },
        [id, mutate],
    )

    if (error) {
        return (
            <div className="space-y-4">
                <BackLink />
                <Alert tone="error">{error.response?.status === 404 ? 'Recording not found.' : errorMessage(error)}</Alert>
            </div>
        )
    }

    if (!t) {
        return (
            <div className="flex justify-center py-20">
                <Spinner className="h-6 w-6" />
            </div>
        )
    }

    const status = STATUS_META[t.status]
    const plainText = transcriptToText(t.title, segments, speakers, showTimes)

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(plainText)
            toast('Transcript copied.')
        } catch {
            toast('Could not copy — your browser blocked clipboard access.', 'error')
        }
    }

    const download = async (format: ExportFormat) => {
        try {
            await exportTranscript(format, { transcription: t, segments, speakers, withTimes: showTimes })
        } catch (err) {
            toast(errorMessage(err), 'error')
        }
    }

    const retry = async () => {
        setBusy(true)
        try {
            await axios.post(`/api/transcriptions/${t.id}/retry`)
            await mutate()
        } catch (err) {
            toast(errorMessage(err), 'error')
        } finally {
            setBusy(false)
        }
    }

    const remove = async () => {
        setBusy(true)
        try {
            await axios.delete(`/api/transcriptions/${t.id}`)
            toast('Recording deleted.')
            router.replace('/meetings')
        } catch (err) {
            toast(errorMessage(err), 'error')
            setBusy(false)
        }
    }

    const unsupported = t.language === 'bcl' || t.language === 'msb'

    return (
        <div className="space-y-5">
            <BackLink />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="break-words text-2xl font-bold">{t.title}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <Badge tone={status.tone}>{status.label}</Badge>
                        <Badge tone="teal">{MODE_LABELS[t.mode]}</Badge>
                        <span>{languageLabel(t.language)}</span>
                        {t.detected_language && t.language === 'auto' && <span>· detected {languageLabel(t.detected_language)}</span>}
                        <span>· {formatTimestamp(t.duration_secs)}</span>
                        <span>· {formatDateTime(t.created_at)}</span>
                    </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                    {t.status === 'completed' && (
                        <>
                            <Button variant="secondary" size="sm" icon={<Copy className="h-4 w-4" />} onClick={copy}>
                                Copy
                            </Button>
                            <DownloadMenu onPick={download} />
                            <Button variant="ai" size="sm" icon={<ClipboardList className="h-4 w-4" />} onClick={() => router.push(`/minutes?transcription=${t.id}`)}>
                                Minutes
                            </Button>
                        </>
                    )}
                    <Button variant="secondary" size="sm" icon={<Trash2 className="h-4 w-4 text-danger" />} onClick={() => setDeleteOpen(true)} disabled={t.status === 'processing'} aria-label="Delete" />
                </div>
            </div>

            {(t.status === 'queued' || t.status === 'processing') && (
                <Card className="flex flex-col items-center px-6 py-14 text-center">
                    <Spinner className="h-8 w-8" />
                    <h2 className="mt-4 text-lg font-semibold">{t.status === 'queued' ? 'Waiting in line…' : 'Transcribing your recording…'}</h2>
                    <p className="mt-1 max-w-sm text-sm text-muted">
                        We&apos;re writing down every word and working out who is speaking. Long recordings can take a few minutes — you can leave this page.
                    </p>
                </Card>
            )}

            {t.status === 'failed' && (
                <Alert tone="error">
                    <div className="font-semibold">Transcription failed</div>
                    <div className="mt-0.5 break-words">{t.error || 'Something went wrong.'}</div>
                    <Button size="sm" variant="secondary" className="mt-3" loading={busy} icon={<RotateCcw className="h-4 w-4" />} onClick={retry}>
                        Try again
                    </Button>
                </Alert>
            )}

            {t.status === 'completed' && (
                <>
                    {unsupported && (
                        <Alert tone="warning">
                            {languageLabel(t.language)} isn&apos;t officially supported by the speech engine yet, so some words may be misspelled or written the Tagalog way. Please review the transcript.
                        </Alert>
                    )}

                    <Card className="sticky top-[calc(4rem+env(safe-area-inset-top)+0.5rem)] z-20 p-3 sm:p-4">
                        {/* Same-site cookie session is sent with media requests, so the authenticated endpoint can be used directly. */}
                        <audio
                            ref={audioRef}
                            controls
                            preload="metadata"
                            className="w-full"
                            src={`${process.env.NEXT_PUBLIC_BACKEND_URL ?? ''}/api/transcriptions/${t.id}/audio`}
                            onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
                            onSeeked={e => setTime(e.currentTarget.currentTime)}
                        />
                    </Card>

                    <div className="grid gap-5 lg:grid-cols-[1fr_16rem]">
                        <Card className="order-2 min-w-0 lg:order-1">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
                                <div className="inline-flex rounded-xl bg-canvas p-1 text-sm">
                                    {(
                                        [
                                            ['speakers', 'By speaker'],
                                            ['text', 'Plain text'],
                                        ] as const
                                    ).map(([v, label]) => (
                                        <button
                                            key={v}
                                            onClick={() => setView(v)}
                                            className={`rounded-lg px-3 py-1.5 font-medium transition ${view === v ? 'bg-white text-dark shadow-sm' : 'text-muted hover:text-body'}`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <label className="flex cursor-pointer items-center gap-2 text-sm text-body">
                                    <input type="checkbox" className="rounded text-primary focus:ring-primary" checked={showTimes} onChange={e => setShowTimes(e.target.checked)} />
                                    Timestamps
                                </label>
                            </div>

                            {!segments.length ? (
                                <div className="px-5 py-12 text-center text-sm text-muted">No speech was detected in this recording.</div>
                            ) : view === 'speakers' ? (
                                <ol className="divide-y divide-line">
                                    {segments.map((s, i) => (
                                        <SegmentRow
                                            // Split/merge shift later indexes, so let those rows remount with fresh state.
                                            key={`${i}:${s.start}:${s.end}`}
                                            index={i}
                                            segment={s}
                                            speakers={speakers}
                                            showTime={showTimes}
                                            activeTime={i === activeIndex ? time : null}
                                            onSeek={seek}
                                            onSave={saveSegment}
                                            onSplit={splitSegment}
                                            onMerge={mergeSegment}
                                            onEditStart={pauseForEdit}
                                            onEditSaved={resumeAfterEdit}
                                        />
                                    ))}
                                </ol>
                            ) : (
                                <pre className="whitespace-pre-wrap break-words px-4 py-4 font-sans text-[15px] leading-relaxed text-body sm:px-5">
                                    {plainText.slice(t.title.length + 2)}
                                </pre>
                            )}
                        </Card>

                        <div className="order-1 lg:order-2">
                            <Card className="p-4 lg:sticky lg:top-[calc(4rem+env(safe-area-inset-top)+7.5rem)]">
                                <div className="flex items-center justify-between">
                                    <h2 className="flex items-center gap-2 text-sm font-semibold">
                                        <Users className="h-4 w-4 text-muted" /> Speakers ({speakers.length})
                                    </h2>
                                    {speakers.length > 0 && (
                                        <button onClick={() => setRenameOpen(true)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary-mint/50">
                                            <Pencil className="h-3.5 w-3.5" /> Rename
                                        </button>
                                    )}
                                </div>
                                <ul className="mt-3 flex flex-wrap gap-2 lg:flex-col">
                                    {speakers.map(sp => (
                                        <li key={sp.id} className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${speakerTone(speakers, sp.id)}`}>
                                            {sp.name}
                                            <span className="font-normal opacity-70">
                                                {formatTimestamp(segments.filter(s => s.speaker === sp.id).reduce((sum, s) => sum + (s.end - s.start), 0))}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-3 text-xs text-muted">
                                    Speakers are detected automatically. Tap a word or time to jump there in the audio. Spot a wrong word? Tap the pencil on that line to fix it. Wrong person? Tap the name on that line to
                                    change who said it. Two people in one line? Tap the scissors and pick the word where the other person starts.
                                </p>
                            </Card>
                        </div>
                    </div>
                </>
            )}

            <RenameSpeakersModal
                open={renameOpen}
                transcription={t}
                onClose={() => setRenameOpen(false)}
                onSaved={updated => {
                    mutate(updated, { revalidate: false })
                    setRenameOpen(false)
                    toast('Speaker names saved.')
                }}
            />

            <Modal
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                title="Delete recording?"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="danger" loading={busy} onClick={remove}>
                            Delete
                        </Button>
                    </>
                }>
                <p className="flex gap-2 text-sm text-body">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />
                    The audio file and its transcript will be permanently removed.
                </p>
            </Modal>
        </div>
    )
}

function BackLink() {
    return (
        <Link href="/meetings" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-body">
            <ArrowLeft className="h-4 w-4" /> My meetings
        </Link>
    )
}

type SegmentPatch = { text?: string; speaker?: string }

/** First letter not already used as a speaker id (A–Z, then AA, AB…). */
function nextSpeakerId(speakers: TranscriptSpeaker[]): string {
    const used = new Set(speakers.map(s => s.id))
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    return [...letters, ...letters.flatMap(a => letters.map(b => a + b))].find(l => !used.has(l)) ?? 'ZZ'
}

/** Speaker chip on a line; opens a menu to reassign just this line to another (or a new) speaker. */
function SpeakerPicker({
    speakers,
    current,
    disabled,
    label = 'Who said this line?',
    title = 'Change who said this line',
    onPick,
}: {
    speakers: TranscriptSpeaker[]
    current: string
    disabled?: boolean
    label?: string
    title?: string
    onPick: (id: string) => Promise<void> | void
}) {
    const [open, setOpen] = useState(false)
    const [working, setWorking] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const close = (e: MouseEvent | KeyboardEvent) => {
            if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', close)
        document.addEventListener('keydown', close)
        return () => {
            document.removeEventListener('mousedown', close)
            document.removeEventListener('keydown', close)
        }
    }, [open])

    const pick = async (id: string) => {
        if (id === current) return setOpen(false)
        setWorking(true)
        try {
            await onPick(id)
            setOpen(false)
        } finally {
            setWorking(false)
        }
    }

    // Fit the menu between the chip and the window edge (minus the sticky header / phone BottomNav);
    // flip it upward when there is much more room above. The speaker list scrolls inside.
    const [placement, setPlacement] = useState<{ up: boolean; maxHeight: number }>({ up: false, maxHeight: 360 })
    useLayoutEffect(() => {
        if (!open) return
        const measure = () => {
            const rect = ref.current?.getBoundingClientRect()
            if (!rect) return
            const gap = 12
            const bottomNav = window.innerWidth < 768 ? 72 : 0
            const header = 64
            const below = window.innerHeight - rect.bottom - bottomNav - gap
            const above = rect.top - header - gap
            const up = below < 240 && above > below
            setPlacement({ up, maxHeight: Math.max(160, up ? above : below) })
        }
        measure()
        window.addEventListener('resize', measure)
        return () => window.removeEventListener('resize', measure)
    }, [open])

    const newId = nextSpeakerId(speakers)

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                disabled={disabled || working}
                onClick={() => setOpen(o => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                title={title}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition hover:ring-2 hover:ring-primary/30 disabled:opacity-60 ${speakerTone(speakers, current)}`}>
                {working ? <Spinner className="h-3 w-3" /> : null}
                {speakerName(speakers, current)}
                <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
            {open && (
                <div
                    role="menu"
                    style={{ maxHeight: placement.maxHeight }}
                    className={`absolute left-0 z-[25] flex w-56 flex-col overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg ${placement.up ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}>
                    <div className="shrink-0 px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    {speakers.map(sp => (
                        <button
                            key={sp.id}
                            role="menuitem"
                            disabled={working}
                            onClick={() => pick(sp.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-canvas disabled:opacity-60">
                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${speakerTone(speakers, sp.id)}`} />
                            <span className="min-w-0 flex-1 truncate font-medium text-body">{sp.name}</span>
                            {sp.id === current && <Check className="h-4 w-4 shrink-0 text-primary" />}
                        </button>
                    ))}
                    </div>
                    <button
                        role="menuitem"
                        disabled={working}
                        onClick={() => pick(newId)}
                        className="flex w-full shrink-0 items-center gap-2 border-t border-line px-3 py-2 text-left text-sm font-medium text-primary hover:bg-canvas disabled:opacity-60">
                        <UserPlus className="h-4 w-4 shrink-0" /> New speaker (Speaker {newId})
                    </button>
                </div>
            )}
        </div>
    )
}

const ROW_ACTION = 'rounded-lg p-1.5 text-muted transition hover:bg-primary-mint/50 hover:text-primary disabled:opacity-50'

/** Only the row that is playing receives `activeTime`, so playback re-renders one row, not the whole transcript. */
const SegmentRow = memo(function SegmentRow({
    index,
    segment,
    speakers,
    showTime,
    activeTime,
    onSeek,
    onSave,
    onSplit,
    onMerge,
    onEditStart,
    onEditSaved,
}: {
    index: number
    segment: TranscriptSegment
    speakers: TranscriptSpeaker[]
    showTime: boolean
    activeTime: number | null
    onSeek: (secs: number) => void
    onSave: (index: number, patch: SegmentPatch) => Promise<void>
    onSplit: (index: number, at: number, speaker: string) => Promise<void>
    onMerge: (index: number) => Promise<void>
    onEditStart: () => void
    onEditSaved: () => void
}) {
    const { toast } = useToast()
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState('')
    const [saving, setSaving] = useState(false)
    // Split mode: tap the first word the other person said, pick who said the rest, save.
    const [splitting, setSplitting] = useState(false)
    const [splitAt, setSplitAt] = useState<number | null>(null)
    const [splitSpeaker, setSplitSpeaker] = useState('')
    const active = activeTime !== null && !editing
    const original = segment.words.map(w => w.text).join(' ')
    const canSplit = segment.words.length > 1
    // A not-yet-saved new speaker gets its own colour in the preview.
    const splitSpeakers = useMemo(
        () => (splitting && splitSpeaker && !speakers.some(sp => sp.id === splitSpeaker) ? [...speakers, { id: splitSpeaker, name: `Speaker ${splitSpeaker}` }] : speakers),
        [speakers, splitting, splitSpeaker],
    )

    const startSplit = () => {
        setSplitAt(null)
        setSplitSpeaker(speakers.find(sp => sp.id !== segment.speaker)?.id ?? nextSpeakerId(speakers))
        setSplitting(true)
        onEditStart()
    }

    const cancelSplit = () => setSplitting(false)

    const saveSplit = async () => {
        if (splitAt === null) return toast('Tap the word where the other person starts speaking.', 'error')
        setSaving(true)
        try {
            await onSplit(index, splitAt, splitSpeaker)
            setSplitting(false)
            onEditSaved()
            toast('Line split.')
        } catch (err) {
            toast(errorMessage(err), 'error')
        } finally {
            setSaving(false)
        }
    }

    const merge = async () => {
        setSaving(true)
        try {
            await onMerge(index)
            toast('Merged with the line above.')
        } catch (err) {
            toast(errorMessage(err), 'error')
            setSaving(false)
        }
    }

    const changeSpeaker = async (speaker: string) => {
        try {
            await onSave(index, { speaker })
            toast('Speaker changed for this line.')
        } catch (err) {
            toast(errorMessage(err), 'error')
            throw err
        }
    }

    const startEdit = () => {
        setSplitting(false)
        setDraft(original)
        setEditing(true)
        onEditStart()
    }

    const save = async () => {
        const text = draft.trim().replace(/\s+/g, ' ')
        if (!text) return toast('The line can’t be empty.', 'error')
        if (text === original) {
            setEditing(false)
            return onEditSaved()
        }
        setSaving(true)
        try {
            await onSave(index, { text })
            setEditing(false)
            onEditSaved()
            toast('Correction saved.')
        } catch (err) {
            toast(errorMessage(err), 'error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <li className={`group px-4 py-3.5 transition sm:px-5 ${active ? 'bg-primary-mint/25' : ''} ${editing || splitting ? 'bg-canvas' : ''}`}>
            <div className="mb-1.5 flex items-center gap-2">
                <SpeakerPicker speakers={speakers} current={segment.speaker} disabled={saving || splitting} onPick={changeSpeaker} />
                {showTime && (
                    <button onClick={() => onSeek(segment.start)} className="font-mono text-xs text-muted hover:text-primary">
                        {formatTimestamp(segment.start)}
                    </button>
                )}
                {segment.edited && !editing && <span className="text-[11px] italic text-muted">edited</span>}
                {!editing && !splitting && (
                    <div className="ml-auto flex items-center gap-0.5 sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
                        {index > 0 && (
                            <button onClick={merge} disabled={saving} aria-label="Merge with the line above" title="Merge with the line above" className={ROW_ACTION}>
                                {saving ? <Spinner className="h-3.5 w-3.5" /> : <ArrowUpToLine className="h-3.5 w-3.5" />}
                            </button>
                        )}
                        {canSplit && (
                            <button onClick={startSplit} disabled={saving} aria-label="Split this line" title="Split this line (two people speaking)" className={ROW_ACTION}>
                                <Scissors className="h-3.5 w-3.5" />
                            </button>
                        )}
                        <button onClick={startEdit} disabled={saving} aria-label="Edit this line" title="Correct this line" className={ROW_ACTION}>
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>
            {editing ? (
                <div>
                    <textarea
                        autoFocus
                        value={draft}
                        rows={Math.min(10, Math.max(2, Math.ceil(draft.length / 70)))}
                        maxLength={10000}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Escape') setEditing(false)
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save()
                        }}
                        className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[15px] leading-relaxed text-body focus:border-primary focus:ring-primary"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button size="sm" loading={saving} icon={<Check className="h-4 w-4" />} onClick={save}>
                            Save
                        </Button>
                        <Button size="sm" variant="secondary" disabled={saving} icon={<X className="h-4 w-4" />} onClick={() => setEditing(false)}>
                            Cancel
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onSeek(segment.start)}>
                            Play this part
                        </Button>
                        <span className="hidden text-xs text-muted sm:inline">Ctrl+Enter to save · Esc to cancel</span>
                    </div>
                </div>
            ) : splitting ? (
                <div>
                    <p className="mb-2 text-xs font-medium text-muted">
                        {splitAt === null ? 'Tap the first word the other person said.' : 'Pick who said the second part, then save. Tap another word to move the split.'}
                    </p>
                    <p className="rounded-xl border border-dashed border-primary/40 bg-white px-3 py-2 text-[15px] leading-loose text-body">
                        {segment.words.map((w, i) => {
                            const second = splitAt !== null && i >= splitAt
                            const current = activeTime !== null && activeTime >= w.start && activeTime < Math.max(w.end, w.start + 0.15)
                            return (
                                <React.Fragment key={i}>
                                    {i > 0 && (i === splitAt ? <span className="mx-1 inline-block h-5 w-0.5 translate-y-1 rounded bg-primary" aria-hidden /> : ' ')}
                                    <button
                                        type="button"
                                        disabled={i === 0 || saving}
                                        onClick={() => setSplitAt(i)}
                                        title={i === 0 ? undefined : 'Split here'}
                                        className={`rounded px-0.5 transition enabled:hover:ring-2 enabled:hover:ring-primary/40 ${w.type === 'audio_event' ? 'italic' : ''} ${
                                            second ? speakerTone(splitSpeakers, splitSpeaker) : ''
                                        } ${current ? 'underline decoration-primary decoration-2 underline-offset-4' : ''}`}>
                                        {w.text}
                                    </button>
                                </React.Fragment>
                            )
                        })}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted">Second part said by</span>
                        <SpeakerPicker
                            speakers={splitSpeakers}
                            current={splitSpeaker}
                            disabled={saving}
                            label="Who said the second part?"
                            title="Who said the second part"
                            onPick={id => setSplitSpeaker(id)}
                        />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button size="sm" loading={saving} disabled={splitAt === null} icon={<Scissors className="h-4 w-4" />} onClick={saveSplit}>
                            Split line
                        </Button>
                        <Button size="sm" variant="secondary" disabled={saving} icon={<X className="h-4 w-4" />} onClick={cancelSplit}>
                            Cancel
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onSeek(splitAt !== null ? Math.max(segment.words[splitAt].start - 1, segment.start) : segment.start)}>
                            {splitAt !== null ? 'Play around the split' : 'Play this part'}
                        </Button>
                    </div>
                </div>
            ) : (
                <p className="text-[15px] leading-relaxed text-body">
                    {segment.words.map((w, i) => {
                        const current = active && activeTime! >= w.start && activeTime! < Math.max(w.end, w.start + 0.15)
                        return (
                            <React.Fragment key={i}>
                                {i > 0 && ' '}
                                <span
                                    onClick={() => onSeek(w.start)}
                                    className={`cursor-pointer rounded px-px hover:bg-primary-mint ${w.type === 'audio_event' ? 'italic text-muted' : ''} ${current ? 'bg-primary-mint text-dark' : ''}`}>
                                    {w.text}
                                </span>
                            </React.Fragment>
                        )
                    })}
                </p>
            )}
        </li>
    )
})

function RenameSpeakersModal({ open, transcription, onClose, onSaved }: { open: boolean; transcription: Transcription; onClose: () => void; onSaved: (t: Transcription) => void }) {
    const [names, setNames] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)
    const [err, setErr] = useState('')

    React.useEffect(() => {
        if (open) {
            setErr('')
            setNames(Object.fromEntries((transcription.speakers ?? []).map(s => [s.id, s.name])))
        }
    }, [open, transcription.speakers])

    const save = async () => {
        setSaving(true)
        setErr('')
        try {
            const speakers = (transcription.speakers ?? []).map(s => ({ id: s.id, name: names[s.id]?.trim() || `Speaker ${s.id}` }))
            const res = await axios.put(`/api/transcriptions/${transcription.id}`, { speakers })
            onSaved(res.data.transcription)
        } catch (e) {
            setErr(errorMessage(e))
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Rename speakers"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button loading={saving} onClick={save}>
                        Save names
                    </Button>
                </>
            }>
            <div className="space-y-3">
                {err && <Alert tone="error">{err}</Alert>}
                {(transcription.speakers ?? []).map(s => (
                    <Input
                        key={s.id}
                        id={`spk-${s.id}`}
                        label={`Speaker ${s.id}`}
                        value={names[s.id] ?? ''}
                        maxLength={60}
                        onChange={e => setNames(n => ({ ...n, [s.id]: e.target.value }))}
                        placeholder={`Speaker ${s.id}`}
                    />
                ))}
            </div>
        </Modal>
    )
}
