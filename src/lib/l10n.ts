import type { Loc } from '../data/schemas.ts'

/** Vietnamese text when the page is Vietnamese and a translation exists, else English. */
export function pick(text: Loc | undefined, lang: string): string {
  if (!text) return ''
  return lang === 'vi' ? (text.vi ?? text.en) : text.en
}

/** Stable heading/anchor id from English text (identical anchors in every locale). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Groups rows by a key, keeping the first-seen order of groups and rows. */
export function groupBy<T>(rows: T[], key: (row: T) => string): { key: string; rows: T[] }[] {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const k = key(row)
    const list = groups.get(k)
    if (list) list.push(row)
    else groups.set(k, [row])
  }
  return [...groups].map(([k, list]) => ({ key: k, rows: list }))
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c])
}

/**
 * Renders the small Markdown subset used in catalog text (`code`, **bold**, [text](/path/)) to HTML.
 * Everything else is escaped. Root-relative links get the `/vi` prefix on Vietnamese pages.
 */
export function inline(text: string, lang = 'en'): string {
  const parts = text.split(/(`[^`]+`)/g)
  return parts
    .map((part) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length > 1)
        return `<code>${escapeHtml(part.slice(1, -1))}</code>`
      return escapeHtml(part)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => {
          const target = lang === 'vi' && href.startsWith('/') && !href.startsWith('/vi/') ? `/vi${href}` : href
          return `<a href="${target}">${label}</a>`
        })
    })
    .join('')
}
