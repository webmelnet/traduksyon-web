/* Traduksyon.io service worker — hand-written, no build plugin.
 * - Static assets (/_next/static, /icons, /images): cache-first (they are content-hashed or rarely change).
 * - Page navigations: network-first, falling back to the cached page, then /offline.
 * - API calls go to the Laravel origin and are never touched (auth/session data must not be cached).
 * Bump CACHE_VERSION to force clients to drop old caches.
 */
const CACHE_VERSION = 'v1'
const STATIC_CACHE = `traduksyon-static-${CACHE_VERSION}`
const PAGE_CACHE = `traduksyon-pages-${CACHE_VERSION}`
const PRECACHE = ['/offline', '/manifest.json', '/images/logo-mark.png', '/icons/icon-192x192.png', '/icons/icon-512x512.png']

self.addEventListener('install', event => {
    event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
    event.waitUntil(
        caches
            .keys()
            .then(keys => Promise.all(keys.filter(k => ![STATIC_CACHE, PAGE_CACHE].includes(k)).map(k => caches.delete(k))))
            .then(() => self.clients.claim()),
    )
})

self.addEventListener('fetch', event => {
    const { request } = event
    if (request.method !== 'GET') return
    const url = new URL(request.url)
    if (url.origin !== self.location.origin) return

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const copy = response.clone()
                    caches.open(PAGE_CACHE).then(cache => cache.put(request, copy))
                    return response
                })
                .catch(async () => (await caches.match(request)) || (await caches.match('/offline'))),
        )
        return
    }

    if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/images/')) {
        event.respondWith(
            caches.match(request).then(
                cached =>
                    cached ||
                    fetch(request).then(response => {
                        const copy = response.clone()
                        caches.open(STATIC_CACHE).then(cache => cache.put(request, copy))
                        return response
                    }),
            ),
        )
    }
})
