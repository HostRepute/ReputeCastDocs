/**
 * Placeholders in screenshot paths ({campaign:Weekly Digest #142}) and their resolution through the API.
 *
 * Re-implemented from hostrepute/reputecast web/scripts/a11y.ts (`lists`, `resolvePath()`) and the resolvers
 * in web/scripts/qa.ts (same copyright holder). The demo generates ids at seed time, so every id in a path is
 * looked up by name after each seed.
 */
import type { APIRequestContext } from '@playwright/test'

export type Placeholder = { token: string; kind: string; value: string }

/** Every `{kind:value}` placeholder in a path, in order. */
export function parsePlaceholders(path: string): Placeholder[] {
  return [...path.matchAll(/\{(\w+):([^}]+)\}/g)].map((m) => ({ token: m[0], kind: m[1]!, value: m[2]! }))
}

/** The workspace slug of an app path (`/w/<slug>/…`), or undefined for paths outside a workspace. */
export function workspaceOf(path: string): string | undefined {
  return /^\/w\/([^/?#]+)/.exec(path)?.[1]
}

/** Replaces each placeholder with its URL-encoded id. */
export function fillPath(path: string, ids: Record<string, string>): string {
  let out = path
  for (const p of parsePlaceholders(path)) {
    const id = ids[p.token]
    if (id === undefined) throw new Error(`no id for ${p.token}`)
    out = out.replace(p.token, encodeURIComponent(id))
  }
  return out
}

type Item = Record<string, unknown>
/** A workspace list: [path under /api/v1/workspaces/<ws>/, response key, match]. */
type ListLookup = (value: string) => [string, string, (item: Item) => boolean]

const lists: Record<string, ListLookup> = {
  member: (email) => ['members', 'items', (m) => m.email === email],
  role: (name) => ['roles', 'roles', (r) => r.name === name],
  automation: (name) => ['automations', 'items', (a) => a.name === name],
  contact: (email) => [`contacts?q=${encodeURIComponent(email)}`, 'items', (c) => c.email === email],
  import: (which) => [
    'imports',
    'items',
    (i) => (which === 'draft' ? i.status === 'draft' : i.source === which && i.status === 'done'),
  ],
  form: (name) => ['forms', 'forms', (f) => f.name === name],
  digest: (name) => ['digests', 'items', (d) => d.name === name],
  survey: (name) => ['surveys', 'items', (s) => s.name === name],
  placement: (name) => ['placement/tests', 'tests', (t) => t.name === name],
  verification: (label) => ['verification/services', 'uses', (u) => u.label === label && u.kind !== 'realtime'],
  offer: (name) => ['earn/offers', 'items', (o) => o.name === name],
  post: (title) => [`website/posts?pageSize=100&q=${encodeURIComponent(title)}`, 'posts', (p) => p.title === title],
  product: (name) => ['products', 'products', (p) => p.name === name],
  order: (n) => [`products/orders?period=all&q=${encodeURIComponent(n)}`, 'items', (o) => String(o.number) === n],
  page: (name) => ['pages', 'pages', (p) => p.name === name],
  store: (name) => ['stores', 'stores', (s) => s.name === name],
  // A sending domain by its name ({domain:news.acme.io}): list-senders (tag "Senders & domains") returns them.
  domain: (name) => ['senders', 'domains', (d) => d.domain === name || d.name === name],
}

/** The placeholder kinds resolvePath understands. */
export const placeholderKinds = ['campaign', 'sso', 'setup', 'booking', ...Object.keys(lists)]

async function json<T>(request: APIRequestContext, url: string, params?: Record<string, string | number>): Promise<T> {
  const r = await request.get(url, params ? { params } : undefined)
  if (!r.ok()) throw new Error(`GET ${url} answered ${r.status()}`)
  return (await r.json()) as T
}

async function resolveOne(request: APIRequestContext, base: string, p: Placeholder): Promise<string | undefined> {
  const { kind, value } = p
  if (kind === 'campaign') {
    const body = await json<{ items?: { id: string; name: string }[] }>(request, `${base}/campaigns`, {
      q: value,
      pageSize: 100,
    })
    return body.items?.find((c) => c.name === value)?.id
  }
  if (kind === 'sso') {
    const root = base.replace(/\/workspaces\/[^/]+$/, '')
    const body = await json<{ items?: { id: string; name: string }[] }>(request, `${root}/admin/sso`)
    return body.items?.find((s) => s.name === value)?.id
  }
  if (kind === 'setup') {
    // The latest provider setup of an adapter ({setup:ses}).
    const body = await json<{ items?: { id: string }[] }>(request, `${base}/connect/setups`, { adapter: value })
    return body.items?.[0]?.id
  }
  if (kind === 'booking') {
    // A sponsor booking by its issue number ({booking:141}).
    type Row = { number: number; booking?: { id: string } }
    const body = await json<{ past?: Row[]; upcoming?: Row[] }>(request, `${base}/sponsors/overview`, { range: 'all' })
    return [...(body.past ?? []), ...(body.upcoming ?? [])].find((i) => String(i.number) === value && i.booking)
      ?.booking?.id
  }
  const lookup = lists[kind]
  if (!lookup) throw new Error(`no resolver for {${kind}:…}`)
  const [list, key, match] = lookup(value)
  const body = await json<Record<string, Item[] | undefined>>(request, `${base}/${list}`)
  const hit = body[key]?.find(match)
  return hit ? String(hit.id) : undefined
}

/**
 * Resolves every placeholder of `path` through the API of the path's workspace (default acme-newsletter).
 * Throws with the placeholder when one can't be found.
 */
export async function resolvePath(request: APIRequestContext, app: string, path: string): Promise<string> {
  const placeholders = parsePlaceholders(path)
  if (placeholders.length === 0) return path
  const base = `${app}/api/v1/workspaces/${workspaceOf(path) ?? 'acme-newsletter'}`
  const ids: Record<string, string> = {}
  for (const p of placeholders) {
    const id = await resolveOne(request, base, p)
    if (!id) throw new Error(`can't resolve ${p.token}`)
    ids[p.token] = id
  }
  return fillPath(path, ids)
}
