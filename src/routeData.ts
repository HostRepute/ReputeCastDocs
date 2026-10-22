// SEO additions to every Starlight page: font preloads, Open Graph image, JSON-LD, API page titles, TOC entries for
// reference components and noindex for untranslated fallbacks.
import { defineRouteMiddleware } from '@astrojs/starlight/route-data'
import sans400 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2?url'
import sans600 from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2?url'
import { apiPageMeta } from './lib/api-pages.ts'
import { ogKey } from './lib/og.ts'
import { hasHeadingComponents, mergeHeadings, nestToc } from './lib/toc.ts'
import { firstSegment, groupFor, localize, localizedPath, topicFor } from './lib/topics.ts'

const SITE = 'https://docs.reputecast.com'
const WEBSITE_ID = `${SITE}/#website`
const ORG_ID = 'https://hostrepute.com/#org'
const ORG = { '@type': 'Organization', '@id': ORG_ID, name: 'HostRepute', url: 'https://hostrepute.com' }

export const onRequest = defineRouteMiddleware(async (context, next) => {
  await next()
  const route = context.locals.starlightRoute
  const { entry, lang } = route
  const site = (context.site?.href ?? `${SITE}/`).replace(/\/$/, '')
  const canonical = new URL(context.url.pathname, `${site}/`).href
  const isApi = firstSegment(route.id) === 'api'

  if (isApi) {
    // The API reference is English-only: no hreflang alternates, better titles and descriptions.
    route.head = route.head.filter((h) => !(h.tag === 'link' && h.attrs?.rel === 'alternate' && h.attrs?.hreflang))
    const meta = await apiPageMeta(route)
    if (meta) {
      entry.data.title = meta.title
      entry.data.description = meta.description
      for (const h of route.head) {
        if (h.tag === 'title') h.content = `${meta.title} · ${route.siteTitle}`
        if (h.tag === 'meta' && h.attrs?.property === 'og:title') h.attrs.content = meta.title
      }
      route.head = route.head.filter(
        (h) => !(h.tag === 'meta' && (h.attrs?.name === 'description' || h.attrs?.property === 'og:description')),
      )
      route.head.push(
        { tag: 'meta', attrs: { name: 'description', content: meta.description } },
        { tag: 'meta', attrs: { property: 'og:description', content: meta.description } },
      )
    }
  }
  const head = route.head
  const title = entry.data.title
  const description = entry.data.description

  const body = entry.body ?? ''
  if (route.toc && hasHeadingComponents(body)) {
    route.headings = await mergeHeadings(body, route.headings, lang)
    const overview = route.toc.items[0]?.text ?? title
    route.toc.items = nestToc(route.headings, route.toc.minHeadingLevel, route.toc.maxHeadingLevel, overview)
  }

  for (const href of [sans400, sans600]) {
    head.push({ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href } })
  }

  const is404 = route.id === '404' || route.id.endsWith('/404')
  if (!is404) {
    const image = `${site}/og/${isApi ? 'api' : ogKey(entry.id)}.png`
    head.push(
      { tag: 'meta', attrs: { property: 'og:image', content: image } },
      { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
      { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
      { tag: 'meta', attrs: { property: 'og:image:alt', content: title } },
      { tag: 'meta', attrs: { name: 'twitter:image', content: image } },
    )
  }

  const isHome = route.id === '' || route.id === 'vi'
  const homeUrl = `${site}${localizedPath('/', lang)}`
  let graph: Record<string, unknown>[]
  if (isHome) {
    graph = [
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        name: 'ReputeCast Docs',
        url: homeUrl,
        inLanguage: lang,
        publisher: { '@id': ORG_ID },
      },
      ORG,
      {
        '@type': 'SoftwareApplication',
        name: 'ReputeCast',
        description,
        url: 'https://reputecast.com',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Linux, macOS, Windows, Docker',
        license: 'https://www.gnu.org/licenses/agpl-3.0.html',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        downloadUrl: 'https://github.com/hostrepute/reputecast/releases',
        publisher: { '@id': ORG_ID },
      },
    ]
  } else if (is404) {
    graph = []
  } else {
    const topic = topicFor(route.id)
    const group = groupFor(route.id)
    const crumbs: { name: string; item: string }[] = [{ name: lang === 'vi' ? 'Tài liệu' : 'Docs', item: homeUrl }]
    if (topic) crumbs.push({ name: localize(topic.label, lang), item: `${site}${localizedPath(topic.link, lang)}` })
    crumbs.push({ name: title, item: canonical })
    graph = [
      {
        '@type': 'TechArticle',
        headline: title,
        ...(description ? { description } : {}),
        inLanguage: lang,
        url: canonical,
        ...(route.lastUpdated ? { dateModified: route.lastUpdated.toISOString() } : {}),
        ...(topic && group ? { articleSection: localize(group, lang) } : {}),
        isPartOf: { '@id': WEBSITE_ID },
        publisher: ORG,
        about: { '@type': 'SoftwareApplication', name: 'ReputeCast' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item })),
      },
    ]
  }
  if (graph.length > 0) {
    head.push({
      tag: 'script',
      attrs: { type: 'application/ld+json' },
      content: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c'),
    })
  }

  // Untranslated fallback pages must not compete with the English original. Preview deployments are kept out of
  // indexes by the X-Robots-Tag header (src/integrations/preview-noindex.ts), so the HTML stays production-identical.
  if (route.isFallback) {
    head.push({ tag: 'meta', attrs: { name: 'robots', content: 'noindex, follow' } })
  }
})
