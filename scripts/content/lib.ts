// Pure rules for the content check (scripts/content/check.ts). Kept free of I/O so they can be unit tested.
import { parse as parseYaml } from 'yaml'

export type Locale = 'en' | 'vi'

export type Page = {
  /** Repo-relative file path, used in messages. */
  file: string
  locale: Locale
  /** Path inside the locale root without extension, e.g. `campaigns/send-readiness`. */
  path: string
  data: Record<string, unknown>
  body: string
}

export type Issue = { file: string; rule: string; detail: string }

export type CheckContext = {
  /** Screenshot ids declared in scripts/screenshots/manifest.ts. */
  shotIds: Set<string>
  /** Screenshot ids that have an English file in src/assets/screenshots/en/. */
  shotFilesEn: Set<string>
  /** Ids in src/data/ui-labels.yaml. */
  uiLabels: Set<string>
  /** Ids in src/data/permissions.yaml. */
  permissions: Set<string>
  strictI18n: boolean
}

export const TITLE_MAX = 60
export const DESCRIPTION_MIN = 90
export const DESCRIPTION_MAX = 160

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

export function parseFrontmatter(source: string): { data: Record<string, unknown>; body: string } {
  const match = FRONTMATTER.exec(source)
  if (!match) return { data: {}, body: source }
  const data = parseYaml(match[1]) as unknown
  return {
    data: data && typeof data === 'object' ? (data as Record<string, unknown>) : {},
    body: source.slice(match[0].length),
  }
}

/** Splits a docs-collection file path (relative to src/content/docs) into locale and page path. */
export function locateEntry(relativeFile: string): { locale: Locale; path: string } {
  const withoutExt = relativeFile.replace(/\\/g, '/').replace(/\.mdx?$/, '')
  if (withoutExt === 'vi' || withoutExt.startsWith('vi/')) {
    const rest = withoutExt === 'vi' ? 'index' : withoutExt.slice(3)
    return { locale: 'vi', path: rest }
  }
  return { locale: 'en', path: withoutExt }
}

export type Tag = { name: string; attrs: Record<string, string>; line: number }

const ATTR = /([A-Za-z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`|([^}]*?))\s*\})/g

/** Finds `<Name …>` component tags in MDX and returns their string attributes. */
export function findTags(body: string, name: string): Tag[] {
  const tags: Tag[] = []
  const open = new RegExp(`<${name}(?=[\\s/>])`, 'g')
  for (let m = open.exec(body); m; m = open.exec(body)) {
    const start = m.index + m[0].length
    let depth = 0
    let quote: string | null = null
    let end = start
    for (; end < body.length; end++) {
      const ch = body[end]
      if (quote) {
        if (ch === quote) quote = null
        continue
      }
      if (ch === '"' || ch === "'" || ch === '`') quote = ch
      else if (ch === '{') depth++
      else if (ch === '}') depth--
      else if (ch === '>' && depth === 0) break
    }
    const raw = body.slice(start, end)
    const attrs: Record<string, string> = {}
    for (const a of raw.matchAll(ATTR)) {
      attrs[a[1]] = a[2] ?? a[3] ?? a[4] ?? a[5] ?? a[6] ?? a[7] ?? ''
    }
    tags.push({ name, attrs, line: body.slice(0, m.index).split('\n').length })
  }
  return tags
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function isSplash(page: Page): boolean {
  return page.data.template === 'splash'
}

export function checkPages(pages: Page[], ctx: CheckContext): Issue[] {
  const issues: Issue[] = []
  const add = (file: string, rule: string, detail: string) => issues.push({ file, rule, detail })

  const seenTitles = new Map<string, string>()
  const seenDescriptions = new Map<string, string>()

  for (const page of pages) {
    const { data, file } = page
    const title = str(data.title)
    const description = str(data.description)
    const keyword = str(data.primaryKeyword)

    if (!title) add(file, 'title', 'missing')
    else {
      if ([...title].length > TITLE_MAX) add(file, 'title', `${[...title].length} characters (max ${TITLE_MAX})`)
      const key = `${page.locale}:${title.toLowerCase()}`
      const other = seenTitles.get(key)
      if (other) add(file, 'title', `duplicate of ${other}`)
      else seenTitles.set(key, file)
    }

    if (!description) add(file, 'description', 'missing')
    else {
      const len = [...description].length
      if (len < DESCRIPTION_MIN || len > DESCRIPTION_MAX)
        add(file, 'description', `${len} characters (allowed ${DESCRIPTION_MIN}–${DESCRIPTION_MAX})`)
      const key = `${page.locale}:${description.toLowerCase()}`
      const other = seenDescriptions.get(key)
      if (other) add(file, 'description', `duplicate of ${other}`)
      else seenDescriptions.set(key, file)
      if (keyword && !description.toLowerCase().includes(keyword.toLowerCase()))
        add(file, 'description', `does not contain primaryKeyword "${keyword}"`)
    }

    if (!isSplash(page)) {
      if (!str(data.type)) add(file, 'type', 'missing')
      if (!keyword) add(file, 'primaryKeyword', 'missing')
      if (!Array.isArray(data.sources) || data.sources.length === 0) add(file, 'sources', 'missing or empty')
    }

    if (Array.isArray(data.permissions)) {
      for (const key of data.permissions) {
        if (typeof key !== 'string' || !ctx.permissions.has(key)) add(file, 'permissions', `unknown key "${key}"`)
      }
    }

    const uiPath = str(data.uiPath)
    if (uiPath) {
      for (const id of uiPath.split('>').map((s) => s.trim())) {
        if (!ctx.uiLabels.has(id)) add(file, 'uiPath', `unknown UI label "${id}"`)
      }
    }

    for (const tag of findTags(page.body, 'Screenshot')) {
      const id = tag.attrs.id
      if (!id) add(file, 'screenshot', `line ${tag.line}: missing id`)
      else {
        if (!ctx.shotIds.has(id)) add(file, 'screenshot', `line ${tag.line}: "${id}" is not in the manifest`)
        else if (!ctx.shotFilesEn.has(id)) add(file, 'screenshot', `line ${tag.line}: "${id}" has no English file`)
      }
      if (!tag.attrs.alt?.trim()) add(file, 'screenshot', `line ${tag.line}: "${id ?? '?'}" has empty alt text`)
    }

    for (const tag of findTags(page.body, 'UiPath')) {
      const path = tag.attrs.path
      if (!path) add(file, 'uiPath', `line ${tag.line}: <UiPath> without path`)
      else
        for (const id of path.split('>').map((s) => s.trim())) {
          if (!ctx.uiLabels.has(id)) add(file, 'uiPath', `line ${tag.line}: unknown UI label "${id}"`)
        }
    }
  }

  if (ctx.strictI18n) {
    const en = new Set(pages.filter((p) => p.locale === 'en').map((p) => p.path))
    const vi = new Set(pages.filter((p) => p.locale === 'vi').map((p) => p.path))
    for (const page of pages) {
      if (page.locale === 'en' && !vi.has(page.path)) add(page.file, 'i18n', `missing Vietnamese page vi/${page.path}`)
      if (page.locale === 'vi' && !en.has(page.path)) add(page.file, 'i18n', `no English page ${page.path}`)
    }
  }

  return issues
}

export function formatIssues(issues: Issue[]): string {
  return issues.map((i) => `${i.file}: ${i.rule}: ${i.detail}`).join('\n')
}
