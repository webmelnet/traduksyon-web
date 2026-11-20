import type { TranscriptSegment, TranscriptSpeaker, TranscriptionStatus } from '@/types'

/** 75 → "1:15", 3725 → "1:02:05" */
export function formatTimestamp(secs?: number | null): string {
    if (secs == null || Number.isNaN(secs)) return '—'
    const s = Math.max(0, Math.floor(secs))
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const ss = String(s % 60).padStart(2, '0')
    return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export const LANGUAGE_LABELS: Record<string, string> = {
    auto: 'Auto-detect',
    eng: 'English',
    en: 'English',
    fil: 'Tagalog / Filipino',
    tl: 'Tagalog',
    tgl: 'Tagalog',
    bcl: 'Bicol',
    msb: 'Masbateño',
    ceb: 'Cebuano',
}

export const languageLabel = (code?: string | null) => (code ? LANGUAGE_LABELS[code] ?? code.toUpperCase() : '—')

export const MODE_LABELS = { verbatim: 'Verbatim', clean: 'Clean (in toto)' } as const

export const STATUS_META: Record<TranscriptionStatus, { label: string; tone: 'gray' | 'amber' | 'green' | 'red' }> = {
    queued: { label: 'Queued', tone: 'gray' },
    processing: { label: 'Transcribing…', tone: 'amber' },
    completed: { label: 'Ready', tone: 'green' },
    failed: { label: 'Failed', tone: 'red' },
}

/** Distinct, readable chip colours per speaker (cycles after 8). */
const SPEAKER_TONES = [
    'bg-primary-mint text-primary-deep',
    'bg-ai-soft text-ai',
    'bg-amber-100 text-amber-800',
    'bg-sky-100 text-sky-800',
    'bg-rose-100 text-rose-800',
    'bg-lime-100 text-lime-800',
    'bg-orange-100 text-orange-800',
    'bg-slate-200 text-slate-700',
]

export function speakerTone(speakers: TranscriptSpeaker[], id: string): string {
    const i = Math.max(0, speakers.findIndex(s => s.id === id))
    return SPEAKER_TONES[i % SPEAKER_TONES.length]
}

export function speakerName(speakers: TranscriptSpeaker[], id: string): string {
    return speakers.find(s => s.id === id)?.name || `Speaker ${id}`
}

/** Plain-text export using the current speaker names. */
export function transcriptToText(title: string, segments: TranscriptSegment[], speakers: TranscriptSpeaker[], withTimes = true): string {
    const body = segments
        .map(s => `${withTimes ? `[${formatTimestamp(s.start)}] ` : ''}${speakerName(speakers, s.speaker)}: ${s.text}`)
        .join('\n\n')
    return `${title}\n\n${body}\n`
}
