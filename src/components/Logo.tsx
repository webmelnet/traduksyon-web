import Image from 'next/image'

export const TAGLINE = 'Meet. Transcribe. Translate. Understand.'

/** Icon-only mark (mic + speech bubbles). */
export function LogoMark({ size = 40, className = '' }: { size?: number; className?: string }) {
    return (
        <Image
            src="/images/logo-mark.png"
            alt="Traduksyon.com"
            width={size}
            height={Math.round(size * 0.865)}
            className={className}
            priority
        />
    )
}

/** Mark + wordmark rendered as text so it stays crisp and themable at any size. */
export function Logo({ size = 36, showTagline = false, className = '' }: { size?: number; showTagline?: boolean; className?: string }) {
    return (
        <div className={`flex items-center gap-2.5 ${className}`}>
            <LogoMark size={size} />
            <div className="leading-tight">
                <div className="font-extrabold tracking-tight text-dark" style={{ fontSize: size * 0.55 }}>
                    Traduksyon<span className="text-primary-fresh">.com</span>
                </div>
                {showTagline && <div className="text-[11px] font-medium text-muted">{TAGLINE}</div>}
            </div>
        </div>
    )
}
