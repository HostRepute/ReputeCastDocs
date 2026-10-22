// Turns upstream web/openapi.json into the spec behind the API reference (src/data/openapi/reputecast.json).
// Pure: JSON in, JSON out. scripts/upstream/sync-openapi.ts reads and writes the files.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Catalog } from './types.ts'

export type ApiTag = { id: string; description: string; order: number }
export type CodeSample = { lang: string; label: string; source: string }
export type PermissionInfo = { sensitive: boolean }

export type TransformOptions = {
  /** Every permission key in src/data/permissions.yaml. */
  permissions: Map<string, PermissionInfo>
  /** src/data/api-tags.yaml: the tags of the published spec, in `order`. */
  tags: ApiTag[]
  /** src/data/api-samples/<operationId>.yaml, keyed by operationId. */
  samples: Map<string, CodeSample[]>
}

type Json = Record<string, unknown>
type SecurityRequirement = Record<string, string[]>

export type Operation = Json & {
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
  security?: SecurityRequirement[]
  'x-access'?: string
  'x-permission'?: string
  'x-integration'?: string
  'x-codeSamples'?: CodeSample[]
}

export type Spec = Json & {
  openapi: string
  info: Json & { title?: string; description?: string; version?: string }
  paths: Record<string, Json>
  components?: Record<string, Record<string, unknown>>
  security?: SecurityRequirement[]
  servers?: { url: string; description?: string }[]
  tags?: { name: string; description?: string }[]
}

export type TransformResult = {
  spec: Spec
  /** Operations in the upstream spec. */
  sourceOperations: number
  /** Operations kept (callable with an API key). */
  operations: number
  tags: number
  schemas: number
}

/** Thrown with every problem found, one per line, so a single run lists all fixes. */
export class SpecError extends Error {
  readonly problems: string[]

  constructor(problems: string[]) {
    super(problems.join('\n'))
    this.name = 'SpecError'
    this.problems = problems
  }
}

export const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const
/** The security scheme of API keys and MCP agent tokens upstream. */
export const API_KEY_SCHEME = 'bearer'
export const API_PREFIX = '/api/v1'
export const SERVER_URL = 'https://reputecast.example.com'
export const INFO_TITLE = 'ReputeCast API'
export const INFO_DESCRIPTION =
  'The REST API of your own ReputeCast instance, served under `/api/v1` at its public URL. ' +
  'Authenticate every call with an API key from Settings › Keys & MCP, sent as `Authorization: Bearer rc_live_…`.'

/** Words that keep a fixed spelling when a kebab-case summary becomes a sentence. */
export const SUMMARY_TOKENS: Record<string, string> = {
  api: 'API',
  mcp: 'MCP',
  sms: 'SMS',
  sso: 'SSO',
  dmarc: 'DMARC',
  ses: 'SES',
  url: 'URL',
  urls: 'URLs',
  csv: 'CSV',
  ai: 'AI',
  id: 'ID',
  ids: 'IDs',
  oauth: 'OAuth',
  smtp: 'SMTP',
  dns: 'DNS',
  ip: 'IP',
  ips: 'IPs',
  rss: 'RSS',
  html: 'HTML',
  mjml: 'MJML',
  utm: 'UTM',
  vapid: 'VAPID',
  whatsapp: 'WhatsApp',
  wordpress: 'WordPress',
  woocommerce: 'WooCommerce',
  shopify: 'Shopify',
  stripe: 'Stripe',
  hostrepute: 'HostRepute',
  totp: 'TOTP',
  '2fa': '2FA',
  ab: 'A/B',
}

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** `list-sms-campaigns` → `List SMS campaigns`; summaries that are already sentences stay as they are. */
export function humanizeSummary(summary: string): string {
  if (!KEBAB.test(summary)) return summary
  return summary
    .split('-')
    .map((word, i) => SUMMARY_TOKENS[word] ?? (i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ')
}

function operationsOf(pathItem: Json): [method: string, op: Operation][] {
  return HTTP_METHODS.filter((m) => isObject(pathItem[m])).map((m) => [m, pathItem[m] as Operation])
}

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** True when an API key may call the operation (one of its security requirements uses the bearer scheme). */
export function isKeyCallable(op: Operation, fallback: SecurityRequirement[] = []): boolean {
  return (op.security ?? fallback).some((req) => API_KEY_SCHEME in req)
}

/** Names of the tags that hold at least one operation callable with an API key. */
export function keyCallableTags(spec: Spec): string[] {
  const tags = new Set<string>()
  for (const pathItem of Object.values(spec.paths)) {
    for (const [, op] of operationsOf(pathItem)) {
      if (isKeyCallable(op, spec.security)) for (const tag of op.tags ?? []) tags.add(tag)
    }
  }
  return [...tags].sort()
}

/** The lines put before an operation's own description. */
export function accessLines(op: Operation, permissions: Map<string, PermissionInfo>): string[] {
  const key = op['x-permission']
  const lines = [
    key ? `**Permission:** \`${key}\`${permissions.get(key)?.sensitive ? ' (sensitive)' : ''}` : '**Permission:** none',
  ]
  // Upstream (internal/api/auth.go) refuses these operations to every caller but the keys named here.
  const integration = op['x-integration']
  if (integration === '*') lines.push("**Keys:** only an integration's key can call this operation.")
  else if (integration === 'wordpress') lines.push("**Keys:** only a WordPress site's key can call this operation.")
  else if (integration) lines.push(`**Keys:** only a ${integration} integration's key can call this operation.`)
  return lines
}

function decodePointer(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~')
}

function collectRefs(node: unknown, found: string[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, found)
    return
  }
  if (!isObject(node)) return
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string') found.push(value)
    else collectRefs(value, found)
  }
}

