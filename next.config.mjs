/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [{ protocol: 'https', hostname: '**' }],
    },
    async headers() {
        return [
            {
                // The service worker must never be cached by the browser, otherwise
                // users keep running an old worker after a deploy.
                source: '/sw.js',
                headers: [
                    { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
                    { key: 'Service-Worker-Allowed', value: '/' },
                ],
            },
        ]
    },
}

export default nextConfig
