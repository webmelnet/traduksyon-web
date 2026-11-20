import { Loader2 } from 'lucide-react'
import React from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'white' | 'ai'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
    primary: 'bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary/40',
    secondary: 'bg-white text-body border border-line hover:bg-canvas focus-visible:ring-primary/30',
    ghost: 'bg-transparent text-body hover:bg-canvas',
    danger: 'bg-danger text-white hover:bg-red-600 focus-visible:ring-danger/40',
    white: 'bg-white text-primary-deep hover:bg-primary-mint/60 focus-visible:ring-white/60',
    ai: 'bg-ai text-white hover:bg-violet-600 focus-visible:ring-ai/40',
}

const sizes: Record<Size, string> = {
    sm: 'h-9 px-3 text-sm rounded-lg',
    md: 'h-11 px-4 text-sm rounded-xl',
    lg: 'h-12 px-5 text-base rounded-xl',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant
    size?: Size
    loading?: boolean
    block?: boolean
    icon?: React.ReactNode
}

export default function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    block = false,
    icon,
    className = '',
    children,
    disabled,
    ...rest
}: ButtonProps) {
    return (
        <button
            {...rest}
            disabled={disabled || loading}
            className={`inline-flex items-center justify-center gap-2 font-semibold transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
            {children}
        </button>
    )
}