/** Keeps the components reachable from `paths` (transitively); drops unused security schemes. */
function pruneComponents(spec: Spec, usedSchemes: Set<string>, problems: string[]): void {
  const components = spec.components
  if (!components) return
  const reachable = new Map<string, Set<string>>()
  const queue: string[] = []
  collectRefs(spec.paths, queue)
  while (queue.length > 0) {
    const ref = queue.pop() as string
    const match = /^#\/components\/([^/]+)\/([^/]+)$/.exec(ref)
    if (!match) {
      if (ref.startsWith('#')) problems.push(`Unsupported $ref "${ref}".`)
      continue
    }
    const kind = match[1] as string
    const name = decodePointer(match[2] as string)
    const seen = reachable.get(kind) ?? new Set<string>()
    if (seen.has(name)) continue
    const target = components[kind]?.[name]
    if (target === undefined) {
      problems.push(`Unresolved $ref "${ref}".`)
      continue
    }
    seen.add(name)
    reachable.set(kind, seen)
    collectRefs(target, queue)
  }
  for (const [kind, entries] of Object.entries(components)) {
    const keep = kind === 'securitySchemes' ? usedSchemes : (reachable.get(kind) ?? new Set<string>())
    const kept = Object.fromEntries(Object.entries(entries).filter(([name]) => keep.has(name)))
    if (Object.keys(kept).length > 0) components[kind] = kept
    else delete components[kind]
  }
}

function serverUrl(paths: string[]): string | Error {
  const under = paths.filter((p) => p === API_PREFIX || p.startsWith(`${API_PREFIX}/`)).length
  if (under === paths.length) return SERVER_URL
  if (under === 0) return `${SERVER_URL}${API_PREFIX}`
  return new Error(`Some paths start with ${API_PREFIX} and some don't, so no single server URL fits.`)
}

