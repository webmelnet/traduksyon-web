import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Same approach as winv-web/middleware.ts: a cheap cookie-presence check so signed-out
// visitors never see a flash of the app shell. The real check is GET /api/user in useAuth.
// Cookie name = Str::slug(APP_NAME).'_session' in Laravel → "traduksyon_session".
const SESSION_COOKIE = process.env.NEXT_PUBLIC_SESSION_COOKIE || 'traduksyon_session'

const PUBLIC_PREFIXES = ['/login', '/register', '/forgot-password', '/password-reset', '/set-password', '/verify-email', '/offline', '/install']

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname

    if (PUBLIC_PREFIXES.some(p => path.startsWith(p))) return NextResponse.next()

    if (!request.cookies.get(SESSION_COOKIE)?.value) {
        const url = new URL('/login', request.url)
        if (path !== '/') url.searchParams.set('returnUrl', path + request.nextUrl.search)
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json|sw.js).*)'],
}
