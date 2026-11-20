import Badge from '@/components/ui/Badge'
import type { Payment } from '@/types'

const tones = { paid: 'green', pending: 'amber', failed: 'red', expired: 'gray', cancelled: 'gray' } as const

export default function PaymentStatusBadge({ status }: { status: Payment['status'] }) {
    return <Badge tone={tones[status] ?? 'gray'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
}
