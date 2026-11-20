'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, isActive } from './nav'

/** Phone-only tab bar, matching the mobile mockup (Home / My meetings / Translate / Settings). */
export default function BottomNav() {
    const pathname = usePathname()
    const items = NAV_ITEMS.filter(i => i.mobile)

    return (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur md:hidden pb-safe">
            <ul className="mx-auto grid max-w-md grid-cols-4">
                {items.map(({ href, label, Icon }) => {
                    const active = isActive(pathname, href)
                    return (
                        <li key={href}>
                            <Link
                                href={href}
                                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? 'text-primary' : 'text-muted'}`}>
                                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                                {label}
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}
