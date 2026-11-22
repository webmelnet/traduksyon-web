import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/contexts/ToastContext'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

/**
 * Chrome/Edge fire `beforeinstallprompt` as soon as the page qualifies, often before React
 * hydrates. Stash it on window so useInstallPrompt can pick it up whenever it mounts.
 */
const CAPTURE_INSTALL_PROMPT = `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__installPrompt=e;window.dispatchEvent(new Event('installpromptready'))});window.addEventListener('appinstalled',function(){window.__installPrompt=null});`

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
    title: { default: 'Traduksyon.com', template: '%s · Traduksyon.com' },
    description: 'Meet. Transcribe. Translate. Understand.',
    applicationName: 'Traduksyon.com',
    manifest: '/manifest.json',
    icons: {
        icon: [
            { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
            { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        ],
        apple: '/icons/apple-touch-icon.png',
    },
    appleWebApp: { capable: true, title: 'Traduksyon', statusBarStyle: 'default' },
    formatDetection: { telephone: false },
}

export const viewport: Viewport = {
    themeColor: '#0D9488',
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={inter.variable}>
            <head>
                <script dangerouslySetInnerHTML={{ __html: CAPTURE_INSTALL_PROMPT }} />
            </head>
            <body suppressHydrationWarning>
                <ToastProvider>{children}</ToastProvider>
                <ServiceWorkerRegister />
            </body>
        </html>
    )
}
