// Content check: frontmatter, SEO, screenshot, UI-label, permission and i18n parity rules.
// Usage: node scripts/content/check.ts [--strict-i18n]
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { checkPages, formatIssues, locateEntry, parseFrontmatter, type CheckContext, type Page } from './lib.ts'

const root = new URL('../../', import.meta.url).pathname
const docsDir = join(root, 'src/content/docs')

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = join(dir, d.name)
    if (d.isDirectory()) return walk(full)
    return /\.mdx?$/.test(d.name) ? [full] : []
  })
}

function yamlIds(file: string): Set<string> {
  const path = join(root, file)
  if (!existsSync(path)) return new Set()
  const rows = parseYaml(readFileSync(path, 'utf8')) as { id: string }[]
  return new Set(rows.map((r) => r.id))
}

async function shotIds(): Promise<Set<string>> {
  const manifest = join(root, 'scripts/screenshots/manifest.ts')
  if (!existsSync(manifest)) return new Set()
  const mod = (await import(manifest)) as { shots: { id: string }[] }
  return new Set(mod.shots.map((s) => s.id))
}

function shotFiles(locale: string): Set<string> {
  const dir = join(root, 'src/assets/screenshots', locale)
  if (!existsSync(dir)) return new Set()
  return new Set(
    readdirSync(dir)
      .filter((f) => f.endsWith('.webp'))
      .map((f) => f.slice(0, -5)),
  )
}

const pages: Page[] = walk(docsDir).map((full) => {
  const { locale, path } = locateEntry(relative(docsDir, full))
  const { data, body } = parseFrontmatter(readFileSync(full, 'utf8'))
  return { file: relative(root, full), locale, path, data, body }
})

const ctx: CheckContext = {
  shotIds: await shotIds(),
  shotFilesEn: shotFiles('en'),
  uiLabels: yamlIds('src/data/ui-labels.yaml'),
  permissions: yamlIds('src/data/permissions.yaml'),
  strictI18n: process.argv.includes('--strict-i18n'),
}

const issues = checkPages(pages, ctx)
if (issues.length > 0) {
  console.error(formatIssues(issues))
  console.error(`\n${issues.length} content issue(s) in ${new Set(issues.map((i) => i.file)).size} file(s).`)
  process.exit(1)
}
console.log(`Content check passed: ${pages.length} pages${ctx.strictI18n ? ' (strict i18n)' : ''}.`)
