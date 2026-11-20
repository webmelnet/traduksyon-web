import { Sparkles } from 'lucide-react'
import Card from '@/components/ui/Card'

export default function ComingSoon({ title, text, Icon = Sparkles }: { title: string; text: string; Icon?: any }) {
    return (
        <div className="space-y-5">
            <h1 className="text-2xl font-bold">{title}</h1>
            <Card className="flex flex-col items-center px-6 py-14 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-mint text-primary-deep">
                    <Icon className="h-7 w-7" />
                </span>
                <h2 className="mt-4 text-lg font-semibold">Coming soon</h2>
                <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>
            </Card>
        </div>
    )
}
