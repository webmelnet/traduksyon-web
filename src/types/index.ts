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

// ── Minutes of meeting ─────────────────────────────────────
export type MinutesStatus = 'waiting' | 'queued' | 'processing' | 'completed' | 'failed'

export interface MinutesContent {
    title: string
    meeting_date: string | null
    attendees: { name: string; role: string | null }[]
    summary: string
    agenda: { topic: string; discussion: string[] }[]
    decisions: string[]
    action_items: { task: string; owner: string | null; due: string | null }[]
    next_meeting: string | null
    notes: string | null
}

export interface MeetingMinutes {
    id: number
    transcription_id: number
    title: string
    output_language: string
    instructions?: string | null
    status: MinutesStatus
    provider?: string
    model?: string | null
    content?: MinutesContent | null
    error: string | null
    created_at: string
    completed_at: string | null
    transcription?: Pick<Transcription, 'id' | 'title'> & Partial<Pick<Transcription, 'status' | 'duration_secs' | 'language' | 'created_at'>>
}

export interface MinutesOptions {
    output_languages: { code: string; label: string }[]
    driver: 'fake' | 'anthropic'
    transcriptions: Pick<Transcription, 'id' | 'title' | 'status' | 'duration_secs' | 'language' | 'created_at'>[]
}

// ── Committee reports ("Summarize") ────────────────────────
export type ReportSource = 'minutes' | 'transcript'

export interface ReportPerson {
    name: string
    role: string | null
}

/** Sangguniang Panlungsod "Details of the Committee Report" format (no cover page). See the API's ReportContent. */
export interface ReportContent {
    title: string
    report_no: string | null
    committee: string | null
    subject: string
    addressed_to: string | null
    referral: string
    background: string
    findings: ReportFinding[]
    recommendations: string[]
    committee_action: string
    recommendation: string
    signatories: ReportPerson[]
    notes: string | null
}

export interface ReportFinding {
    topic: string | null
    text: string
}

export interface CommitteeReport {
    id: number
    source: ReportSource
    meeting_minute_id: number | null
    transcription_id: number | null
    title: string
    output_language: string
    instructions?: string | null
    status: MinutesStatus
    provider?: string
    model?: string | null
    content?: ReportContent | null
    error: string | null
    created_at: string
    completed_at: string | null
    minutes?: Pick<MeetingMinutes, 'id' | 'title' | 'status' | 'transcription_id'> | null
    transcription?: Pick<Transcription, 'id' | 'title' | 'status'> & Partial<Pick<Transcription, 'duration_secs'>> | null
}

export interface ReportOptions {
    output_languages: { code: string; label: string }[]
    driver: 'fake' | 'anthropic'
    minutes: Pick<MeetingMinutes, 'id' | 'title' | 'status' | 'output_language' | 'created_at'>[]
    transcriptions: Pick<Transcription, 'id' | 'title' | 'status' | 'duration_secs' | 'language' | 'created_at'>[]
}
