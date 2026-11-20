export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'exempt'

export interface Plan {
    id: number
    code: string
    name: string
    description: string | null
    price: number // in centavos
    currency: string
    interval: 'month' | 'year'
    interval_count: number
    features: string[] | null
    is_featured: boolean
}

export interface SubscriptionState {
    status: SubscriptionStatus
    access: boolean
    on_trial: boolean
    trial_ends_at: string | null
    trial_days_left: number
    ends_at: string | null
    days_left: number
    plan: Pick<Plan, 'id' | 'code' | 'name'> | null
}

export interface Role {
    id: number
    name: string
}

export interface AuthUser {
    id: number
    name: string
    email: string
    email_verified_at: string | null
    is_active: boolean
    role: string | null
    roles?: Role[]
    permissions?: string[]
    subscription: SubscriptionState
}

export interface ManagedUser {
    id: number
    name: string
    email: string
    is_active: boolean
    email_verified_at: string | null
    last_login_at: string | null
    created_at: string
    deleted_at?: string | null
    roles_list: string[]
    invitation_pending: boolean
    subscription: SubscriptionState
}

export interface Payment {
    id: number
    reference: string
    provider: string
    payment_method: string | null
    amount: number
    currency: string
    status: 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled'
    paid_at: string | null
    created_at: string
    plan?: Pick<Plan, 'id' | 'name' | 'code'>
    user?: Pick<ManagedUser, 'id' | 'name' | 'email'>
}

export interface Paginated<T> {
    data: T[]
    current_page: number
    last_page: number
    per_page: number
    total: number
}

export type FieldErrors = Record<string, string[]>

// ── Transcribe ─────────────────────────────────────────────
export type TranscriptionStatus = 'queued' | 'processing' | 'completed' | 'failed'
export type TranscriptionMode = 'verbatim' | 'clean'

export interface TranscriptWord {
    text: string
    start: number
    end: number
    type: 'word' | 'audio_event'
}

export interface TranscriptSegment {
    speaker: string // "A", "B"...
    start: number
    end: number
    text: string
    words: TranscriptWord[]
    /** Set once the user has corrected this segment by hand. */
    edited?: boolean
}

export interface TranscriptSpeaker {
    id: string
    name: string
}

export interface Transcription {
    id: number
    title: string
    original_filename: string
    mime_type?: string | null
    size_bytes: number
    duration_secs: number | null
    language: string
    mode: TranscriptionMode
    num_speakers?: number | null
    keyterms?: string[] | null
    status: TranscriptionStatus
    provider?: string
    detected_language: string | null
    language_probability?: number | null
    text?: string | null
    segments?: TranscriptSegment[] | null
    speakers?: TranscriptSpeaker[] | null
    error: string | null
    created_at: string
    completed_at: string | null
}

export interface TranscriptionOptions {
    languages: { code: string; label: string; supported: boolean }[]
    driver: 'fake' | 'elevenlabs'
    max_upload_mb: number
    extensions: string[]
}
