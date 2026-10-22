// Drift catalog for src/data/cli.yaml: cobra commands and their flags in upstream internal/cli/*.go.
// Ids: the command path without the binary ('serve', 'user reset-password') and '<path> --<flag>';
// the root's flags use the path '_global' ('_global --config').
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Catalog } from './types.ts'

export const GLOBAL = '_global'

/** Index of the quote that closes the Go string or rune literal opening at `i`. */
function quoteEnd(src: string, i: number): number {
  const q = src[i]
  if (q === '`') {
    const end = src.indexOf('`', i + 1)
    if (end < 0) throw new Error(`Unterminated raw string at offset ${i}`)
    return end
  }
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === '\\') j++
    else if (src[j] === q) return j
  }
  throw new Error(`Unterminated string at offset ${i}`)
}

/** Index of the bracket closing the one at `open`, skipping strings, runes and comments. */
export function closingIndex(src: string, open: number): number {
  let depth = 0
  for (let i = open; i < src.length; i++) {
    const c = src[i]
    if (c === '"' || c === "'" || c === '`') i = quoteEnd(src, i)
    else if (c === '/' && src[i + 1] === '/') i = src.indexOf('\n', i) < 0 ? src.length : src.indexOf('\n', i)
    else if (c === '/' && src[i + 1] === '*') i = src.indexOf('*/', i + 2) + 1
    else if (c === '{' || c === '(' || c === '[') depth++
    else if (c === '}' || c === ')' || c === ']') {
      depth--
      if (depth === 0) return i
    }
  }
  throw new Error(`Unbalanced bracket at offset ${open}`)
}

/** Splits `src` at top-level commas; each part keeps its absolute start offset (`base` + index). */
export function splitTopLevel(src: string, base = 0): { text: string; at: number }[] {
  const parts: { text: string; at: number }[] = []
  let depth = 0
  let start = 0
  const push = (end: number) => {
    const raw = src.slice(start, end)
    const lead = raw.length - raw.trimStart().length
    if (raw.trim()) parts.push({ text: raw.trim(), at: base + start + lead })
  }
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (c === '"' || c === "'" || c === '`') i = quoteEnd(src, i)
    else if (c === '/' && src[i + 1] === '/') i = src.indexOf('\n', i) < 0 ? src.length : src.indexOf('\n', i)
    else if (c === '{' || c === '(' || c === '[') depth++
    else if (c === '}' || c === ')' || c === ']') depth--
    else if (c === ',' && depth === 0) {
      push(i)
      start = i + 1
    }
  }
  push(src.length)
  return parts
}

