import type { CreditCosts, CreditState } from '@/types'

export function formatCredits(n: number): string {
    return `${new Intl.NumberFormat('en-PH').format(n)} credit${Math.abs(n) === 1 ? '' : 's'}`
}

/** Same rule as the API (CreditService::transcriptionCost): per started minute. */
export function transcriptionCost(seconds: number | null | undefined, costs: CreditCosts): number | null {
    if (!seconds || seconds <= 0) return null
    return Math.max(1, Math.ceil(seconds / 60)) * costs.transcription_per_minute
}

/** True when the user can't pay `cost` (staff are never charged). */
export function cannotAfford(credits: CreditState | undefined, cost: number | null): boolean {
    if (!credits || credits.exempt || cost == null) return false
    return credits.balance < cost
}

/** The API's 402 for a job the balance can't cover. */
export function isInsufficientCredits(err: any): boolean {
    return err?.response?.status === 402 && err?.response?.data?.code === 'insufficient_credits'
}

/** Reads a local audio/video file's length in the browser, for the cost estimate. Null if it can't. */
export function readMediaDuration(file: File): Promise<number | null> {
    return new Promise(resolve => {
        const url = URL.createObjectURL(file)
        const el = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio')
        const done = (v: number | null) => {
            URL.revokeObjectURL(url)
            resolve(v)
        }
        const timer = setTimeout(() => done(null), 8000)
        el.preload = 'metadata'
        el.onloadedmetadata = () => {
            clearTimeout(timer)
            done(Number.isFinite(el.duration) && el.duration > 0 ? el.duration : null)
        }
        el.onerror = () => {
            clearTimeout(timer)
            done(null)
        }
        el.src = url
    })
}
