// Adds the headings rendered by reference components (src/lib/catalogs.ts) to a page's table of contents,
// in document order with the page's own Markdown headings.
import type { MarkdownHeading } from 'astro'
import { findTags } from '../../scripts/content/lib.ts'
import { componentHeadings, HEADING_COMPONENTS } from './catalogs.ts'

export type TocItem = MarkdownHeading & { children: TocItem[] }

const TOKEN = new RegExp(`^(#{1,6})[ \\t]+|<(${HEADING_COMPONENTS.join('|')})(?=[\\s/>])`, 'gm')

/** Ranges of fenced code blocks, so headings and tags inside code are ignored. */
function fenceRanges(body: string): [number, number][] {
  const ranges: [number, number][] = []
  const fence = /^(`{3,}|~{3,})[^\n]*$/gm
  let open: { index: number; marker: string } | undefined
  for (const m of body.matchAll(fence)) {
    if (!open) open = { index: m.index, marker: m[1] }
    else if (m[1].startsWith(open.marker[0]) && m[1].length >= open.marker.length) {
      ranges.push([open.index, m.index + m[0].length])
      open = undefined
    }
  }
  if (open) ranges.push([open.index, body.length])
  return ranges
}

export function hasHeadingComponents(body: string): boolean {
  return HEADING_COMPONENTS.some((name) => body.includes(`<${name}`))
}

/** Markdown headings (as Astro extracted them) merged with component headings in document order. */
export async function mergeHeadings(
  body: string,
  markdown: MarkdownHeading[],
  lang: string,
): Promise<MarkdownHeading[]> {
  const fences = fenceRanges(body)
  const tokens = [...body.matchAll(TOKEN)].filter((m) => !fences.some(([a, b]) => m.index >= a && m.index < b))
  const mdCount = tokens.filter((m) => m[1]).length
  const merged: MarkdownHeading[] = []
  let next = 0
  const tail: MarkdownHeading[] = []
  for (const m of tokens) {
    if (m[1]) {
      if (next < markdown.length) merged.push(markdown[next++])
      continue
    }
    const [tag] = findTags(body.slice(m.index), m[2])
    const headings = await componentHeadings(m[2], tag?.attrs ?? {}, lang)
    ;(mdCount === markdown.length ? merged : tail).push(...headings)
  }
  merged.push(...markdown.slice(next), ...tail)
  return merged
}

/** Same nesting as Starlight's generateToC: an "Overview" entry for the title, then headings by depth. */
export function nestToc(headings: MarkdownHeading[], min: number, max: number, title: string): TocItem[] {
  const toc: TocItem[] = [{ depth: 2, slug: '_top', text: title, children: [] }]
  for (const h of headings.filter((x) => x.depth >= min && x.depth <= max)) {
    let items = toc
    for (;;) {
      const last = items.at(-1)
      if (!last || last.depth >= h.depth) break
      items = last.children
    }
    items.push({ ...h, children: [] })
  }
  return toc
}
