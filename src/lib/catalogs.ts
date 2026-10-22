// Typed access to the data catalogs and the headings the reference components render.
// The route middleware uses the same heading functions to add those headings to the page's table of contents.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getCollection, type CollectionEntry } from 'astro:content'
import { parse as parseYaml } from 'yaml'
import { groupBy, pick, slugify } from './l10n.ts'

/** Collection name → data file (src/data/<file>.yaml), as wired in src/content.config.ts. */
const FILES = {
  cli: 'cli',
  config: 'config',
  permissions: 'permissions',
  roles: 'roles',
  webhookEvents: 'webhook-events',
  mcp: 'mcp',
  apiErrors: 'api-errors',
  limits: 'limits',
  glossary: 'glossary',
  uiLabels: 'ui-labels',
  providers: 'providers',
  shortcuts: 'shortcuts',
  apiTags: 'api-tags',
} as const

type DataCollection = keyof typeof FILES

export type Row<C extends DataCollection> = CollectionEntry<C>['data'] & { id: string }

const fileOrder = new Map<DataCollection, Map<string, number>>()

/** Rows in the order of the YAML file (the content layer returns them sorted by id). */
export async function rows<C extends DataCollection>(name: C): Promise<Row<C>[]> {
  let order = fileOrder.get(name)
  if (!order) {
    const raw = parseYaml(readFileSync(join(process.cwd(), `src/data/${FILES[name]}.yaml`), 'utf8')) as { id: string }[]
    order = new Map(raw.map((r, i) => [String(r.id), i]))
    fileOrder.set(name, order)
  }
  const index = order
  const entries = (await getCollection(name)) as CollectionEntry<C>[]
  return entries
    .map((e) => ({ ...(e.data as CollectionEntry<C>['data']), id: e.id }))
    .sort((a, b) => (index.get(a.id) ?? Infinity) - (index.get(b.id) ?? Infinity))
}

export type Heading = { depth: number; slug: string; text: string }
export type HeadingLevel = 2 | 3

export type Section<T> = { heading: Heading; rows: T[]; children: Section<T>[] }

/** CLI: one section per top-level command with subcommand children, then the global flags. */
export async function cliSections(lang: string, level: HeadingLevel = 2) {
  const all = await rows('cli')
  const commands = all.filter((c) => c.id !== '_global')
  const global = all.find((c) => c.id === '_global')
  const tops = groupBy(commands, (c) => c.id.split(' ')[0])
  const sections: Section<Row<'cli'>>[] = tops.map(({ key, rows: list }) => ({
    heading: { depth: level, slug: slugify(key), text: `reputecast ${key}` },
    rows: list.filter((c) => c.id === key),
    children: list
      .filter((c) => c.id !== key)
      .map((c) => ({
        heading: { depth: level + 1, slug: slugify(c.id), text: `reputecast ${c.id}` },
        rows: [c],
        children: [],
      })),
  }))
  return {
    sections,
    global,
    globalHeading: { depth: level, slug: 'global-flags', text: label(lang, 'Global flags', 'Cờ dùng chung') },
  }
}

export async function configSections(lang: string, level: HeadingLevel = 2) {
  const all = await rows('config')
  const keys = groupBy(
    all.filter((r) => r.kind === 'key'),
    (r) => r.group,
  ).map(({ key, rows: list }) => ({
    heading: { depth: level, slug: slugify(key), text: key },
    rows: list,
    children: [],
  }))
  const envOnly = all.filter((r) => r.kind === 'env-only')
  return {
    sections: keys as Section<Row<'config'>>[],
    envOnly,
    envHeading: {
      depth: level,
      slug: 'environment-only-variables',
      text: label(lang, 'Environment-only variables', 'Biến chỉ đặt qua môi trường'),
    },
  }
}

function localizedGroups<T extends { group?: { en: string; vi?: string }; area?: { en: string; vi?: string } }>(
  list: T[],
  field: 'group' | 'area',
  lang: string,
  level: number,
): Section<T>[] {
  return groupBy(list, (r) => r[field]?.en ?? '').map(({ key, rows: groupRows }) => ({
    heading: { depth: level, slug: slugify(key), text: pick(groupRows[0][field], lang) },
    rows: groupRows,
    children: [],
  }))
}

