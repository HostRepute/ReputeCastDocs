// Sample pages the end-to-end checks visit: one per page type and topic, in every locale.
import { PREFIXED_LOCALES, localeOf } from '../../src/lib/locales.ts'

export { localeOf }
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

export const translatedPages = PREFIXED_LOCALES.flatMap((l) => englishPages.map((p) => `/${l}${p}`))

/** The API reference is generated and English-only. */
export const apiPages = ['/api/operations/send-transactional-message/']

export const allPages = [...englishPages, ...translatedPages, ...apiPages]

/** Absolute production URL → path on the local preview server. */
export function localPath(url: string): string {
  return url.startsWith(SITE) ? url.slice(SITE.length) || '/' : url
}
