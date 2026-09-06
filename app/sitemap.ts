import type { MetadataRoute } from 'next'

// Only the public, signed-out pages. Everything else requires a session.
const publicPaths = ['', '/login', '/signup'] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  return publicPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path ? 'monthly' : 'weekly',
    priority: path ? 0.6 : 1,
  }))
}
