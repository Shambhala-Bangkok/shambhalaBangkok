import { NextResponse } from 'next/server'
import {
  getActiveUpcomingEvents,
  getActivePastEvents,
} from '@/lib/events'
import { getAllPosts } from '@/lib/blog'
import { siteConfig } from '@/lib/config'

export async function GET() {
  const baseUrl = siteConfig.url

  const staticPages = [
    '',
    '/events',
    '/learn',
    '/community',
    '/donate',
    '/location',
    '/blog',
    '/about',
    '/about/shambhala',
    '/about/vision',
    '/about/lineage',
    '/resources',
    '/contact',
    '/privacy',
    '/terms',
    '/code-of-conduct',
  ]

  const [upcomingEvents, pastEvents] = await Promise.all([
    getActiveUpcomingEvents(),
    getActivePastEvents(),
  ])

  const events = [...upcomingEvents, ...pastEvents]
  const posts = getAllPosts()

  const urls = [
    ...staticPages.map((path) => ({
      loc: `${baseUrl}${path}`,
      changefreq:
        path === '' || path === '/events' ? 'daily' : 'weekly',
      priority:
        path === ''
          ? '1.0'
          : path === '/events'
            ? '0.9'
            : '0.7',
    })),

    ...events.map((e) => ({
      loc: `${baseUrl}/events/${e.slug}`,
      changefreq: 'weekly',
      priority: '0.8',
    })),

    ...posts.map((p) => ({
      loc: `${baseUrl}/blog/${p.slug}`,
      changefreq: 'monthly',
      priority: '0.6',
    })),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}