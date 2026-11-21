import type { DownloadFormat } from '@/components/ui/DownloadMenu'
import type { ReportContent } from '@/types'
import { headerRows, personLine, type ReportLabels, reportLabels, reportToText } from './helpers'

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
    const { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } = await import('docx')

    const h2 = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 }, children: [new TextRun({ text: text.toUpperCase(), color: '142C3E', bold: true, size: 22 })] })
    const body = (text: string) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 120, line: 300 }, children: [new TextRun(text)] })
    const bullet = (text: string) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun(text)] })
    const numbered = (n: number, text: string) => new Paragraph({ indent: { left: 360, hanging: 360 }, spacing: { after: 80 }, children: [new TextRun(`${n}.  ${text}`)] })
    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
    const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none }

    const children: any[] = [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: L.document.toUpperCase(), bold: true, color: '0F766E', size: 20 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: c.title, color: '142C3E', bold: true })] }),
    ]

    const rows = headerRows(c, L)
    if (rows.length) {
        children.push(
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: noBorders,
                rows: rows.map(
                    ([k, v]) =>
                        new TableRow({
                            children: [
                                new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: `${k}:`, bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ spacing: { after: 60 }, children: [new TextRun(v)] })] }),
                            ],
                        }),
                ),
            }),
            new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '94A3B8', space: 4 } }, spacing: { after: 120 }, children: [] }),
        )
    }

    if (c.introduction) children.push(h2(`I. ${L.introduction}`), ...c.introduction.split(/\n+/).map(body))
    if (c.proceedings) children.push(h2(`II. ${L.proceedings}`), ...c.proceedings.split(/\n+/).map(body))
    if (c.members_present.length) children.push(new Paragraph({ spacing: { before: 120, after: 60 }, children: [new TextRun({ text: L.membersPresent, bold: true })] }), ...c.members_present.map(p => bullet(personLine(p))))
    if (c.others_present.length) children.push(new Paragraph({ spacing: { before: 120, after: 60 }, children: [new TextRun({ text: L.othersPresent, bold: true })] }), ...c.others_present.map(p => bullet(personLine(p))))
    if (c.findings.length) {
        children.push(h2(`III. ${L.findings}`))
        c.findings.forEach((f, i) => {
            children.push(new Paragraph({ spacing: { before: 120, after: 60 }, children: [new TextRun({ text: `${i + 1}. ${f.topic}`, bold: true })] }))
            f.points.forEach(p => children.push(bullet(p)))
        })
    }
    if (c.recommendations.length) children.push(h2(`IV. ${L.recommendations}`), ...c.recommendations.map((r, i) => numbered(i + 1, r)))
    if (c.conclusion) children.push(h2(`V. ${L.conclusion}`), ...c.conclusion.split(/\n+/).map(body))

    if (c.members_present.length) {
        children.push(new Paragraph({ spacing: { before: 400, after: 200 }, children: [new TextRun({ text: L.submitted, bold: true })] }))
        // Two signature lines per row.
        const sig = (p?: (typeof c.members_present)[number]) =>
            new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: p
                    ? [
                          new Paragraph({ spacing: { before: 480 }, children: [new TextRun('______________________________')] }),
                          new Paragraph({ children: [new TextRun({ text: p.name.toUpperCase(), bold: true })] }),
                          new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: p.role ?? '', italics: true, color: '64748B' })] }),
                      ]
                    : [new Paragraph('')],
            })
        const pairs: InstanceType<typeof TableRow>[] = []
        for (let i = 0; i < c.members_present.length; i += 2) pairs.push(new TableRow({ children: [sig(c.members_present[i]), sig(c.members_present[i + 1])] }))
        children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders, rows: pairs }))
    }
    if (c.notes) children.push(new Paragraph({ spacing: { before: 280 }, children: [new TextRun({ text: `${L.notes}: ${c.notes}`, italics: true, color: '64748B', size: 18 })] }))

    const doc = new Document({
        title: c.title,
        creator: 'Traduksyon.com',
        styles: { default: { document: { run: { font: 'Calibri', size: 22, color: '334155' } } } },
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

    const ensure = (h: number) => {
        if (y + h > pageH - margin) {
            pdf.addPage()
            y = margin
        }
    }
    const write = (text: string, { size = 11, bold = false, italic = false, color = '#334155', indent = 0, lineH = 15, align = 'left' as 'left' | 'center' } = {}) => {
        pdf.setFont('helvetica', bold ? 'bold' : italic ? 'italic' : 'normal').setFontSize(size).setTextColor(color)
        // Built-in Helvetica is WinAnsi-only and has no ₱ glyph.
        for (const line of pdf.splitTextToSize(text.replace(/₱\s?/g, 'PHP '), width - indent) as string[]) {
            ensure(lineH)
            if (align === 'center') pdf.text(line, pageW / 2, y + size - 1, { align: 'center' })
            else pdf.text(line, margin + indent, y + size - 1)
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
        text.split(/\n+/).forEach(p => {
            write(p)
            y += 6
        })
    const bullet = (text: string, indent = 0) => {
        pdf.setFont('helvetica', 'normal').setFontSize(11)
        ensure(15)
        pdf.setTextColor('#334155').text('•', margin + indent, y + 10)
        write(text, { indent: indent + 12 })
        y += 2
    }

    write(L.document.toUpperCase(), { size: 9.5, bold: true, color: '#0F766E', align: 'center', lineH: 14 })
    write(c.title, { size: 16, bold: true, color: '#142C3E', lineH: 21, align: 'center' })
    y += 10

    const rows = headerRows(c, L)
    rows.forEach(([k, v]) => {
        pdf.setFont('helvetica', 'bold').setFontSize(11).setTextColor('#142C3E')
        ensure(15)
        pdf.text(`${k}:`, margin, y + 10)
        write(v, { indent: 90 })
        y += 3
    })
    if (rows.length) {
        y += 4
        pdf.setDrawColor('#94A3B8').line(margin, y, pageW - margin, y)
        y += 8
    }

    if (c.introduction) {
        heading(`I. ${L.introduction}`)
        paras(c.introduction)
    }
    if (c.proceedings) {
        heading(`II. ${L.proceedings}`)
        paras(c.proceedings)
    }
    if (c.members_present.length) {
        write(L.membersPresent, { bold: true })
        c.members_present.forEach(p => bullet(personLine(p)))
        y += 4
    }
    if (c.others_present.length) {
        write(L.othersPresent, { bold: true })
        c.others_present.forEach(p => bullet(personLine(p)))
    }
    if (c.findings.length) {
        heading(`III. ${L.findings}`)
        c.findings.forEach((f, i) => {
            y += 4
            ensure(30)
            write(`${i + 1}. ${f.topic}`, { bold: true })
            f.points.forEach(p => bullet(p, 12))
        })
    }
    if (c.recommendations.length) {
        heading(`IV. ${L.recommendations}`)
        c.recommendations.forEach((r, i) => {
            pdf.setFont('helvetica', 'normal').setFontSize(11)
            ensure(15)
            pdf.setTextColor('#334155').text(`${i + 1}.`, margin, y + 10)
            write(r, { indent: 18 })
            y += 3
        })
    }
    if (c.conclusion) {
        heading(`V. ${L.conclusion}`)
        paras(c.conclusion)
    }

    if (c.members_present.length) {
        y += 16
        ensure(30)
        write(L.submitted, { bold: true })
        const colW = width / 2
        for (let i = 0; i < c.members_present.length; i += 2) {
            ensure(80)
            y += 34
            c.members_present.slice(i, i + 2).forEach((p, j) => {
                const x = margin + j * colW
                pdf.setDrawColor('#334155').line(x, y, x + colW - 30, y)
                pdf.setFont('helvetica', 'bold').setFontSize(10.5).setTextColor('#142C3E').text(p.name.toUpperCase(), x, y + 13, { maxWidth: colW - 30 })
                if (p.role) pdf.setFont('helvetica', 'italic').setFontSize(9.5).setTextColor('#64748B').text(p.role, x, y + 26, { maxWidth: colW - 30 })
            })
            y += 32
        }
    }
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