/** Applies the plan's Step 5 rules 1–7 and returns a new spec; the input is not changed. */
export function transformSpec(input: Spec, options: TransformOptions): TransformResult {
  const { security: topLevelSecurity, tags: _upstreamTags, servers: _upstreamServers, ...rest } = structuredClone(input)
  const spec: Spec = rest
  const problems: string[] = []
  const usedTags = new Set<string>()
  const usedSchemes = new Set<string>()
  const unknownPermissions = new Set<string>()
  const keptOperationIds = new Set<string>()
  let sourceOperations = 0
  let operations = 0

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const [method, op] of operationsOf(pathItem)) {
      sourceOperations++
      // 1. Only what an API key can call; the session (cookie) alternative is the web app's, not the reader's.
      if (!isKeyCallable(op, topLevelSecurity)) {
        delete pathItem[method]
        continue
      }
      operations++
      op.security = (op.security ?? topLevelSecurity ?? []).filter((req) => API_KEY_SCHEME in req)
      for (const req of op.security) for (const scheme of Object.keys(req)) usedSchemes.add(scheme)
      for (const tag of op.tags ?? []) usedTags.add(tag)
      if (op.operationId) keptOperationIds.add(op.operationId)

      // 5. Readable summaries (the sidebar label and page title).
      if (typeof op.summary === 'string') op.summary = humanizeSummary(op.summary)

      // 6. Who may call it, before the operation's own description.
      const key = op['x-permission']
      if (key && !options.permissions.has(key)) unknownPermissions.add(key)
      const lines = accessLines(op, options.permissions)
      op.description = [...lines, ...(op.description ? [op.description] : [])].join('\n\n')

      // 7. Authored code samples (they replace the plugin's generated snippets on that page).
      const samples = op.operationId ? options.samples.get(op.operationId) : undefined
      if (samples) op['x-codeSamples'] = [...(op['x-codeSamples'] ?? []), ...samples]
    }
    if (operationsOf(pathItem).length === 0) delete spec.paths[path]
  }

  if (unknownPermissions.size > 0) {
    problems.push(
      `Permission keys missing from src/data/permissions.yaml: ${[...unknownPermissions].sort().join(', ')}.`,
    )
  }
  const unknownSamples = [...options.samples.keys()].filter((id) => !keptOperationIds.has(id)).sort()
  if (unknownSamples.length > 0) {
    problems.push(`Code samples for operations that are not in the API reference: ${unknownSamples.join(', ')}.`)
  }

  // 2. Components reachable from the kept operations only.
  pruneComponents(spec, usedSchemes, problems)

  // 3. Title, description and an example server.
  // Development builds report version "dev"; the reader-facing API version is v1 (paths under /api/v1).
  const version = spec.info.version && spec.info.version !== 'dev' ? spec.info.version : 'v1'
  spec.info = { ...spec.info, title: INFO_TITLE, description: INFO_DESCRIPTION, version }
  const url = serverUrl(Object.keys(spec.paths))
  if (url instanceof Error) problems.push(url.message)
  else spec.servers = [{ url, description: 'Your ReputeCast public URL' }]

  // 4. Tags in api-tags.yaml order, each with its description.
  const known = new Map(options.tags.map((t) => [t.id, t]))
  if (known.size !== options.tags.length) {
    const ids = options.tags.map((t) => t.id)
    const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))].sort()
    problems.push(`Duplicate tags in src/data/api-tags.yaml: ${duplicates.join(', ')}.`)
  }
  const missing = [...usedTags].filter((t) => !known.has(t)).sort()
  if (missing.length > 0) problems.push(`Tags missing from src/data/api-tags.yaml: ${missing.join(', ')}.`)
  const unused = [...known.keys()].filter((t) => !usedTags.has(t)).sort()
  if (unused.length > 0) {
    problems.push(`Tags in src/data/api-tags.yaml without operations an API key can call: ${unused.join(', ')}.`)
  }
  spec.tags = options.tags
    .filter((t) => usedTags.has(t.id))
    .toSorted((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((t) => ({ name: t.id, description: t.description }))

  if (problems.length > 0) throw new SpecError(problems)

  const { openapi, info, servers, tags, paths, components, ...others } = spec
  return {
    spec: { openapi, info, servers, tags, ...others, paths, ...(components ? { components } : {}) },
    sourceOperations,
    operations,
    tags: spec.tags.length,
    schemas: Object.keys(components?.schemas ?? {}).length,
  }
}

/** sha256 hex of the upstream file's bytes (src/data/openapi/source.sha256). */
export function sourceDigest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/** The upstream spec file, relative to the checkout root. */
export const UPSTREAM_SPEC = 'web/openapi.json'

export const catalogs: Catalog[] = [
  {
    name: 'api-tags',
    dataFile: 'src/data/api-tags.yaml',
    extract: (root) => keyCallableTags(JSON.parse(readFileSync(join(root, UPSTREAM_SPEC), 'utf8')) as Spec),
  },
]
