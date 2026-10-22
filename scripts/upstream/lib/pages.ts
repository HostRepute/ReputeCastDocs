// Pure helpers for the page-review and screenshot-recapture parts of the drift check.

/**
 * Turns a page's `sources` entry into upstream path prefixes:
 * 'web/src/features/{imports,campaigns} (wizard)' → ['web/src/features/imports', 'web/src/features/campaigns'].
 * Text after the first space (line hints, section names) is ignored.
 */
export function sourcePrefixes(source: string): string[] {
  const path = source.trim().split(/\s+/)[0].replace(/\/+$/, '')
  const brace = /\{([^{}]+)\}/.exec(path)
  if (!brace) return path ? [path] : []
  const [before, after] = [path.slice(0, brace.index), path.slice(brace.index + brace[0].length)]
  return brace[1].split(',').flatMap((option) => sourcePrefixes(`${before}${option.trim()}${after}`))
}

/** Changed upstream files that a page documents (exact file or anything under a listed directory). */
export function changedSources(sources: string[], changed: string[]): string[] {
  const prefixes = sources.flatMap(sourcePrefixes)
  return changed.filter((file) => prefixes.some((p) => file === p || file.startsWith(`${p}/`)))
}

/**
 * True when every `messages.ts` in a feature folder has a sibling `messages.vi.ts`
 * (paths relative to the feature folder, e.g. ['messages.ts', 'messages.vi.ts', 'sub/messages.ts']).
 */
export function hasCompleteVietnamese(files: string[]): boolean {
  const en = files.filter((f) => /(^|\/)messages\.ts$/.test(f))
  const set = new Set(files)
  return en.length > 0 && en.every((f) => set.has(f.replace(/messages\.ts$/, 'messages.vi.ts')))
}
