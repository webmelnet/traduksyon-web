import type { CommitteeReport, MinutesStatus, ReportContent, ReportFinding, ReportPerson } from '@/types'

export const REPORT_STATUS: Record<MinutesStatus, { label: string; tone: 'gray' | 'amber' | 'green' | 'red' | 'purple' }> = {
    waiting: { label: 'Waiting for source…', tone: 'amber' },
    queued: { label: 'Queued', tone: 'gray' },
    processing: { label: 'Writing…', tone: 'purple' },
    completed: { label: 'Ready', tone: 'green' },
    failed: { label: 'Failed', tone: 'red' },
}

export const SOURCE_LABELS: Record<string, string> = { minutes: 'From minutes', transcript: 'From transcript' }

/** Headings and fixed sentences follow the report's language, so a "Full Tagalog" report has no English in it. */
export interface ReportLabels {
    document: string
    reportNo: string
    details: string
    to: string
    addressedTo: string
    background: string
    findings: string
    findingsLead: string
    recommendations: string
    recommendationsLead: string
    action: string
    recommendation: string
    notes: string
    none: string
}

const LABELS: Record<string, ReportLabels> = {
    eng: {
        document: 'Committee report',
        reportNo: 'Committee Report No.',
        details: 'Details of the Committee Report No.',
        to: 'TO:',
        addressedTo: 'The Honorable Presiding Officer and Members of the August Body',
        background: 'Background',
        findings: 'Findings and Observations',
        findingsLead: 'After careful review and deliberation, the Committee noted the following:',
        recommendations: 'Committee Recommendations',
        recommendationsLead: 'In view of the foregoing findings and observations, the Committee respectfully recommends:',
        action: 'Committee Action',
        recommendation: 'Recommendation',
        notes: 'Notes',
        none: 'None recorded.',
    },
    fil: {
        document: 'Ulat ng komite',
        reportNo: 'Ulat ng Komite Blg.',
        details: 'Mga Detalye ng Ulat ng Komite Blg.',
        to: 'PARA SA:',
        addressedTo: 'Ang Kagalang-galang na Tagapangulong Pinuno at mga Kasapi ng Kapulungan',
        background: 'Kaligiran',
        findings: 'Mga Natuklasan at Obserbasyon',
        findingsLead: 'Matapos ang masusing pagsusuri at deliberasyon, napansin ng Komite ang mga sumusunod:',
        recommendations: 'Mga Rekomendasyon ng Komite',
        recommendationsLead: 'Bunsod ng mga natuklasan at obserbasyong ito, magalang na inirerekomenda ng Komite ang:',
        action: 'Aksyon ng Komite',
        recommendation: 'Rekomendasyon',
        notes: 'Tala',
        none: 'Walang naitala.',
    },
}

export const reportLabels = (lang?: string | null): ReportLabels => LABELS[lang ?? 'eng'] ?? LABELS.eng

export const isReportBusy = (r?: Pick<CommitteeReport, 'status'> | null) => !!r && ['waiting', 'queued', 'processing'].includes(r.status)

export const emptyReport = (title = ''): ReportContent => ({
    title,
    report_no: null,
    committee: null,
    subject: '',
    addressed_to: null,
    referral: '',
    background: '',
    findings: [],
    recommendations: [],
    committee_action: '',
    recommendation: '',
    signatories: [],
    notes: null,
})

export const personLine = (p: ReportPerson) => (p.role ? `${p.name} — ${p.role}` : p.name)

/** "DETAILS OF THE COMMITTEE REPORT NO. 078-2026", with a blank to fill in when the number isn't known yet. */
export const reportNoLine = (c: ReportContent, L: ReportLabels, prefix = L.details) => `${prefix} ${c.report_no || '________'}`.toUpperCase()

/** Paragraphs separated by blank lines / line breaks. */
export const paragraphs = (text: string) => text.split(/\n+/).map(p => p.trim()).filter(Boolean)

/** "On Budgetary Requirements. The CDRRMO disclosed…" — the topic is printed in bold before the text. */
export const findingTopic = (f: ReportFinding) => (f.topic ? f.topic.trim().replace(/[.,:;]+$/, '') + '.' : '')

/** Plain-text report, also used for "Copy". */
export function reportToText(c: ReportContent, lang?: string | null): string {
    const L = reportLabels(lang)
    const out: string[] = [reportNoLine(c, L, L.details), '', `${L.to} ${(c.addressed_to || L.addressedTo).toUpperCase()}`, '']
    paragraphs(c.referral).forEach(p => out.push(p, ''))
    const section = (h: string, body: () => void) => {
        out.push(h.toUpperCase())
        body()
        out.push('')
    }
    if (c.background) section(`I. ${L.background}`, () => out.push(paragraphs(c.background).join('\n\n')))
    section(`II. ${L.findings}`, () => {
        out.push(L.findingsLead)
        if (!c.findings.length) out.push(L.none)
        c.findings.forEach((f, i) => out.push(`${i + 1}. ${[findingTopic(f), f.text].filter(Boolean).join(' ')}`))
    })
    section(`III. ${L.recommendations}`, () => {
        out.push(L.recommendationsLead)
        if (!c.recommendations.length) out.push(L.none)
        c.recommendations.forEach((r, i) => out.push(`${i + 1}. ${r}`))
    })
    if (c.committee_action) section(`IV. ${L.action}`, () => out.push(paragraphs(c.committee_action).join('\n\n')))
    if (c.recommendation) section(L.recommendation, () => out.push(paragraphs(c.recommendation).join('\n\n')))
    signatures(out, c)
    if (c.notes) out.push('', `${L.notes}: ${c.notes}`)
    return out.join('\n')
}

function signatures(out: string[], c: ReportContent) {
    if (c.committee) out.push(c.committee, '')
    c.signatories.forEach(p => out.push('________________________', p.name.toUpperCase(), ...(p.role ? [p.role] : []), ''))
}
