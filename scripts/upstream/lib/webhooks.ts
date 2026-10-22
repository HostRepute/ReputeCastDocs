// Drift catalog for src/data/webhook-events.yaml: the outgoing webhook events of upstream internal/webhooks.
// Ids: event names from the `Events` catalogue in internal/webhooks/webhooks.go plus every
// `WebhookEventInfo{Name: …}` that other packages append to it in init() (earn, products, push, texting, …).
import { globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Catalog } from './types.ts'

/** Event names declared in one Go file: positional `{"name", "Group", "…"}` rows of `var Events` and keyed appends. */
export function parseWebhookEvents(src: string): string[] {
  const go = src.replace(/^[ \t]*\/\/.*$/gm, '')
  const events = go.match(/^var Events = \[\]WebhookEventInfo\{\n([\s\S]*?)^\}/m)?.[1] ?? ''
  return [
    ...[...events.matchAll(/^\s*\{"([^"]+)",/gm)].map((m) => m[1]),
    ...[...go.matchAll(/\bWebhookEventInfo\{Name: "([^"]+)"/g)].map((m) => m[1]),
  ]
}

export const catalogs: Catalog[] = [
  {
    name: 'webhook-events',
    dataFile: 'src/data/webhook-events.yaml',
    extract(root) {
      const files = globSync('internal/**/*.go', { cwd: root }).filter((f) => !f.endsWith('_test.go'))
      const ids = files.flatMap((f) => parseWebhookEvents(readFileSync(join(root, f), 'utf8')))
      if (!ids.length) throw new Error('webhook-events: no events found under internal/')
      return ids
    },
  },
]
