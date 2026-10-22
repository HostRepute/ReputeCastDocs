// Titles and descriptions for the pages starlight-openapi generates: it titles every overview page "Overview"
// and leaves descriptions empty. Facts come from the generated spec and src/data/api-tags.yaml.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getEntry } from 'astro:content'
import type { StarlightRouteData } from '@astrojs/starlight/route-data'
import { API_OG } from './og.ts'

type Operation = { method: string; path: string; summary?: string }
const METHODS = ['get', 'put', 'post', 'delete', 'patch', 'head', 'options', 'trace']
const MAX = 160

let operations: Map<string, Operation> | undefined

/** operationId → method, path and summary, read once from the generated spec. */
function operationIndex(): Map<string, Operation> {
  if (operations) return operations
  const spec = JSON.parse(readFileSync(join(process.cwd(), 'src/data/openapi/reputecast.json'), 'utf8')) as {
    paths: Record<string, Record<string, { operationId?: string; summary?: string }>>
  }
  operations = new Map()
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const method of METHODS) {
      const op = item[method]
      if (op?.operationId) operations.set(op.operationId, { method, path, summary: op.summary })
    }
  }
  return operations
}

function clip(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length <= MAX ? flat : `${flat.slice(0, MAX - 1).replace(/\s+\S*$/, '')}…`
}

/** Label of the sidebar group that holds the current page (the OpenAPI tag on tag overview pages). */
function currentGroupLabel(entries: StarlightRouteData['sidebar']): string | undefined {
  for (const entry of entries) {
    if (entry.type !== 'group') continue
    const inner = currentGroupLabel(entry.entries)
    if (inner) return inner
    if (entry.entries.some((e) => e.type === 'link' && e.isCurrent)) return entry.label
  }
  return undefined
}

/** SEO title and description for a page under /api/, or undefined when the plugin's own values are fine. */
export async function apiPageMeta(
  route: StarlightRouteData,
): Promise<{ title: string; description: string } | undefined> {
  const parts = route.id.split('/')
  if (parts.length === 1) return API_OG
  if (parts[1] === 'operations' && parts[2] === 'tags') {
    const tag = currentGroupLabel(route.sidebar)
    if (!tag) return undefined
    const about = (await getEntry('apiTags', tag))?.data.description
    return {
      title: `${tag} API`,
      description: clip(`${tag} endpoints of the ReputeCast REST API.${about ? ` ${about}` : ''}`),
    }
  }
  if (parts[1] === 'operations') {
    const op = operationIndex().get(parts[2])
    if (!op) return undefined
    const title = route.entry.data.title
    return { title, description: clip(`${title}: ${op.method.toUpperCase()} ${op.path} in the ReputeCast REST API.`) }
  }
  return undefined
}
