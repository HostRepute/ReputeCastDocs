// Sample pages the end-to-end checks visit: one per page type and topic, in both languages.
export const SITE = 'https://docs.reputecast.com'

export const englishPages = [
  '/',
  '/getting-started/quickstart/',
  '/campaigns/send-readiness/',
  '/deliverability/spf-dkim-dmarc/',
  '/self-hosting/reverse-proxy/',
  '/reference/configuration/',
  '/reference/permissions/',
  '/developers/webhooks/',
  '/providers/amazon-ses/',
  '/smtp-errors/',
]

export const vietnamesePages = englishPages.map((p) => `/vi${p}`)

/** The API reference is generated and English-only. */
export const apiPages = ['/api/operations/send-transactional-message/']

export const allPages = [...englishPages, ...vietnamesePages, ...apiPages]

/** Absolute production URL → path on the local preview server. */
export function localPath(url: string): string {
  return url.startsWith(SITE) ? url.slice(SITE.length) || '/' : url
}
