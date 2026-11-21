import type { CommitteeReport, MinutesStatus, ReportContent, ReportPerson } from '@/types'

export const REPORT_STATUS: Record<MinutesStatus, { label: string; tone: 'gray' | 'amber' | 'green' | 'red' | 'purple' }> = {
    waiting: { label: 'Waiting for source…', tone: 'amber' },
    queued: { label: 'Queued', tone: 'gray' },
    processing: { label: 'Writing…', tone: 'purple' },
    completed: { label: 'Ready', tone: 'green' },
    failed: { label: 'Failed', tone: 'red' },
}

export const SOURCE_LABELS: Record<string, string> = { minutes: 'From minutes', transcript: 'From transcript' }

/** Headings follow the report's language, so a "Full Tagalog" report has no English headings. */
export interface ReportLabels {
    document: string
    committee: string
    reportNo: string
    date: string
    to: string
    subject: string
    introduction: string
    proceedings: string
    membersPresent: string
    othersPresent: string
    findings: string
    recommendations: string
    conclusion: string
    submitted: string
    notes: string
    none: string
}

const LABELS: Record<string, ReportLabels> = {
    eng: {
        document: 'Committee report',
        committee: 'Committee',
        reportNo: 'Report No.',
        date: 'Date',
        to: 'To',
        subject: 'Subject',
        introduction: 'Introduction',
        proceedings: 'Committee proceedings',
        membersPresent: 'Members present',
        othersPresent: 'Resource persons and guests',
        findings: 'Findings and discussion',
        recommendations: 'Recommendations',
        conclusion: 'Conclusion',
        submitted: 'Respectfully submitted:',
        notes: 'Notes',
        none: 'None recorded.',
    },
    fil: {
        document: 'Ulat ng komite',
        committee: 'Komite',
        reportNo: 'Ulat Blg.',
        date: 'Petsa',
        to: 'Para sa',
        subject: 'Paksa',
        introduction: 'Panimula',
        proceedings: 'Mga pagdinig ng komite',
        membersPresent: 'Mga kasaping dumalo',
        othersPresent: 'Mga inanyayahan at panauhin',
        findings: 'Mga natuklasan at talakayan',
        recommendations: 'Mga rekomendasyon',
        conclusion: 'Konklusyon',
        submitted: 'Magalang na isinumite:',
        notes: 'Tala',
        none: 'Walang naitala.',
    },
}

export const reportLabels = (lang?: string | null): ReportLabels => LABELS[lang ?? 'eng'] ?? LABELS.eng

export const isReportBusy = (r?: Pick<CommitteeReport, 'status'> | null) => !!r && ['waiting', 'queued', 'processing'].includes(r.status)

export const emptyReport = (title = ''): ReportContent => ({
    title,
    committee: null,
    report_no: null,
    report_date: null,
    addressed_to: null,
    subject: '',
    introduction: '',
    proceedings: '',
    members_present: [],
    others_present: [],
    findings: [],
    recommendations: [],
    conclusion: '',
    notes: null,
})

export const personLine = (p: ReportPerson) => (p.role ? `${p.name} — ${p.role}` : p.name)

/** Header rows (Committee / Report No. / Date / To / Subject) that have a value. */
export function headerRows(c: ReportContent, L: ReportLabels): [string, string][] {
    return (
        [
            [L.committee, c.committee],
            [L.reportNo, c.report_no],
            [L.date, c.report_date],
            [L.to, c.addressed_to],
            [L.subject, c.subject],
        ] as [string, string | null][]
    ).filter((r): r is [string, string] => !!r[1])
}

/** Plain-text report, also used for "Copy". */
export function reportToText(c: ReportContent, lang?: string | null): string {
    const L = reportLabels(lang)
    const out: string[] = [L.document.toUpperCase(), c.title.toUpperCase(), '']
    headerRows(c, L).forEach(([k, v]) => out.push(`${k}: ${v}`))
    out.push('')
    const para = (h: string, text: string) => text && out.push(h.toUpperCase(), text, '')
    const people = (h: string, list: ReportPerson[]) => {
        if (!list.length) return
        out.push(h.toUpperCase())
        list.forEach(p => out.push(`- ${personLine(p)}`))
        out.push('')
    }
    para(`I. ${L.introduction}`, c.introduction)
    para(`II. ${L.proceedings}`, c.proceedings)
    people(L.membersPresent, c.members_present)
    people(L.othersPresent, c.others_present)
    if (c.findings.length) {
        out.push(`III. ${L.findings}`.toUpperCase())
        c.findings.forEach((f, i) => {
            out.push(`${i + 1}. ${f.topic}`)
            f.points.forEach(p => out.push(`   - ${p}`))
        })
        out.push('')
    }
    if (c.recommendations.length) {
        out.push(`IV. ${L.recommendations}`.toUpperCase())
        c.recommendations.forEach((r, i) => out.push(`${i + 1}. ${r}`))
        out.push('')
    }
    para(`V. ${L.conclusion}`, c.conclusion)
    if (c.members_present.length) {
        out.push(L.submitted, '')
        c.members_present.forEach(p => out.push('________________________', p.name, ...(p.role ? [p.role] : []), ''))
    }
    if (c.notes) out.push(`${L.notes}: ${c.notes}`, '')
    return out.join('\n')
}
