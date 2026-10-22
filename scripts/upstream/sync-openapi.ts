// Copies the upstream OpenAPI spec into the API reference: only operations an API key can call, with readable
// summaries, permission lines, tag descriptions and authored code samples (see scripts/upstream/lib/openapi.ts).
// Usage: node scripts/upstream/sync-openapi.ts   (REPUTECAST_SRC = upstream checkout, default ../ReputeCast)
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import {
  SpecError,
  UPSTREAM_SPEC,
  sourceDigest,
  transformSpec,
  type ApiTag,
  type CodeSample,
  type PermissionInfo,
  type Spec,
} from './lib/openapi.ts'

const root = new URL('../../', import.meta.url).pathname
const upstream = resolve(process.env.REPUTECAST_SRC ?? '../ReputeCast')
const sourceFile = join(upstream, UPSTREAM_SPEC)
const outDir = join(root, 'src/data/openapi')
const samplesDir = join(root, 'src/data/api-samples')

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function readRows<T>(file: string): T[] {
  const rows = parseYaml(readFileSync(join(root, file), 'utf8')) as unknown
  if (!Array.isArray(rows) || rows.length === 0) fail(`${file} is empty: fill it before syncing the API reference.`)
  return rows as T[]
}

function readSamples(): Map<string, CodeSample[]> {
  const samples = new Map<string, CodeSample[]>()
  if (!existsSync(samplesDir)) return samples
  for (const name of readdirSync(samplesDir)
    .filter((f) => f.endsWith('.yaml'))
    .sort()) {
    const file = relative(root, join(samplesDir, name))
    const rows = readRows<Partial<CodeSample>>(file)
    for (const [i, row] of rows.entries()) {
      for (const key of ['lang', 'label', 'source'] as const) {
        if (typeof row[key] !== 'string' || row[key].trim() === '') fail(`${file}: sample ${i + 1} needs a "${key}".`)
      }
    }
    samples.set(name.slice(0, -'.yaml'.length), rows as CodeSample[])
  }
  return samples
}

if (!existsSync(sourceFile)) fail(`No OpenAPI spec at ${sourceFile}: set REPUTECAST_SRC to an upstream checkout.`)
const bytes = readFileSync(sourceFile)

const permissions = new Map(
  readRows<{ id: string } & PermissionInfo>('src/data/permissions.yaml').map((p) => [p.id, { sensitive: p.sensitive }]),
)
const tags = readRows<ApiTag>('src/data/api-tags.yaml')

let result
try {
  result = transformSpec(JSON.parse(bytes.toString('utf8')) as Spec, { permissions, tags, samples: readSamples() })
} catch (error) {
  if (error instanceof SpecError) fail(`OpenAPI sync failed:\n${error.problems.map((p) => `- ${p}`).join('\n')}`)
  throw error
}

mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'reputecast.json'), `${JSON.stringify(result.spec, null, 2)}\n`)
writeFileSync(join(outDir, 'source.sha256'), `${sourceDigest(bytes)}\n`)

console.log(
  `OpenAPI synced from ${sourceFile}: ${result.operations} of ${result.sourceOperations} operations ` +
    `(callable with an API key), ${result.tags} tags, ${result.schemas} schemas → src/data/openapi/reputecast.json`,
)
