/** DD/MM/YYYY — project-wide default date format. */
export function formatDate(value?: string | null): string {
    if (!value) return '—'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}/${mm}/${d.getFullYear()}`
}

export function formatDateTime(value?: string | null): string {
    if (!value) return '—'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${formatDate(value)} ${hh}:${mi}`
}

/** Amounts are stored in centavos. */
export function formatMoney(centavos: number, currency = 'PHP'): string {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format((centavos ?? 0) / 100)
}

export function errorMessage(error: any, fallback = 'Something went wrong. Please try again.'): string {
    const data = error?.response?.data
    if (data?.errors) {
        const first = Object.values(data.errors)[0] as string[] | undefined
        if (first?.[0]) return first[0]
    }
    return data?.message || fallback
}

export function initials(name?: string): string {
    if (!name) return '?'
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0]!.toUpperCase())
        .join('')
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
    card: 'Credit / Debit Card',
    gcash: 'GCash',
    paymaya: 'Maya',
    dob: 'Online Banking',
    dob_ubp: 'UnionBank Online',
    brankas_bdo: 'BDO Online',
    qrph: 'QR Ph (any bank app)',
    grab_pay: 'GrabPay',
    billease: 'BillEase',
    bank_transfer: 'Bank Transfer',
}
