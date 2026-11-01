/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root. A stray package-lock.json in the home directory
  // otherwise makes Turbopack guess ~/ as the root and warn on every build.
  turbopack: {
    root: import.meta.dirname,
  },
  // The floating build-activity badge in the bottom-left corner. Development
  // only — it never shipped to visitors — but it sits on top of the UI while
  // you are looking at the app.
  devIndicators: false,
  // A photographed notebook page goes to readSolutionPhoto as a data URL. The
  // browser shrinks it to about half a megabyte first; the default 1MB cap
  // left no room for a dense page shot in good light.
  experimental: {
    serverActions: {
      bodySizeLimit: '3mb',
    },
  },
  // `images.unoptimized` was left over from the v0 sandbox. The app runs on a
  // Node server, so the built-in optimiser works and the diagram no longer
  // ships at full size to every visitor.
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

export default nextConfig
