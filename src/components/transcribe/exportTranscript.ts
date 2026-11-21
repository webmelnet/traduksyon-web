import type { TranscriptSegment, TranscriptSpeaker, Transcription } from '@/types'
import { formatDateTime } from '@/utils/format'
import { formatTimestamp, languageLabel, MODE_LABELS, speakerName, transcriptToText } from './helpers'

export type ExportFormat = 'txt' | 'docx' | 'pdf'

interface ExportInput {
    transcription: Transcription
    segments: TranscriptSegment[]
    speakers: TranscriptSpeaker[]
    withTimes: boolean
}

const safeName = (title: string) => title.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'transcript'

const metaLine = (t: Transcription) =>
    [MODE_LABELS[t.mode], languageLabel(t.detected_language && t.language === 'auto' ? t.detected_language : t.language), formatTimestamp(t.duration_secs), formatDateTime(t.created_at)].join(' · ')

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
export async function exportTranscript(format: ExportFormat, input: ExportInput) {
    const name = safeName(input.transcription.title)
    if (format === 'txt') {
        const text = transcriptToText(input.transcription.title, input.segments, input.speakers, input.withTimes)
        saveBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${name}.txt`)
    } else if (format === 'docx') {
        saveBlob(await buildDocx(input), `${name}.docx`)
    } else {
        saveBlob(await buildPdf(input), `${name}.pdf`)
    }
}

async function buildDocx({ transcription: t, segments, speakers, withTimes }: ExportInput): Promise<Blob> {
    const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx')

    const body = segments.map(
        s =>
            new Paragraph({
                spacing: { after: 160, line: 300 },
                children: [
                    ...(withTimes ? [new TextRun({ text: `[${formatTimestamp(s.start)}] `, color: '64748B', font: 'Consolas', size: 18 })] : []),
                    new TextRun({ text: `${speakerName(speakers, s.speaker)}: `, bold: true, color: '0F766E' }),
                    new TextRun({ text: s.text }),
                ],
            }),
    )

    const doc = new Document({
        title: t.title,
        creator: 'Traduksyon.com',
        styles: { default: { document: { run: { font: 'Calibri', size: 22, color: '334155' } } } },
        sections: [
            {
                children: [
                    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t.title, color: '142C3E' })] }),
                    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: metaLine(t), color: '64748B', size: 18 })] }),
                    ...(speakers.length
                        ? [new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: `Speakers: ${speakers.map(s => s.name).join(', ')}`, color: '64748B', size: 18 })] })]
                        : []),
                    ...(body.length ? body : [new Paragraph('No speech was detected in this recording.')]),
                ],
            },
        ],
    })
    return Packer.toBlob(doc)
}

async function buildPdf({ transcription: t, segments, speakers, withTimes }: ExportInput): Promise<Blob> {
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

    pdf.setFont('helvetica', 'bold').setFontSize(18).setTextColor('#142C3E')
    for (const line of pdf.splitTextToSize(t.title, width) as string[]) {
        ensure(22)
        pdf.text(line, margin, y + 14)
        y += 22
    }

    pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor('#64748B')
    const meta = [metaLine(t), speakers.length ? `Speakers: ${speakers.map(s => s.name).join(', ')}` : ''].filter(Boolean)
    for (const line of meta.flatMap(m => pdf.splitTextToSize(m, width) as string[])) {
        pdf.text(line, margin, y + 10)
        y += 13
    }
    y += 6
    pdf.setDrawColor('#E2E8F0').line(margin, y, pageW - margin, y)
    y += 16

    if (!segments.length) {
        pdf.setFontSize(11).setTextColor('#334155').text('No speech was detected in this recording.', margin, y + 10)
    }

    const lineH = 15
    for (const s of segments) {
        const label = `${withTimes ? `[${formatTimestamp(s.start)}]  ` : ''}${speakerName(speakers, s.speaker)}`
        pdf.setFont('helvetica', 'normal').setFontSize(11)
        const lines = pdf.splitTextToSize(s.text, width) as string[]
        ensure(lineH * 2) // keep the speaker label with at least one line of text

        pdf.setFont('helvetica', 'bold').setFontSize(10).setTextColor('#0F766E')
        pdf.text(label, margin, y + 10)
        y += lineH

        pdf.setFont('helvetica', 'normal').setFontSize(11).setTextColor('#334155')
        for (const line of lines) {
            ensure(lineH)
            pdf.text(line, margin, y + 10)
            y += lineH
        }
        y += 8
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
