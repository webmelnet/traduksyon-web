import type { DownloadFormat } from '@/components/ui/DownloadMenu'
import type { MinutesContent } from '@/types'
import { type MinutesLabels, minutesLabels, minutesToText } from './helpers'

const safeName = (title: string) => (title.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'minutes') + ' - minutes'

function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Builds the file in the browser; docx/jspdf are imported on demand so they stay out of the page bundle. */
export async function exportMinutes(format: DownloadFormat, c: MinutesContent, lang?: string | null) {
    const name = safeName(c.title)
    const L = minutesLabels(lang)
    if (format === 'txt') saveBlob(new Blob([minutesToText(c, lang)], { type: 'text/plain;charset=utf-8' }), `${name}.txt`)
    else if (format === 'docx') saveBlob(await buildDocx(c, L), `${name}.docx`)
    else saveBlob(await buildPdf(c, L), `${name}.pdf`)
}

async function buildDocx(c: MinutesContent, L: MinutesLabels): Promise<Blob> {
    const { BorderStyle, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } = await import('docx')

    const h2 = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 }, children: [new TextRun({ text, color: '0F766E' })] })
    const bullet = (text: string, level = 0) => new Paragraph({ bullet: { level }, spacing: { after: 60 }, children: [new TextRun(text)] })
    const cell = (text: string, bold = false) =>
        new TableCell({ margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [new Paragraph({ children: [new TextRun({ text, bold })] })] })
    const border = { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' }

    const children: any[] = [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: c.title, color: '142C3E' })] }),
        new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: [L.document, c.meeting_date].filter(Boolean).join(' · '), color: '64748B', size: 18 })] }),
    ]

    if (c.attendees.length) {
        children.push(h2(L.attendees), ...c.attendees.map(a => bullet(a.role ? `${a.name} — ${a.role}` : a.name)))
    }
    if (c.summary) children.push(h2(L.summary), new Paragraph({ spacing: { after: 120, line: 300 }, children: [new TextRun(c.summary)] }))
    if (c.agenda.length) {
        children.push(h2(L.discussion))
        c.agenda.forEach((a, i) => {
            children.push(new Paragraph({ spacing: { before: 120, after: 60 }, children: [new TextRun({ text: `${i + 1}. ${a.topic}`, bold: true })] }))
            a.discussion.forEach(d => children.push(bullet(d, 0)))
        })
    }
    if (c.decisions.length) children.push(h2(L.decisions), ...c.decisions.map(d => bullet(d)))
    if (c.action_items.length) {
        children.push(
            h2(L.actionItems),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
                rows: [
                    new TableRow({ tableHeader: true, children: [cell(L.task, true), cell(L.owner, true), cell(L.due, true)] }),
                    ...c.action_items.map(a => new TableRow({ children: [cell(a.task), cell(a.owner || '—'), cell(a.due || '—')] })),
                ],
            }),
        )
    }
    if (c.next_meeting) children.push(h2(L.nextMeeting), new Paragraph(c.next_meeting))
    if (c.notes) children.push(new Paragraph({ spacing: { before: 280 }, children: [new TextRun({ text: `${L.notes}: ${c.notes}`, italics: true, color: '64748B', size: 18 })] }))

    const doc = new Document({
        title: c.title,
        creator: 'Traduksyon.com',
        styles: { default: { document: { run: { font: 'Calibri', size: 22, color: '334155' } } } },
        sections: [{ children }],
    })
    return Packer.toBlob(doc)
}

async function buildPdf(c: MinutesContent, L: MinutesLabels): Promise<Blob> {
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
    const margin = 56
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const width = pageW - margin * 2
    let y = margin

    const ensure = (h: number) => {
        if (y + h > pageH - margin) {
            pdf.addPage()
            y = margin
        }
    }
    const write = (text: string, { size = 11, bold = false, color = '#334155', indent = 0, lineH = 15 } = {}) => {
        pdf.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(size).setTextColor(color)
        // Built-in Helvetica is WinAnsi-only and has no ₱ glyph.
        for (const line of pdf.splitTextToSize(text.replace(/₱\s?/g, 'PHP '), width - indent) as string[]) {
            ensure(lineH)
            pdf.text(line, margin + indent, y + size - 1)
            y += lineH
        }
    }
    const heading = (text: string) => {
        y += 10
        ensure(40) // keep a heading with its first line
        write(text.toUpperCase(), { size: 10, bold: true, color: '#0F766E', lineH: 16 })
        y += 2
    }
    const bullet = (text: string, indent = 0) => {
        pdf.setFont('helvetica', 'normal').setFontSize(11)
        ensure(15)
        pdf.setTextColor('#334155').text('•', margin + indent, y + 10)
        write(text, { indent: indent + 12 })
        y += 2
    }

    write(c.title, { size: 18, bold: true, color: '#142C3E', lineH: 22 })
    write([L.document, c.meeting_date].filter(Boolean).join(' · '), { size: 9, color: '#64748B', lineH: 13 })
    y += 6
    pdf.setDrawColor('#E2E8F0').line(margin, y, pageW - margin, y)
    y += 8

    if (c.attendees.length) {
        heading(L.attendees)
        c.attendees.forEach(a => bullet(a.role ? `${a.name} — ${a.role}` : a.name))
    }
    if (c.summary) {
        heading(L.summary)
        write(c.summary)
    }
    if (c.agenda.length) {
        heading(L.discussion)
        c.agenda.forEach((a, i) => {
            y += 4
            ensure(30)
            write(`${i + 1}. ${a.topic}`, { bold: true })
            a.discussion.forEach(d => bullet(d, 12))
        })
    }
    if (c.decisions.length) {
        heading(L.decisions)
        c.decisions.forEach(d => bullet(d))
    }
    if (c.action_items.length) {
        heading(L.actionItems)
        c.action_items.forEach(a => {
            bullet(a.task)
            const meta = [a.owner && `${L.owner}: ${a.owner}`, a.due && `${L.due}: ${a.due}`].filter(Boolean).join('   ·   ')
            if (meta) write(meta, { size: 9, color: '#64748B', indent: 12, lineH: 13 })
            y += 2
        })
    }
    if (c.next_meeting) {
        heading(L.nextMeeting)
        write(c.next_meeting)
    }
    if (c.notes) {
        y += 12
        write(`${L.notes}: ${c.notes}`, { size: 9, color: '#64748B', lineH: 13 })
    }

    const pages = pdf.getNumberOfPages()
    pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor('#94A3B8')
    for (let i = 1; i <= pages; i++) {
        pdf.setPage(i)
        pdf.text('Traduksyon.com', margin, pageH - 28)
        pdf.text(`${i} / ${pages}`, pageW - margin, pageH - 28, { align: 'right' })
    }
    return pdf.output('blob')
}
