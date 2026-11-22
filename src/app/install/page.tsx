import type { Metadata } from 'next'
import InstallApp from './InstallApp'

export const metadata: Metadata = {
    title: 'Install the app',
    description: 'Install Traduksyon.com on your phone, tablet or computer.',
}

export default function InstallPage() {
    return <InstallApp />
}
