import React, { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string[] | string
    icon?: React.ReactNode
    hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    { label, error, icon, hint, className = '', id, type = 'text', ...rest },
    ref,
) {
    const [reveal, setReveal] = useState(false)
    const messages = Array.isArray(error) ? error : error ? [error] : []
    const isPassword = type === 'password'

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-body">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">{icon}</span>}
                <input
                    ref={ref}
                    id={id}
                    type={isPassword && reveal ? 'text' : type}
                    className={`block h-12 w-full rounded-xl border bg-white text-[15px] text-ink placeholder:text-slate-400 transition focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:bg-canvas ${
                        messages.length ? 'border-danger' : 'border-line'
                    } ${icon ? 'pl-11' : 'pl-3.5'} ${isPassword ? 'pr-11' : 'pr-3.5'} ${className}`}
                    {...rest}
                />
                {isPassword && (
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setReveal(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-body"
                        aria-label={reveal ? 'Hide password' : 'Show password'}>
                        {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                )}
            </div>
            {hint && !messages.length && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
            {messages.map(m => (
                <p key={m} className="mt-1.5 text-xs text-danger">
                    {m}
                </p>
            ))}
        </div>
    )
})

export default Input
