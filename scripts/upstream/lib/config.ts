// Drift catalog for src/data/config.yaml: koanf keys of upstream internal/config/config.go.
// Keys are composed by following struct field types from `Config` ('http.public_url').
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { closingIndex } from './cli.ts'
import type { Catalog } from './types.ts'

/** Keys defined upstream but read by nothing; the docs never list them. */
export const UNUSED_KEYS = ['auth.session_lifetime', 'auth.breached_check', 'database.segment_role']

/** Every dotted koanf key reachable from the struct `root`, in declaration order. */
export function parseKoanfKeys(src: string, root = 'Config'): string[] {
  const structs = new Map<string, { name: string; type: string; key: string }[]>()
  for (const m of src.matchAll(/^type\s+(\w+)\s+struct\s*\{/gm)) {
    const open = m.index! + m[0].length - 1
    const body = src.slice(open + 1, closingIndex(src, open))
    const fields = [...body.matchAll(/^\s*(\w+)\s+(\S+)\s+`[^`]*\bkoanf:"([^",]+)[^"]*"[^`]*`/gm)]
    structs.set(
      m[1]!,
      fields.map((f) => ({ name: f[1]!, type: f[2]!.replace(/^\*/, ''), key: f[3]! })),
    )
  }
  if (!structs.has(root)) throw new Error(`struct ${root} not found`)
  const keys: string[] = []
  const walk = (type: string, prefix: string) => {
    for (const f of structs.get(type)!) {
      if (structs.has(f.type)) walk(f.type, `${prefix}${f.key}.`)
      else keys.push(prefix + f.key)
    }
  }
  walk(root, '')
  return keys
}

export const catalogs: Catalog[] = [
  {
    name: 'config',
    dataFile: 'src/data/config.yaml',
    extract(root) {
      const keys = parseKoanfKeys(readFileSync(join(root, 'internal/config/config.go'), 'utf8'))
      return keys.filter((k) => !UNUSED_KEYS.includes(k))
    },
    dataIds: (rows) => rows.filter((r) => r.kind === 'key').map((r) => String(r.id)),
  },
]
