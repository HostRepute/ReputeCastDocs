// Built-site link check: every internal <a href> in dist/ must reach a page, and every #hash an element id.
// Complements starlight-links-validator, which checks Markdown links but cannot see links and anchors rendered by
// components (glossary, CLI and configuration headings, data tables) or the generated API reference.
// Usage: node scripts/content/check-links.ts   (after pnpm build)
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { checkPageLinks, htmlIds } from './links.ts'

const dist = new URL('../../dist/', import.meta.url).pathname
if (!existsSync(dist)) {
  console.error('dist/ not found: run pnpm build first.')
  process.exit(2)
}

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(join(dir, d.name)) : d.name.endsWith('.html') ? [join(dir, d.name)] : [],
  )

const ids = new Map<string, Set<string>>()
const idsOf = (file: string) => {
  let set = ids.get(file)
  if (!set) {
    set = htmlIds(readFileSync(join(dist, file), 'utf8'))
    ids.set(file, set)
  }
  return set
}

const pages = walk(dist)
const problems = pages.flatMap((full) => {
  const page = relative(dist, full)
  return checkPageLinks(page, readFileSync(full, 'utf8'), (file) => existsSync(join(dist, file)), idsOf)
})

if (problems.length > 0) {
  for (const p of problems) console.error(`${p.page}: ${p.href}: ${p.problem}`)
  console.error(`\n${problems.length} broken internal link(s) in ${new Set(problems.map((p) => p.page)).size} page(s).`)
  process.exit(1)
}
console.log(`Links check passed: ${pages.length} pages.`)
