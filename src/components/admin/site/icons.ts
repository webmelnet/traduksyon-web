import {
    AudioLines, Briefcase, Building, CheckCircle2, Church, ClipboardList, Clock, Download, FileText, Globe, GraduationCap,
    Headphones, Heart, Landmark, Languages, Lock, MessageSquare, Mic, Pencil, ScrollText, ShieldCheck, Smartphone, Sparkles,
    Users, Wallet, Zap,
} from 'lucide-react'

/** Same names as SiteSchema::ICONS (API) and traduksyon-marketing/src/lib/icons.ts. */
export const SITE_ICONS: Record<string, any> = {
    mic: Mic, 'audio-lines': AudioLines, 'file-text': FileText, 'clipboard-list': ClipboardList, 'scroll-text': ScrollText,
    sparkles: Sparkles, languages: Languages, users: Users, 'shield-check': ShieldCheck, lock: Lock, clock: Clock, zap: Zap,
    globe: Globe, landmark: Landmark, building: Building, 'graduation-cap': GraduationCap, briefcase: Briefcase, church: Church,
    headphones: Headphones, download: Download, pencil: Pencil, smartphone: Smartphone, 'message-square': MessageSquare,
    wallet: Wallet, 'check-circle': CheckCircle2, heart: Heart,
}
