import type { MeetingMinutes, MinutesContent, MinutesStatus } from '@/types'

export const MINUTES_STATUS: Record<MinutesStatus, { label: string; tone: 'gray' | 'amber' | 'green' | 'red' | 'purple' }> = {
    waiting: { label: 'Transcribing…', tone: 'amber' },
    queued: { label: 'Queued', tone: 'gray' },
    processing: { label: 'Writing…', tone: 'purple' },
    completed: { label: 'Ready', tone: 'green' },
    failed: { label: 'Failed', tone: 'red' },
}

export const OUTPUT_LANGUAGE_LABELS: Record<string, string> = { eng: 'Full English', fil: 'Full Tagalog' }

/** Section headings follow the language the minutes are written in, so "Full Tagalog" really is all Tagalog. */
export interface MinutesLabels {
    document: string
    meetingDate: string
    attendees: string
    summary: string
    discussion: string
    decisions: string
    actionItems: string
    task: string
    owner: string
    due: string
    nextMeeting: string
    notes: string
    none: string
    noOwner: string
    noDue: string
}

const LABELS: Record<string, MinutesLabels> = {
    eng: {
        document: 'Minutes of meeting',
        meetingDate: 'Meeting date',
        attendees: 'Attendees',
        summary: 'Summary',
        discussion: 'Discussion',
        decisions: 'Decisions',
        actionItems: 'Action items',
        task: 'Task',
        owner: 'Owner',
        due: 'Due',
        nextMeeting: 'Next meeting',
        notes: 'Notes',
        none: 'None recorded.',
        noOwner: 'No owner',
        noDue: 'No due date',
    },
    fil: {
        document: 'Katitikan ng pulong',
        meetingDate: 'Petsa ng pulong',
        attendees: 'Mga dumalo',
        summary: 'Buod',
        discussion: 'Mga napag-usapan',
        decisions: 'Mga napagpasyahan',
        actionItems: 'Mga gawain',
        task: 'Gawain',
        owner: 'Responsable',
        due: 'Takdang petsa',
        nextMeeting: 'Susunod na pulong',
        notes: 'Tala',
        none: 'Walang naitala.',
        noOwner: 'Walang responsable',
        noDue: 'Walang takdang petsa',
    },
}

export const minutesLabels = (lang?: string | null): MinutesLabels => LABELS[lang ?? 'eng'] ?? LABELS.eng

export const isMinutesBusy = (m?: Pick<MeetingMinutes, 'status'> | null) => !!m && ['waiting', 'queued', 'processing'].includes(m.status)

export const emptyMinutes = (title = ''): MinutesContent => ({
    title,
    meeting_date: null,
    attendees: [],
    summary: '',
    agenda: [],
    decisions: [],
    action_items: [],
    next_meeting: null,
    notes: null,
})

/** Plain-text minutes, also used for "Copy". */
export function minutesToText(c: MinutesContent, lang?: string | null): string {
    const L = minutesLabels(lang)
    const out: string[] = [c.title.toUpperCase(), L.document]
    if (c.meeting_date) out.push(`${L.meetingDate}: ${c.meeting_date}`)
    out.push('')
    if (c.attendees.length) {
        out.push(L.attendees.toUpperCase())
        c.attendees.forEach(a => out.push(`- ${a.name}${a.role ? ` (${a.role})` : ''}`))
        out.push('')
    }
    if (c.summary) out.push(L.summary.toUpperCase(), c.summary, '')
    if (c.agenda.length) {
        out.push(L.discussion.toUpperCase())
        c.agenda.forEach((a, i) => {
            out.push(`${i + 1}. ${a.topic}`)
            a.discussion.forEach(d => out.push(`   - ${d}`))
        })
        out.push('')
    }
    if (c.decisions.length) {
        out.push(L.decisions.toUpperCase())
        c.decisions.forEach(d => out.push(`- ${d}`))
        out.push('')
    }
    if (c.action_items.length) {
        out.push(L.actionItems.toUpperCase())
        c.action_items.forEach(a => out.push(`- ${a.task}${a.owner ? ` — ${a.owner}` : ''}${a.due ? ` (${L.due.toLowerCase()}: ${a.due})` : ''}`))
        out.push('')
    }
    if (c.next_meeting) out.push(`${L.nextMeeting.toUpperCase()}: ${c.next_meeting}`, '')
    if (c.notes) out.push(`${L.notes}: ${c.notes}`, '')
    return out.join('\n')
}
