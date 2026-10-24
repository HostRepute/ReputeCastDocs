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
 * Upstream files that may hold the Vietnamese text of `source`, in order: `messages.ts` → `messages.vi.ts`,
 * `x.messages.ts` → `x.messages.vi.ts`, `xMessages.ts` → `x.messages.vi.ts`, `common.ts` → `common.vi.ts` or
 * `common.messages.vi.ts`, `messages/en.json` → `messages/vi.json`. Empty for sources that are not message files.
 */
export function viSiblings(source: string): string[] {
  if (source.endsWith('/en.json') || source === 'en.json') return [source.replace(/en\.json$/, 'vi.json')]
  if (!source.endsWith('.ts') || source.endsWith('.vi.ts')) return []
  if (/[a-z]Messages\.ts$/.test(source)) return [source.replace(/Messages\.ts$/, '.messages.vi.ts')]
  const plain = source.replace(/\.ts$/, '.vi.ts')
  return source.endsWith('.messages.ts') || source.endsWith('/messages.ts') || source === 'messages.ts'
    ? [plain]
    : [plain, source.replace(/\.ts$/, '.messages.vi.ts')]
}

const escapes: Record<string, string> = { n: '\n', r: '\r', t: '\t', '\n': '' }
const unescape = (body: string) =>
  body.replace(/\\(u\{[\da-fA-F]+\}|u[\da-fA-F]{4}|x[\da-fA-F]{2}|[\s\S])/g, (_, e: string) =>
    e.length > 1 ? String.fromCodePoint(parseInt(e.slice(1).replace(/[{}]/g, ''), 16)) : (escapes[e] ?? e),
  )

/**
 * The string literals of a TS, JS or JSON message file, unescaped, outside `//` and `/* *\/` comments. Single and
 * double quotes end at the line end; back quotes may span lines.
 */
export function stringLiterals(src: string): string[] {
  const out: string[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === '/' && src[i + 1] === '/') {
      const end = src.indexOf('\n', i)
      i = end < 0 ? src.length : end
    } else if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2)
      i = end < 0 ? src.length : end + 2
    } else if (c === "'" || c === '"' || c === '`') {
      let j = i + 1
      while (j < src.length && src[j] !== c && (c === '`' || src[j] !== '\n')) j += src[j] === '\\' ? 2 : 1
      if (src[j] === c) out.push(unescape(src.slice(i + 1, j)))
      i = j + 1
    } else i++
  }
  return out
}

const NUMBER = String.raw`\d+(?:[.,]\d+)*`
const NOTHING = '(?!)'
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Regex sources for the texts a reader sees from an ICU message: the whole message, and on its own the text of
 * each `select`/`plural` option. Every option is allowed (`{filter, select, unread {Unread} other {All}}` gives
 * Unread or All), `#` in a plural is a number, a plain or formatted argument (`{count}`) matches nothing (labels
 * hold no variable values), inline tags (`<opt>…</opt>`) add no text and `'{…}'` quoting is resolved.
 * Throws on an unbalanced message.
 */
export function icuTexts(message: string): string[] {
  const options: string[] = []
  let i = 0
  const fail = (): never => {
    throw new Error(`Unbalanced ICU message: ${message}`)
  }
  const text = (plural: boolean): string => {
    let re = ''
    while (i < message.length && message[i] !== '}') {
      const c = message[i]
      const tag = c === '<' ? /^<\/?[A-Za-z][\w-]*\s*\/?>/.exec(message.slice(i)) : null
      if (c === "'" && message[i + 1] === "'") {
        re += "'"
        i += 2
      } else if (c === "'" && '{}#<|'.includes(message[i + 1] ?? ' ')) {
        i++
        while (i < message.length && (message[i] !== "'" || message[i + 1] === "'")) {
          re += escapeRe(message[i])
          i += message[i] === "'" ? 2 : 1
        }
        i++
      } else if (c === '{') re += argument(plural)
      else if (c === '#' && plural) {
        re += NUMBER
        i++
      } else if (tag) i += tag[0].length
      else {
        re += escapeRe(c)
        i++
      }
    }
    return re
  }
  const argument = (plural: boolean): string => {
    const head = /^\{\s*[^\s,{}]+\s*(?:,\s*(\w+)\s*)?([,}])/.exec(message.slice(i)) ?? fail()
    i += head[0].length
    if (head[2] === '}') return NOTHING
    if (head[1] !== 'select' && head[1] !== 'plural' && head[1] !== 'selectordinal') {
      for (let depth = 1; depth > 0; i++) {
        if (i >= message.length) fail()
        depth += message[i] === '{' ? 1 : message[i] === '}' ? -1 : 0
      }
      return NOTHING
    }
    const choices: string[] = []
    let option: RegExpExecArray | null
    while ((option = /^\s*(?:offset:\d+\s*)?=?[^\s{}]+\s*\{/.exec(message.slice(i)))) {
      i += option[0].length
      choices.push(text(head[1] === 'select' ? plural : true))
      if (message[i] !== '}') fail()
      i++
    }
    const end = /^\s*\}/.exec(message.slice(i)) ?? fail()
    i += end[0].length
    options.push(...choices)
    return `(?:${choices.join('|')})`
  }
  const whole = text(false)
  if (i < message.length) fail()
  return [whole, ...options]
}

const renders = (message: string, text: string) => {
  try {
    return icuTexts(message).some((re) => new RegExp(`^(?:${re})$`).test(text))
  } catch {
    return false
  }
}

/**
 * True when a string literal of `src` (outside comments) shows `text`: the literal itself or, for an ICU message,
 * its whole text or one `select`/`plural` option with tags removed and `#` as a number (`'List scope <opt>·
 * optional</opt>'` shows "List scope · optional", `'In {days, plural, one {# day} other {# days}}'` "In 30 days").
 */
export function hasLiteral(src: string, text: string): boolean {
  return stringLiterals(src).some((literal) => literal === text || (/[{<']/.test(literal) && renders(literal, text)))
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
    if (!hasLiteral(src, en)) problems.push(`${id}: English "${en}" not found in ${source}`)
    const candidates = viSiblings(source)
    const sibling = candidates.find((path) => readFile(path) !== undefined) ?? candidates[0]
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
