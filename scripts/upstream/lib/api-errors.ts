// Drift catalog for src/data/api-errors.yaml: every stable `code` upstream can put in an RFC 9457 problem body.
// Ids are read from the non-test Go files under internal/:
// - the code argument of each api.Err call (bare Err inside internal/api) and of each package helper that passes a
//   code parameter through to api.Err or sets it on a problem (found automatically, e.g. earn's
//   problem(ctx, status, code, key, args) or revenue's coded(ctx, code, location, key));
// - `p.Code = …` on a problem built with api.Invalid, Err, BadRequest, Conflict or NotFound;
// - the Code… constants of internal/api, minus UNUSED_CODES (declared there but never returned).
// A code argument resolves when it is a literal, a constant (package-local or qualified), a local variable the same
// function assigns literals to, `<sourceErr>.Code` (any Code… constant of the package: the importers' source errors)
// or a DYNAMIC_CODES entry. Anything else fails the check, so a person reads it and adds it.
import { globSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { closingIndex, splitTopLevel } from './cli.ts'
import { parseStringConstants } from './permissions.ts'
import type { Catalog } from './types.ts'

/** Declared in internal/api/errors.go but never returned by any handler, so not documented. */
export const UNUSED_CODES = ['instance_not_set_up']

/** Code expressions built at run time, with the codes they can produce (read from the code around them). */
export const DYNAMIC_CODES: Record<string, string[]> = {
  // internal/referrals SetLinkStatus: status is "active" or "paused".
  '"link_"+status': ['link_active', 'link_paused'],
  // internal/recommendations PauseLink and RotateSecret: l.Status is LinkEnded or LinkInvalid.
  '"link_"+l.Status': ['link_ended', 'link_invalid'],
}

/** A Go source file; `path` is relative to the upstream root, e.g. 'internal/api/errors.go'. */
export type GoFile = { path: string; src: string }

type Func = { name: string; params: string[]; start: number; end: number }
type Callee = { re: RegExp; code: number }
type Site = { at: number; expr: string | undefined }

const PROBLEM_BUILDER = /^api\.(?:Invalid|Err|BadRequest|Conflict|NotFound)\(/

/** Index of the `{` opening the body of the function whose parameters close at `close` (skips struct{}/interface{} result types). */
function bodyStart(src: string, close: number): number {
  for (let i = close + 1; i < src.length; i++) {
    if (src[i] === '(' || src[i] === '[') i = closingIndex(src, i)
    else if (src[i] === '{') {
      if (!/\b(?:struct|interface)\s*$/.test(src.slice(i - 12, i))) return i
      i = closingIndex(src, i)
    } else if (src[i] === '\n') return -1
  }
  return -1
}

/** Top-level functions with their parameter names and body span (`{` … `}`). */
function functionsOf(src: string): Func[] {
  const out: Func[] = []
  for (const m of src.matchAll(/^func (?:\([^)]*\) )?(\w+)(?:\[[^\]\n]*\])?\(/gm)) {
    const open = m.index + m[0].length - 1
    const close = closingIndex(src, open)
    const start = bodyStart(src, close)
    if (start < 0) continue
    const params = splitTopLevel(src.slice(open + 1, close)).map((p) => p.text.split(/\s+/)[0])
    out.push({ name: m[1], params, start, end: closingIndex(src, start) })
  }
  return out
}

/** The argument at `code` of every call matching `callee`, skipping the function's own declaration line. */
function codeArgs(src: string, callee: Callee, offset = 0): Site[] {
  const out: Site[] = []
  for (const m of src.matchAll(callee.re)) {
    const lineStart = src.lastIndexOf('\n', m.index) + 1
    const brace = src.indexOf('{', lineStart)
    if (src.startsWith('func ', lineStart) && (brace < 0 || m.index < brace)) continue
    const open = m.index + m[0].length - 1
    const args = splitTopLevel(src.slice(open + 1, closingIndex(src, open)))
    out.push({ at: offset + m.index, expr: args[callee.code]?.text })
  }
  return out
}

/** `x.Code = <expr>` where `x` was built by an api problem constructor earlier in the same text. */
function problemCodeAssignments(src: string, offset = 0): Site[] {
  return [...src.matchAll(/^\s*(\w+)\.Code = (.+)$/gm)]
    .filter(([, v], i, all) => {
      const before = src.slice(0, all[i].index)
      return [...before.matchAll(new RegExp(`\\b${v}\\s*:?=\\s*(.*)`, 'g'))].some((a) => PROBLEM_BUILDER.test(a[1]))
    })
    .map((m) => ({ at: offset + m.index, expr: m[2].trim() }))
}

/** Every code upstream returns, and the code expressions that couldn't be read ('path:line: expr'). */
export function parseApiErrorCodes(
  files: GoFile[],
  dynamic: Record<string, string[]> = DYNAMIC_CODES,
): { codes: string[]; unresolved: string[] } {
  const parsed = files.map((f) => {
    const src = f.src.replace(/^[ \t]*\/\/.*$/gm, '')
    return { path: f.path, dir: dirname(f.path), src, funcs: functionsOf(src) }
  })
  const sources = new Map<string, string[]>()
  for (const f of parsed) sources.set(f.dir, [...(sources.get(f.dir) ?? []), f.src])
  const constants = new Map([...sources].map(([dir, srcs]) => [dir, parseStringConstants(...srcs)]))
  const qualified = (pkg: string, name: string) =>
    [...constants].find(([dir, c]) => basename(dir) === pkg && c.has(name))?.[1].get(name)

  const wrappers: { dir: string; name: string; code: number }[] = []
  const isWrapper = (dir: string, name: string) => wrappers.some((w) => w.dir === dir && w.name === name)
  const callees = (dir: string): Callee[] => [
    { re: /\bapi\.Err\(/g, code: 1 },
    ...(dir === 'internal/api' ? [{ re: /(?<![\w.])Err\(/g, code: 1 }] : []),
    ...wrappers.flatMap((w) =>
      w.dir === dir
        ? [{ re: new RegExp(`(?<![\\w.])${w.name}\\(`, 'g'), code: w.code }]
        : /^[A-Z]/.test(w.name)
          ? [{ re: new RegExp(`\\b${basename(w.dir)}\\.${w.name}\\(`, 'g'), code: w.code }]
          : [],
    ),
  ]

  // A helper whose parameter ends up as a problem's code is a wrapper; wrappers of wrappers count too.
  for (let grew = true; grew;) {
    grew = false
    for (const f of parsed) {
      for (const fn of f.funcs) {
        if (isWrapper(f.dir, fn.name)) continue
        const body = f.src.slice(fn.start, fn.end)
        const passed = [...callees(f.dir).flatMap((c) => codeArgs(body, c)), ...problemCodeAssignments(body)].map(
          (s) => s.expr,
        )
        const code = fn.params.findIndex((p) => /^\w+$/.test(p) && p !== '_' && passed.includes(p))
        if (code >= 0) {
          wrappers.push({ dir: f.dir, name: fn.name, code })
          grew = true
        }
      }
    }
  }

  const codes = new Set<string>()
  const unresolved: string[] = []
  for (const f of parsed) {
    const local = constants.get(f.dir)!
    for (const fn of f.funcs) {
      const body = f.src.slice(fn.start, fn.end)
      const sites = [
        ...callees(f.dir).flatMap((c) => codeArgs(body, c, fn.start)),
        ...problemCodeAssignments(body, fn.start),
      ]
      for (const { at, expr } of sites) {
        if (expr === undefined || (fn.params.includes(expr) && isWrapper(f.dir, fn.name))) continue
        const literal = expr.match(/^"([a-z0-9_]+)"$/)?.[1]
        const ref = expr.match(/^(\w+)\.(\w+)$/)
        let found: string[] | undefined
        if (literal) found = [literal]
        else if (dynamic[expr]) found = dynamic[expr]
        else if (/^\w+$/.test(expr) && local.has(expr)) found = [local.get(expr)!]
        else if (ref && qualified(ref[1], ref[2]) !== undefined) found = [qualified(ref[1], ref[2])!]
        else if (ref && ref[2] === 'Code') found = [...local].filter(([n]) => n.startsWith('Code')).map(([, v]) => v)
        else if (/^[a-z]\w*$/.test(expr)) {
          const assigned = [...body.matchAll(new RegExp(`\\b${expr}\\s*:?=\\s*"([a-z0-9_]+)"`, 'g'))].map((m) => m[1])
          if (assigned.length) found = assigned
        }
        if (found?.length) found.forEach((c) => codes.add(c))
        else unresolved.push(`${f.path}:${f.src.slice(0, at).split('\n').length}: ${expr}`)
      }
    }
  }
  return { codes: [...codes], unresolved }
}

/** Ids of the catalog: returned codes plus the internal/api Code… constants that UNUSED_CODES doesn't exclude. */
export function apiErrorIds(files: GoFile[], dynamic: Record<string, string[]> = DYNAMIC_CODES): string[] {
  const { codes, unresolved } = parseApiErrorCodes(files, dynamic)
  if (unresolved.length) {
    throw new Error(
      `api-errors: can't read these codes; read the code and add them to DYNAMIC_CODES: ${unresolved.join('; ')}`,
    )
  }
  const declared = parseStringConstants(...files.filter((f) => dirname(f.path) === 'internal/api').map((f) => f.src))
  const kept = [...declared].filter(([n, v]) => n.startsWith('Code') && !UNUSED_CODES.includes(v)).map(([, v]) => v)
  return [...new Set([...codes, ...kept])]
}

export const catalogs: Catalog[] = [
  {
    name: 'api-errors',
    dataFile: 'src/data/api-errors.yaml',
    extract(root) {
      const paths = globSync('internal/**/*.go', { cwd: root }).filter((p) => !p.endsWith('_test.go'))
      return apiErrorIds(paths.map((path) => ({ path, src: readFileSync(join(root, path), 'utf8') })))
    },
  },
]
