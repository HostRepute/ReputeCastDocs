import { describe, expect, it } from 'vitest'
import { changedSources, hasCompleteVietnamese, sourcePrefixes } from '../../scripts/upstream/lib/pages.ts'

describe('sourcePrefixes', () => {
  it('expands braces and drops hints after the path', () => {
    expect(sourcePrefixes('web/src/features/{imports,campaigns} (wizard)')).toEqual([
      'web/src/features/imports',
      'web/src/features/campaigns',
    ])
    expect(sourcePrefixes('internal/readiness (types.go:41)')).toEqual(['internal/readiness'])
    expect(sourcePrefixes('internal/cli/{install,serve}.go')).toEqual([
      'internal/cli/install.go',
      'internal/cli/serve.go',
    ])
    expect(sourcePrefixes('internal/imports/')).toEqual(['internal/imports'])
  })
})

describe('changedSources', () => {
  it('matches files and directory prefixes but not look-alike siblings', () => {
    const changed = ['internal/readiness/checks.go', 'internal/readinessx/a.go', 'README.md', 'docs/spec/x.md']
    expect(changedSources(['internal/readiness', 'README.md'], changed)).toEqual([
      'internal/readiness/checks.go',
      'README.md',
    ])
    expect(changedSources(['internal/sending'], changed)).toEqual([])
  })
})

describe('hasCompleteVietnamese', () => {
  it('needs a messages.vi.ts beside every messages.ts', () => {
    expect(hasCompleteVietnamese(['messages.ts', 'messages.vi.ts', 'Page.tsx'])).toBe(true)
    expect(hasCompleteVietnamese(['messages.ts', 'messages.vi.ts', 'sub/messages.ts'])).toBe(false)
    expect(hasCompleteVietnamese(['Page.tsx'])).toBe(false)
  })
})