export async function permissionSections(lang: string, level: HeadingLevel = 2) {
  return localizedGroups(await rows('permissions'), 'group', lang, level)
}

export async function webhookSections(lang: string, level: HeadingLevel = 2) {
  return localizedGroups(await rows('webhookEvents'), 'group', lang, level)
}

export async function errorSections(lang: string, level: HeadingLevel = 2) {
  return localizedGroups(await rows('apiErrors'), 'area', lang, level)
}

export async function limitSections(lang: string, level: HeadingLevel = 2) {
  const all = await rows('limits')
  return groupBy(all, (r) => areaKey(r.id)).map(({ key, rows: list }) => ({
    heading: { depth: level, slug: key, text: pick(list[0].area, lang) },
    rows: list,
    children: [],
  })) as Section<Row<'limits'>>[]
}

export async function mcpSections(lang: string, level: HeadingLevel = 2) {
  const all = await rows('mcp')
  const kinds = [
    { type: 'tool', slug: 'tools', en: 'Tools', vi: 'Công cụ' },
    { type: 'resource', slug: 'resources', en: 'Resources', vi: 'Tài nguyên' },
    { type: 'prompt', slug: 'prompts', en: 'Prompts', vi: 'Prompt' },
  ] as const
  return kinds.map((k) => {
    const list = all.filter((r) => r.type === k.type)
    return {
      heading: { depth: level, slug: k.slug, text: label(lang, k.en, k.vi) },
      rows: k.type === 'tool' ? [] : list,
      children:
        k.type === 'tool'
          ? localizedGroups(list, 'area', lang, level + 1).map((s) => ({
              ...s,
              heading: { ...s.heading, slug: `tools-${s.heading.slug}` },
            }))
          : [],
    } as Section<Row<'mcp'>>
  })
}

/** `auto-pause.bounce-rate` → `auto-pause`. */
export function areaKey(limitId: string): string {
  return limitId.split('.')[0]
}

function label(lang: string, en: string, vi: string): string {
  return lang === 'vi' ? vi : en
}

export function flatten<T>(sections: Section<T>[]): Heading[] {
  return sections.flatMap((s) => [s.heading, ...flatten(s.children)])
}

/** Headings rendered by a reference component tag with the given attributes (empty when it renders none). */
export async function componentHeadings(name: string, attrs: Record<string, string>, lang: string): Promise<Heading[]> {
  const level = (attrs.headingLevel === '3' ? 3 : 2) as HeadingLevel
  switch (name) {
    case 'CliReference': {
      if (attrs.command) {
        const { sections } = await cliSections(lang, 2)
        return flatten(sections.filter((s) => s.heading.slug === attrs.command).flatMap((s) => s.children))
      }
      const { sections, global, globalHeading } = await cliSections(lang, level)
      return [...flatten(sections), ...(global ? [globalHeading] : [])]
    }
    case 'ConfigReference': {
      const { sections, envOnly, envHeading } = await configSections(lang, level)
      return [...flatten(sections), ...(envOnly.length > 0 ? [envHeading] : [])]
    }
    case 'PermissionsTable':
      return flatten(await permissionSections(lang, level))
    case 'WebhookEventsTable':
      return flatten(await webhookSections(lang, level))
    case 'ErrorCodesTable':
      return attrs.grouped === 'false' ? [] : flatten(await errorSections(lang, level))
    case 'LimitsTable':
      return attrs.area ? [] : flatten(await limitSections(lang, level))
    case 'McpReference':
      return flatten(await mcpSections(lang, level))
    default:
      return []
  }
}

export const HEADING_COMPONENTS = [
  'CliReference',
  'ConfigReference',
  'PermissionsTable',
  'WebhookEventsTable',
  'ErrorCodesTable',
  'LimitsTable',
  'McpReference',
]
