'use client'

import { ChevronDown, Download, FileText } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import Button from './Button'

export type DownloadFormat = 'txt' | 'docx' | 'pdf'

const FORMATS: { format: DownloadFormat; label: string; hint: string }[] = [
    { format: 'docx', label: 'Word (.docx)', hint: 'Editable document' },
    { format: 'pdf', label: 'PDF (.pdf)', hint: 'For printing or sharing' },
    { format: 'txt', label: 'Plain text (.txt)', hint: 'Simple text file' },
]

export default function DownloadMenu({ onPick }: { onPick: (format: DownloadFormat) => Promise<void> }) {
    const [open, setOpen] = useState(false)
    const [working, setWorking] = useState<DownloadFormat | null>(null)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const close = (e: MouseEvent | KeyboardEvent) => {
            if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', close)
        document.addEventListener('keydown', close)
        return () => {
            document.removeEventListener('mousedown', close)
            document.removeEventListener('keydown', close)
        }
    }, [open])

    const pick = async (format: DownloadFormat) => {
        setWorking(format)
        await onPick(format)
        setWorking(null)
        setOpen(false)
    }

    return (
        <div ref={ref} className="relative">
            <Button variant="secondary" size="sm" loading={working !== null} icon={<Download className="h-4 w-4" />} onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open}>
                Download <ChevronDown className="-mr-1 h-3.5 w-3.5" />
            </Button>
            {open && (
                <div role="menu" className="absolute right-0 z-[25] mt-1.5 w-56 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg">
                    {FORMATS.map(f => (
                        <button
                            key={f.format}
                            role="menuitem"
                            disabled={working !== null}
                            onClick={() => pick(f.format)}
                            className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-canvas disabled:opacity-60">
                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                            <span>
                                <span className="block text-sm font-medium text-body">{f.label}</span>
                                <span className="block text-xs text-muted">{f.hint}</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

