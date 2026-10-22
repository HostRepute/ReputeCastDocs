// Site-wide HTML fix-ups that Starlight offers no option for.
// Starlight's search button is labelled "Search" but also shows the shortcut (⌘K / Ctrl K) as text, which breaks
// WCAG 2.5.3 "label in name"; the shortcut is already exposed through aria-keyshortcuts, so hide the visual hint.
import { defineMiddleware } from 'astro:middleware'

const SEARCH_SHORTCUT = /<kbd class="sl-hidden md:sl-flex(?=[ "])/

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next()
  if (!response.headers.get('content-type')?.includes('text/html')) return response
  const html = await response.text()
  return new Response(html.replace(SEARCH_SHORTCUT, '<kbd aria-hidden="true" class="sl-hidden md:sl-flex'), {
    status: response.status,
    headers: response.headers,
  })
})
