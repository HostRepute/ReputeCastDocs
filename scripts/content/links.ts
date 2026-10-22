// Pure helpers for the built-site link check (scripts/content/check-links.ts).

const ATTR_ID = /\sid=(?:"([^"]+)"|'([^']+)')/g
const ANCHOR_HREF = /<a\s[^>]*?href=(?:"([^"]*)"|'([^']*)')/g

/** Every element id in an HTML document. */
export function htmlIds(html: string): Set<string> {
  return new Set([...html.matchAll(ATTR_ID)].map((m) => decodeEntities(m[1] ?? m[2])))
}

/** Site-internal `<a href>` targets (root-relative or same-page `#hash`), entity-decoded. */
export function internalHrefs(html: string): string[] {
  return [...html.matchAll(ANCHOR_HREF)]
    .map((m) => decodeEntities(m[1] ?? m[2]))
    .filter((href) => href.startsWith('/') || href.startsWith('#'))
    .filter((href) => !href.startsWith('//'))
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

/**
 * The dist file a root-relative URL path resolves to with `build.format: 'directory'`:
 * `/a/b/` → `a/b/index.html`, `/og/x.png` → `og/x.png`. Undefined when the path lacks the trailing slash a page
 * needs (the site uses `trailingSlash: 'always'`).
 */
export function distFile(path: string): string | undefined {
  const clean = decodeURIComponent(path.replace(/^\/+/, ''))
  if (clean === '') return 'index.html'
  if (clean.endsWith('/')) return `${clean}index.html`
  return /\.[a-z0-9]+$/i.test(clean) ? clean : undefined
}

export type LinkProblem = { page: string; href: string; problem: string }

/**
 * Checks one page's links. `exists(file)` says whether a dist file exists; `idsOf(file)` returns a page's ids.
 */
export function checkPageLinks(
  page: string,
  html: string,
  exists: (file: string) => boolean,
  idsOf: (file: string) => Set<string>,
): LinkProblem[] {
  const problems: LinkProblem[] = []
  for (const href of internalHrefs(html)) {
    const [rawPath, hash] = href.split('#', 2)
    const path = rawPath.split('?')[0]
    const file = path === '' ? page : distFile(path)
    if (!file) {
      problems.push({ page, href, problem: 'missing trailing slash' })
      continue
    }
    if (!exists(file)) {
      problems.push({ page, href, problem: 'no such page' })
      continue
    }
    if (hash && hash !== '_top' && file.endsWith('.html') && !idsOf(file).has(decodeURIComponent(hash))) {
      problems.push({ page, href, problem: `no element with id "${decodeURIComponent(hash)}"` })
    }
  }
  return problems
}
