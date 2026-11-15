// Site-wide HTML fix-ups that Starlight offers no option for.
// Starlight's search button is labelled "Search" but also shows the shortcut (⌘K / Ctrl K) as text, which breaks
// WCAG 2.5.3 "label in name"; the shortcut is already exposed through aria-keyshortcuts, so hide the visual hint.
import { defineMiddleware } from 'astro:middleware'

const SEARCH_SHORTCUT = /<kbd class="sl-hidden md:sl-flex(?=[ "])/
const TABLE = /<table[\s>][\s\S]*?<\/table>/g
// Inline code without markup inside, such as a key, an environment variable, a metric or a path.
const CODE = /(<code\b[^>]*>)([^<]+)(<\/code>)/g
// A run of separators or spaces followed by more of the code; entities (&amp; …) contain none of these characters.
const SEPARATORS = /([._/:,=]+|\s+)(?=[^._/:,=\s])/g

/**
 * Lets the code in a table cell wrap after its separators (`REPUTECAST_HTTP__ADDR`, `providers.allow_private_networks`,
 * `/hooks/inbound/{token}`) and spaces, so one long value doesn't widen its column past the page. The table styles
 * keep code without either, such as `--addr`, on one line instead of breaking it after its dashes.
 */
function breakTableCode(html: string): string {
  return html.replace(TABLE, (table) =>
    table.replace(
      CODE,
      (_m, open: string, text: string, close: string) => open + text.replace(SEPARATORS, '$1<wbr>') + close,
    ),
  )
}

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next()
  if (!response.headers.get('content-type')?.includes('text/html')) return response
  const html = await response.text()
  return new Response(
    breakTableCode(html.replace(SEARCH_SHORTCUT, '<kbd aria-hidden="true" class="sl-hidden md:sl-flex')),
    {
      status: response.status,
      headers: response.headers,
    },
  )
})
