// Compares this repo's generated and curated facts with an upstream checkout of hostrepute/reputecast.
// Usage: REPUTECAST_SRC=../ReputeCast node scripts/upstream/check-drift.ts [--strict] [--update-commit]
//   --strict         page-review warnings fail the run too
//   --update-commit  record the upstream HEAD in src/data/upstream.json after a clean run
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'
import { diffIds } from './lib/diff.ts'
import { changedSources, hasCompleteVietnamese } from './lib/pages.ts'
import type { Catalog } from './lib/types.ts'
import { checkUiLabelsAt } from './lib/ui-labels.ts'
import { parseFrontmatter } from '../content/lib.ts'
import { shots } from '../screenshots/manifest.ts'

const repo = resolve(import.meta.dirname, '../..')
const upstream = resolve(process.env.REPUTECAST_SRC ?? join(repo, '../ReputeCast'))
const strict = process.argv.includes('--strict')
const updateCommit = process.argv.includes('--update-commit')

if (!existsSync(join(upstream, 'go.mod'))) {
  console.error(`REPUTECAST_SRC does not point at an upstream checkout: ${upstream}`)
  process.exit(2)
}

let failures = 0
let warnings = 0
const fail = (msg: string) => {
  failures++
  console.error(`✗ ${msg}`)
}
const warn = (msg: string) => {
  warnings++
  console.warn(`! ${msg}`)
}

const readYaml = (file: string) => parseYaml(readFileSync(join(repo, file), 'utf8')) as Record<string, unknown>[]

// 1. Identifier sets per catalog (every scripts/upstream/lib/*.ts module that exports `catalogs`).
console.log(`Upstream: ${upstream}\n\nCatalogs`)
const libDir = join(import.meta.dirname, 'lib')
for (const file of readdirSync(libDir)
  .filter((f) => f.endsWith('.ts'))
  .sort()) {
  const mod = (await import(pathToFileURL(join(libDir, file)).href)) as { catalogs?: Catalog[] }
  for (const catalog of mod.catalogs ?? []) {
    const rows = readYaml(catalog.dataFile)
    const data = catalog.dataIds ? catalog.dataIds(rows) : rows.map((r) => String(r.id))
    let found: string[]
    try {
      found = catalog.extract(upstream)
    } catch (error) {
      // Upstream restructured the source this extractor reads: report it and check the other catalogs.
      fail(`${catalog.name}: extractor failed: ${(error as Error).message}`)
      continue
    }
    const { added, removed } = diffIds(data, found)
    if (added.length === 0 && removed.length === 0) console.log(`  ✓ ${catalog.name}: ${found.length}`)
    else {
      fail(`${catalog.name}: upstream ${found.length}, ${catalog.dataFile} ${new Set(data).size}`)
      if (added.length > 0) console.error(`    added upstream: ${added.join(', ')}`)
      if (removed.length > 0) console.error(`    removed upstream: ${removed.join(', ')}`)
    }
  }
}

// 2. UI labels still match the upstream message files.
const labels = checkUiLabelsAt(upstream, readYaml('src/data/ui-labels.yaml'))
console.log(`\nUI labels`)
if (labels.problems.length === 0) console.log(`  ✓ ui-labels: all literals found upstream`)
for (const p of labels.problems) fail(`ui-labels: ${p}`)
for (const id of labels.viAvailable) warn(`ui-labels: Vietnamese now exists upstream for ${id}`)

// 3. OpenAPI spec unchanged since the last sync.
console.log(`\nOpenAPI`)
const spec = join(upstream, 'web/openapi.json')
const synced = join(repo, 'src/data/openapi/source.sha256')
const hash = createHash('sha256').update(readFileSync(spec)).digest('hex')
if (existsSync(synced) && readFileSync(synced, 'utf8').trim() === hash)
  console.log(`  ✓ web/openapi.json ${hash.slice(0, 12)}`)
else fail('OpenAPI changed upstream: run pnpm openapi:sync')

// 4. Pages whose documented upstream files changed since the recorded commit.
console.log(`\nPages`)
const state = JSON.parse(readFileSync(join(repo, 'src/data/upstream.json'), 'utf8')) as { commit: string }
const head = execFileSync('git', ['-C', upstream, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const changed = execFileSync('git', ['-C', upstream, 'diff', '--name-only', state.commit, head], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
const docsDir = join(repo, 'src/content/docs')
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(join(dir, d.name)) : /\.mdx?$/.test(d.name) ? [join(dir, d.name)] : [],
  )
let reviews = 0
for (const page of walk(docsDir)) {
  const rel = relative(docsDir, page)
  if (rel.startsWith('vi/')) continue // same sources as the English page
  const { data } = parseFrontmatter(readFileSync(page, 'utf8'))
  const hits = changedSources(Array.isArray(data.sources) ? (data.sources as string[]) : [], changed)
  if (hits.length === 0) continue
  reviews++
  const msg = `Review: ${rel} (changed: ${hits.join(', ')})`
  if (strict) fail(msg)
  else warn(msg)
}
console.log(
  `  ${changed.length} upstream files changed since ${state.commit.slice(0, 8)}; ${reviews} page(s) to review`,
)

// 5. English-only screenshots whose screens now have Vietnamese UI upstream.
console.log(`\nScreenshots`)
const featuresDir = join(upstream, 'web/src/features')
const filesUnder = (dir: string, base = dir): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? filesUnder(join(dir, d.name), base) : [relative(base, join(dir, d.name))],
  )
let recaptures = 0
for (const shot of shots) {
  if (!shot.locales || shot.locales.includes('vi')) continue
  const dir = join(featuresDir, shot.feature)
  if (existsSync(dir) && hasCompleteVietnamese(filesUnder(dir))) {
    recaptures++
    warn(`Vietnamese UI available: recapture ${shot.id} (and allow locale vi in the manifest)`)
  }
}
console.log(`  ${recaptures} English-only screenshot(s) can now be captured in Vietnamese`)

console.log(`\n${failures} failure(s), ${warnings} warning(s).`)
if (failures > 0) process.exit(1)
if (updateCommit) {
  writeFileSync(
    join(repo, 'src/data/upstream.json'),
    `${JSON.stringify({ commit: head, checkedAt: new Date().toISOString().slice(0, 10) }, null, 2)}\n`,
  )
  console.log(`Recorded upstream commit ${head.slice(0, 8)} in src/data/upstream.json`)
}
