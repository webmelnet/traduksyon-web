'use client'

import { CheckCircle2, Info, XCircle } from 'lucide-react'
import React, { createContext, useCallback, useContext, useState } from 'react'

type ToastTone = 'success' | 'error' | 'info'
interface Toast {
    id: number
    tone: ToastTone
    message: string
}

const ToastContext = createContext<{ toast: (message: string, tone?: ToastTone) => void }>({ toast: () => undefined })

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const toast = useCallback((message: string, tone: ToastTone = 'success') => {
        const id = Date.now() + Math.random()
        setToasts(t => [...t, { id, tone, message }])
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
    }, [])

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-sm text-body shadow-lg">
                        {t.tone === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />}
                        {t.tone === 'error' && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />}
                        {t.tone === 'info' && <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export const useToast = () => useContext(ToastContext)
