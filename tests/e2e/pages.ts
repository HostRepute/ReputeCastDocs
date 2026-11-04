// Pages the end-to-end checks visit: a sample with one page per page type and topic in every locale, and every built
// docs page for the checks that are cheap enough to run on all of them.
import { readdirSync } from 'node:fs'
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

/** Every docs page in the built site (`dist/`, so `pnpm build` first), without the API reference. */
export const builtDocsPages = readdirSync(new URL('../../dist/', import.meta.url), {
  recursive: true,
  encoding: 'utf8',
})
  .filter((file) => file === 'index.html' || file.endsWith('/index.html'))
  .map((file) => `/${file.slice(0, -'index.html'.length)}`)
  .filter((path) => !/^\/(?:[a-z]{2}\/)?(?:api|og)\//.test(path))
  .sort()

/** Absolute production URL → path on the local preview server. */
export function localPath(url: string): string {
  return url.startsWith(SITE) ? url.slice(SITE.length) || '/' : url
}
