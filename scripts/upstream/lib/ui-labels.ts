// Drift check for src/data/ui-labels.yaml: every label must still be the literal text of the upstream app.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export type UiLabelRow = { id: string; en: string; vi?: string; source: string }
export type UiLabelReport = {
  /** Labels whose text or source no longer matches upstream (the drift check fails on these). */
  problems: string[]
  /** Ids without `vi` whose source now has a Vietnamese sibling file upstream (warning: fill `vi`). */
  viAvailable: string[]
}
/** Returns the file's text, or undefined when the repo-relative path does not exist. */
export type ReadFile = (path: string) => string | undefined

/**
 * The upstream file holding the Vietnamese text of `source`: `messages.ts` → `messages.vi.ts`,
 * `x.messages.ts` → `x.messages.vi.ts`, `messages/en.json` → `messages/vi.json`.
 * Undefined for sources with no translation file convention (`.tsx` screens with hard-coded English).
 */
export function viSibling(source: string): string | undefined {
  if (source.endsWith('/en.json') || source === 'en.json') return source.replace(/en\.json$/, 'vi.json')
  if (source.endsWith('.ts') && !source.endsWith('.vi.ts')) return source.replace(/\.ts$/, '.vi.ts')
  return undefined
}

/**
 * True when `text` is a complete string literal in `src`: quoted with single, double or back quotes
 * (with the source's escaping of backslashes and the quote character). With `jsx`, the whole text of a
 * JSX element (`>Add endpoint<`, also with `&amp;`) counts too, for screens that hard-code English.
 */
export function hasLiteral(src: string, text: string, jsx = false): boolean {
  for (const q of ["'", '"', '`']) {
    const escaped = text.replaceAll('\\', '\\\\').replaceAll(q, `\\${q}`)
    if (src.includes(`${q}${escaped}${q}`) || src.includes(`${q}${text}${q}`)) return true
  }
  if (!jsx) return false
  return [text, text.replaceAll('&', '&amp;')].some((t) =>
    new RegExp(`>\\s*${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*<`).test(src),
  )
}

const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v : undefined)

/** Checks each label row against the upstream files read through `readFile` (paths are repo-relative). */
export function checkUiLabels(rows: readonly Record<string, unknown>[], readFile: ReadFile): UiLabelReport {
  const problems: string[] = []
  const viAvailable: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const id = str(row.id) ?? '(no id)'
    const en = str(row.en)
    const vi = str(row.vi)
    const source = str(row.source)
    if (seen.has(id)) problems.push(`${id}: duplicate id`)
    seen.add(id)
    if (!en || !source) {
      problems.push(`${id}: needs en and source`)
      continue
    }
    const src = readFile(source)
    if (src === undefined) {
      problems.push(`${id}: source ${source} not found upstream`)
      continue
    }
    if (!hasLiteral(src, en, source.endsWith('.tsx'))) problems.push(`${id}: English "${en}" not found in ${source}`)
    const sibling = viSibling(source)
    const viSrc = sibling === undefined ? undefined : readFile(sibling)
    if (vi !== undefined) {
      if (viSrc === undefined)
        problems.push(
          `${id}: has vi but ${sibling === undefined ? `${source} has no translation file` : `${sibling} not found`}`,
        )
      else if (!hasLiteral(viSrc, vi)) problems.push(`${id}: Vietnamese "${vi}" not found in ${sibling}`)
    } else if (viSrc !== undefined) viAvailable.push(id)
  }
  return { problems, viAvailable }
}

/** `checkUiLabels` against an upstream checkout at `root`. */
export function checkUiLabelsAt(root: string, rows: readonly Record<string, unknown>[]): UiLabelReport {
  return checkUiLabels(rows, (path) => {
    try {
      return readFileSync(join(root, path), 'utf8')
    } catch {
      return undefined
    }
  })
}
