/** Mirrors App\Support\SiteSchema in traduksyon-api (served by GET /api/admin/site). */
export type FieldType = 'string' | 'text' | 'url' | 'email' | 'bool' | 'icon' | 'list'

export interface FieldSpec {
    type: FieldType
    label: string
    hint?: string
    max?: number
    max_items?: number
    /** list: which sub-field to show as the row title when collapsed */
    item_label?: string
    fields?: Record<string, FieldSpec>
}

export interface SectionSchema {
    key: string
    label: string
    description: string | null
    fields: Record<string, FieldSpec>
}

export type SectionContent = Record<string, any>

export interface SiteAdminPayload {
    schema: SectionSchema[]
    icons: string[]
    content: Record<string, SectionContent>
    meta: Record<string, { updated_at: string; updated_by: string | null }>
    marketing_url: string
}

export interface SiteLead {
    id: number
    name: string
    email: string
    organization: string | null
    phone: string | null
    message: string
    status: 'new' | 'contacted' | 'closed'
    notes: string | null
    created_at: string
}
