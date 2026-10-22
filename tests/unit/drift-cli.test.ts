import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cliDataIds, goString, parseCobra, splitTopLevel } from '../../scripts/upstream/lib/cli.ts'
import { diffIds } from '../../scripts/upstream/lib/diff.ts'

const dir = new URL('../fixtures/upstream/internal/cli/', import.meta.url).pathname
const sources = Object.fromEntries(readdirSync(dir).map((f) => [f, readFileSync(join(dir, f), 'utf8')]))

describe('parseCobra', () => {
  const tree = parseCobra(sources)

  it('walks commands from the root: calls, variables and inline AddCommand literals', () => {
    expect(tree.ids.filter((id) => !id.includes('--'))).toEqual([
      'demo',
      'demo send',
      'migrate',
      'migrate down',
      'migrate status',
      'migrate up',
      'openapi',
      'secrets',
      'secrets generate-key',
      'serve',
      'version',
      'worker',
    ])
  })

  it('reads flag names per command and puts the root persistent flags under _global', () => {
    expect(tree.ids.filter((id) => id.includes('--'))).toEqual([
      '_global --config',
      '_global --database-url',
      '_global --log-level',
      'demo send --ab-window',
      'demo send --elapsed',
      'demo send --reset',
      'demo send --scenario',
      'demo send --workspace',
      'openapi --yaml',
      'serve --addr',
      'serve --auto-install',
      'serve --auto-migrate',
      'serve --role',
    ])
  })

  it('reports AddCommand arguments defined outside the given sources', () => {
    expect(tree.unresolved).toEqual(['newAdapterCmd(o)', 'newInstallCmd(o)', 'newSeedCmd(o)', 'newUserCmd(o)'])
  })

  it('matches the id shape cli.yaml rows produce, and diffs added and removed ones', () => {
    const rows = [
      { id: '_global', flags: [{ name: '--config' }, { name: '--database-url' }, { name: '--log-level' }] },
      { id: 'serve', flags: [{ name: '--role' }, { name: '--addr' }, { name: '--auto-migrate' }] },
      { id: 'backup', flags: [] },
    ]
    const upstream = tree.ids.filter((id) => id.startsWith('_global') || id.startsWith('serve'))
    expect(diffIds(cliDataIds(rows), upstream)).toEqual({ added: ['serve --auto-install'], removed: ['backup'] })
  })
})

describe('Go lexing helpers', () => {
  it('splits only at top-level commas, skipping strings and nested brackets', () => {
    const parts = splitTopLevel(`&x, "a, b", f(1, 2), \`c,d\``)
    expect(parts.map((p) => p.text)).toEqual(['&x', '"a, b"', 'f(1, 2)', '`c,d`'])
  })

  it('reads interpreted and raw Go string literals', () => {
    expect(goString('"a \\"b\\""')).toBe('a "b"')
    expect(goString('`send "<campaign>"`')).toBe('send "<campaign>"')
    expect(goString('simulator.ScenarioNormal')).toBeUndefined()
  })
})
