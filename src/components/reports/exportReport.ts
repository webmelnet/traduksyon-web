import type { DownloadFormat } from '@/components/ui/DownloadMenu'
import type { ReportContent } from '@/types'
import { findingTopic, paragraphs, type ReportLabels, reportLabels, reportNoLine, reportToText } from './helpers'

const safeName = (title: string) => (title.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'report') + ' - committee report'

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
export async function exportReport(format: DownloadFormat, c: ReportContent, lang?: string | null) {
    const name = safeName(c.title)
    const L = reportLabels(lang)
    if (format === 'txt') saveBlob(new Blob([reportToText(c, lang)], { type: 'text/plain;charset=utf-8' }), `${name}.txt`)
    else if (format === 'docx') saveBlob(await buildDocx(c, L), `${name}.docx`)
    else saveBlob(await buildPdf(c, L), `${name}.pdf`)
}

async function buildDocx(c: ReportContent, L: ReportLabels): Promise<Blob> {
    const { AlignmentType, Document, Packer, Paragraph, TextRun } = await import('docx')

    const dark = '142C3E'
    const h2 = (text: string) => new Paragraph({ spacing: { before: 280, after: 120 }, children: [new TextRun({ text: text.toUpperCase(), color: dark, bold: true })] })
    const body = (text: string, after = 120) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after, line: 300 }, children: [new TextRun(text)] })
    const paras = (text: string) => paragraphs(text).map(t => body(t))
    const numbered = (n: number, runs: InstanceType<typeof TextRun>[]) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, indent: { left: 360, hanging: 360 }, spacing: { after: 100, line: 280 }, children: [new TextRun(`${n}.\t`), ...runs] })
    const signatures = () =>
        c.signatories.flatMap(p => [
            new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 600 }, children: [new TextRun({ text: p.name.toUpperCase(), bold: true })] }),
            ...(p.role ? [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: p.role, italics: true })] })] : []),
        ])

    const children: any[] = [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 280 }, children: [new TextRun({ text: reportNoLine(c, L), bold: true, color: dark, size: 24 })] }),
        new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `${L.to} `, bold: true }), new TextRun({ text: (c.addressed_to || L.addressedTo).toUpperCase(), bold: true })] }),
        ...paras(c.referral),
    ]
    if (c.background) children.push(h2(`I. ${L.background}`), ...paras(c.background))
    children.push(h2(`II. ${L.findings}`), body(L.findingsLead))
    c.findings.forEach((f, i) => children.push(numbered(i + 1, [...(f.topic ? [new TextRun({ text: `${findingTopic(f)} `, bold: true })] : []), new TextRun(f.text)])))
    children.push(h2(`III. ${L.recommendations}`), body(L.recommendationsLead))
    c.recommendations.forEach((r, i) => children.push(numbered(i + 1, [new TextRun(r)])))
    if (c.committee_action) children.push(h2(`IV. ${L.action}`), ...paras(c.committee_action))
    if (c.recommendation) children.push(h2(L.recommendation), ...paras(c.recommendation))
    if (c.committee) children.push(new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: c.committee, bold: true })] }))
    children.push(...signatures())
    if (c.notes) children.push(new Paragraph({ spacing: { before: 280 }, children: [new TextRun({ text: `${L.notes}: ${c.notes}`, italics: true, color: '64748B', size: 18 })] }))

    const doc = new Document({
        title: c.title,
        creator: 'Traduksyon.com',
        styles: { default: { document: { run: { font: 'Calibri', size: 22, color: '1E293B' } } } },
        sections: [{ children }],
    })
    return Packer.toBlob(doc)
}

async function buildPdf(c: ReportContent, L: ReportLabels): Promise<Blob> {
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
    const margin = 56
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const width = pageW - margin * 2
    let y = margin

    // Built-in Helvetica is WinAnsi-only and has no ₱ glyph.
    const clean = (t: string) => t.replace(/₱\s?/g, 'PHP ')
    const ensure = (h: number) => {
        if (y + h > pageH - margin) {
            pdf.addPage()
            y = margin
        }
    }
    type Opts = { size?: number; bold?: boolean; italic?: boolean; color?: string; indent?: number; lineH?: number; align?: 'left' | 'center' | 'right'; w?: number; x?: number }
    const write = (text: string, { size = 11, bold = false, italic = false, color = '#1E293B', indent = 0, lineH = 15, align = 'left', w, x }: Opts = {}) => {
        pdf.setFont('helvetica', bold ? 'bold' : italic ? 'italic' : 'normal').setFontSize(size).setTextColor(color)
        const left = x ?? margin + indent
        const boxW = w ?? width - indent
        for (const l of pdf.splitTextToSize(clean(text), boxW) as string[]) {
            ensure(lineH)
            if (align === 'center') pdf.text(l, pageW / 2, y + size - 1, { align: 'center' })
            else if (align === 'right') pdf.text(l, pageW - margin, y + size - 1, { align: 'right' })
            else pdf.text(l, left, y + size - 1)
            y += lineH
        }
    }
    const heading = (text: string) => {
        y += 12
        ensure(40)
        write(text.toUpperCase(), { size: 10.5, bold: true, color: '#142C3E', lineH: 16 })
        y += 2
    }
    const paras = (text: string) =>
        paragraphs(text).forEach(p => {
            write(p)
            y += 6
        })
    const numbered = (n: number, text: string, boldLead = '') => {
        ensure(15)
        pdf.setFont('helvetica', 'normal').setFontSize(11).setTextColor('#1E293B').text(`${n}.`, margin, y + 10)
        if (boldLead) write(boldLead, { bold: true, indent: 18 })
        write(text, { indent: 18 })
        y += 4
    }
    const signatures = () =>
        c.signatories.forEach(p => {
            ensure(70)
            y += 34
            write(p.name.toUpperCase(), { bold: true, align: 'right', color: '#142C3E' })
            if (p.role) write(p.role, { italic: true, align: 'right', size: 10 })
        })

    write(reportNoLine(c, L), { size: 13, bold: true, color: '#142C3E', align: 'center', lineH: 18 })
    y += 12
    write(`${L.to} ${(c.addressed_to || L.addressedTo).toUpperCase()}`, { bold: true })
    y += 8
    paras(c.referral)
    if (c.background) {
        heading(`I. ${L.background}`)
        paras(c.background)
    }
    heading(`II. ${L.findings}`)
    write(L.findingsLead)
    y += 4
    c.findings.forEach((f, i) => numbered(i + 1, f.text, findingTopic(f)))
    heading(`III. ${L.recommendations}`)
    write(L.recommendationsLead)
    y += 4
    c.recommendations.forEach((r, i) => numbered(i + 1, r))
    if (c.committee_action) {
        heading(`IV. ${L.action}`)
        paras(c.committee_action)
    }
    if (c.recommendation) {
        heading(L.recommendation)
        paras(c.recommendation)
    }
    if (c.committee) {
        y += 16
        write(c.committee, { bold: true })
    }
    signatures()
    if (c.notes) {
        y += 16
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