/** Value of a Go string literal (interpreted or raw), or undefined when `text` is not one. */
export function goString(text: string): string | undefined {
  if (/^`[^`]*`$/.test(text)) return text.slice(1, -1)
  if (/^"(?:[^"\\]|\\.)*"$/.test(text)) return JSON.parse(text) as string
  return undefined
}

type Literal = { key: string; fn: string; name: string; varName?: string; returned: boolean }
type Edge = { parent: string; child: string }
type Flag = { fn: string; owner: string; name: string }

const FUNC = /^func\s+(?:\([^)]*\)\s*)?(\w+)\s*\(/gm

/** Splits a file into its top-level functions (name, body text, absolute start). */
function functions(src: string): { name: string; body: string; at: number }[] {
  const starts = [...src.matchAll(FUNC)].map((m) => ({ name: m[1]!, at: m.index! }))
  return starts.map((s, i) => ({ name: s.name, at: s.at, body: src.slice(s.at, starts[i + 1]?.at ?? src.length) }))
}

export type CobraTree = { ids: string[]; unresolved: string[] }

/**
 * Reads cobra command literals (`&cobra.Command{Use: …}`), `X.AddCommand(…)` edges (variables,
 * inline literals and `newXxxCmd(o)` calls) and `X.Flags()/PersistentFlags().Type(…)` flag names,
 * then walks the tree from the command whose Use is `reputecast`. `unresolved` names AddCommand
 * arguments that point at code not in `sources` (the drift check fails on any).
 */
export function parseCobra(sources: Record<string, string>): CobraTree {
  const literals = new Map<string, Literal>()
  const edges: Edge[] = []
  const flags: Flag[] = []
  const pendingAdds: { fn: string; parent: string; arg: string; key: string }[] = []
  const returnedVars: string[] = []

  for (const [file, src] of Object.entries(sources)) {
    for (const fn of functions(src)) {
      for (const m of fn.body.matchAll(/&cobra\.Command\{/g)) {
        const open = fn.at + m.index! + m[0].length - 1
        const close = closingIndex(src, open)
        const fields = splitTopLevel(src.slice(open + 1, close), open + 1)
        const use = fields.find((f) => /^Use\s*:/.test(f.text))
        const value = use && goString(use.text.replace(/^Use\s*:\s*/, ''))
        if (value === undefined) throw new Error(`${file}: cobra.Command without a string Use in ${fn.name}`)
        const before = src.slice(Math.max(0, open - 200), fn.at + m.index!)
        const bound = /(\w+)\s*:?=\s*$/.exec(before)
        const key = `${file}:${fn.at + m.index!}`
        literals.set(key, {
          key,
          fn: fn.name,
          name: value.trim().split(/\s+/)[0]!,
          varName: bound?.[1],
          returned: /\breturn\s*$/.test(before),
        })
      }
      for (const m of fn.body.matchAll(/(\w+)\.AddCommand\(/g)) {
        const open = fn.at + m.index! + m[0].length - 1
        for (const arg of splitTopLevel(src.slice(open + 1, closingIndex(src, open)), open + 1)) {
          pendingAdds.push({ fn: fn.name, parent: m[1]!, arg: arg.text, key: `${file}:${arg.at}` })
        }
      }
      for (const m of fn.body.matchAll(/(\w+)\.(?:Persistent)?Flags\(\)\.\w+\(/g)) {
        const open = fn.at + m.index! + m[0].length - 1
        const args = splitTopLevel(src.slice(open + 1, closingIndex(src, open)))
        const name = args.map((a) => goString(a.text)).find((s) => s !== undefined)
        if (name === undefined) throw new Error(`${file}: flag without a string name in ${fn.name}`)
        flags.push({ fn: fn.name, owner: m[1]!, name })
      }
      for (const m of fn.body.matchAll(/\breturn\s+(\w+)\s*$/gm)) returnedVars.push(`${fn.name}.${m[1]}`)
    }
  }

  const all = [...literals.values()]
  const vars = new Map(all.filter((l) => l.varName).map((l) => [`${l.fn}.${l.varName}`, l]))
  for (const v of returnedVars) if (vars.has(v)) vars.get(v)!.returned = true
  const returned = new Map(all.filter((l) => l.returned).map((l) => [l.fn, l]))
  const unresolved: string[] = []
  for (const add of pendingAdds) {
    const parent = vars.get(`${add.fn}.${add.parent}`)
    const call = /^(\w+)\(/.exec(add.arg)
    const child = add.arg.startsWith('&cobra.Command{')
      ? literals.get(add.key)
      : call
        ? returned.get(call[1]!)
        : vars.get(`${add.fn}.${add.arg}`)
    if (!parent || !child) unresolved.push(add.arg)
    else edges.push({ parent: parent.key, child: child.key })
  }

  const root = all.find((l) => l.name === 'reputecast')
  if (!root) return { ids: [], unresolved }
  const ids: string[] = []
  const walk = (lit: Literal, path: string[]) => {
    const id = path.length ? path.join(' ') : GLOBAL
    if (path.length) ids.push(id)
    for (const f of flags) if (f.fn === lit.fn && f.owner === lit.varName) ids.push(`${id} --${f.name}`)
    for (const e of edges) {
      const child = literals.get(e.child)!
      if (e.parent === lit.key) walk(child, [...path, child.name])
    }
  }
  walk(root, [])
  return { ids: [...new Set(ids)].sort(), unresolved: [...new Set(unresolved)].sort() }
}

type CliRow = { id: string; flags?: { name: string }[] }

/** The same id shape from cli.yaml rows: each command id (except '_global') and '<id> <flag name>'. */
export function cliDataIds(rows: Record<string, unknown>[]): string[] {
  return (rows as CliRow[]).flatMap((r) => [
    ...(r.id === GLOBAL ? [] : [r.id]),
    ...(r.flags ?? []).map((f) => `${r.id} ${f.name}`),
  ])
}

export const catalogs: Catalog[] = [
  {
    name: 'cli',
    dataFile: 'src/data/cli.yaml',
    extract(root) {
      const dir = join(root, 'internal/cli')
      const files = readdirSync(dir).filter((f) => f.endsWith('.go') && !f.endsWith('_test.go'))
      const tree = parseCobra(Object.fromEntries(files.map((f) => [f, readFileSync(join(dir, f), 'utf8')])))
      if (tree.unresolved.length)
        throw new Error(`cli: cannot resolve AddCommand arguments: ${tree.unresolved.join(', ')}`)
      return tree.ids
    },
    dataIds: cliDataIds,
  },
]
