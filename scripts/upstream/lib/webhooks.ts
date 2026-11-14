// Drift catalog for src/data/webhook-events.yaml: the outgoing webhook events of upstream internal/webhooks.
// Ids: event names from the `Events` catalogue in internal/webhooks/webhooks.go plus every
// `WebhookEventInfo{Name: …}` that other packages append to it in init() (earn, products, push, texting, …).
// A Name may be a string constant of the same package (inbound's `Name: EventReplied`).
import { globSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseStringConstants } from './permissions.ts'
import type { Catalog } from './types.ts'

/**
 * Event names declared in one Go file: keyed `{Name: "…", Group: …}` rows of `var Events` and keyed appends.
 * `constants` (the package's string constants) resolves a Name given as an identifier; an unknown one fails.
 */
export function parseWebhookEvents(src: string, constants: Map<string, string> = parseStringConstants(src)): string[] {
  const go = src.replace(/^[ \t]*\/\/.*$/gm, '')
  const events = go.match(/^var Events = \[\]WebhookEventInfo\{\n([\s\S]*?)^\}/m)?.[1] ?? ''
  const named = (ident: string) => {
    const v = constants.get(ident)
    if (v === undefined) throw new Error(`webhook-events: unknown constant ${ident} in a WebhookEventInfo Name`)
    return v
  }
  return [
    ...[...events.matchAll(/^\s*\{Name: "([^"]+)",/gm)].map((m) => m[1]),
    ...[...go.matchAll(/\bWebhookEventInfo\{Name: (?:"([^"]+)"|(\w+)\b)/g)].map((m) => m[1] ?? named(m[2])),
  ]
}

export const catalogs: Catalog[] = [
  {
    name: 'webhook-events',
    dataFile: 'src/data/webhook-events.yaml',
    extract(root) {
      const files = globSync('internal/**/*.go', { cwd: root }).filter((f) => !f.endsWith('_test.go'))
      const srcs = new Map(files.map((f) => [f, readFileSync(join(root, f), 'utf8')]))
      const byDir = new Map<string, string[]>()
      for (const [f, src] of srcs) byDir.set(dirname(f), [...(byDir.get(dirname(f)) ?? []), src])
      const constants = new Map([...byDir].map(([dir, s]) => [dir, parseStringConstants(...s)]))
      const ids = [...srcs].flatMap(([f, src]) => parseWebhookEvents(src, constants.get(dirname(f))))
      if (!ids.length) throw new Error('webhook-events: no events found under internal/')
      return ids
    },
  },
]
