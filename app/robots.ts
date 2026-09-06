import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  return {
    // Everything behind the app shell is per-user and auth-gated.
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/dashboard', '/tasks', '/sulu-ai', '/progress', '/study-plan', '/olympiads', '/profile', '/me', '/mock', '/onboarding'] },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
