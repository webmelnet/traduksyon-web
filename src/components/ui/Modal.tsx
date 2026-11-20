'use client'

import { X } from 'lucide-react'
import React, { useEffect } from 'react'

interface ModalProps {
    open: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    footer?: React.ReactNode
    size?: 'sm' | 'md' | 'lg'
}

const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg' }

/** Bottom sheet on phones, centred dialog from `sm` up. */
export default function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
        document.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = prev
        }
    }, [open, onClose])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={onClose} />
            <div
                className={`relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-surface shadow-xl sm:rounded-2xl ${widths[size]} pb-[env(safe-area-inset-bottom)]`}>
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                    <h2 className="text-base font-semibold text-dark">{title}</h2>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-canvas" aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="overflow-y-auto px-5 py-4">{children}</div>
                {footer && <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">{footer}</div>}
            </div>
        </div>
    )
}
