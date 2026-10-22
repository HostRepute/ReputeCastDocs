import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { apiErrorIds, parseApiErrorCodes, UNUSED_CODES } from '../../scripts/upstream/lib/api-errors.ts'

const root = new URL('../fixtures/upstream/', import.meta.url).pathname
const files = [
  'internal/api/errors.go',
  'internal/api/auth.go',
  'internal/api/integrations.go',
  'internal/integrations/hooks.go',
  'internal/transactional/transactional.go',
  'internal/transactional/preview.go',
  'internal/team/manage.go',
  'internal/earn/earn.go',
  'internal/earn/tiers.go',
  'internal/revenue/conversions.go',
  'internal/imports/sources.go',
  'internal/imports/connect.go',
  'internal/referrals/referrers.go',
].map((path) => ({ path, src: readFileSync(`${root}${path}`, 'utf8') }))
const only = (...paths: string[]) => files.filter((f) => paths.includes(f.path))

describe('parseApiErrorCodes', () => {
  it('reads constants passed to Err inside internal/api', () => {
    expect(parseApiErrorCodes(only('internal/api/errors.go', 'internal/api/auth.go')).codes).toEqual([
      'not_found',
      'permission_denied',
      'unavailable',
    ])
  })

  it('resolves qualified constants such as api.CodeLastOwner', () => {
    expect(parseApiErrorCodes(only('internal/api/errors.go', 'internal/team/manage.go')).codes).toContain('last_owner')
  })

  it('follows package helpers that pass a code parameter through, including after one-line functions', () => {
    expect(parseApiErrorCodes(only('internal/earn/earn.go', 'internal/earn/tiers.go')).codes).toEqual([
      'tier_has_members',
    ])
    expect(
      parseApiErrorCodes(only('internal/transactional/transactional.go', 'internal/transactional/preview.go')).codes,
    ).toEqual(['missing_variables'])
  })

  it('reads codes set on a problem, directly and through a helper', () => {
    expect(parseApiErrorCodes(only('internal/integrations/hooks.go')).codes).toEqual(['private_address'])
    expect(parseApiErrorCodes(only('internal/revenue/conversions.go')).codes).toEqual(['missing_identity'])
  })

  it("reads local variables and expands a source error's Code to the package's Code constants", () => {
    expect(parseApiErrorCodes(only('internal/imports/sources.go', 'internal/imports/connect.go')).codes.sort()).toEqual(
      [
        'file_columns',
        'file_unreadable',
        'source_auth_failed',
        'source_bad_response',
        'source_rate_limited',
        'source_unavailable',
      ],
    )
  })

  it('expands dynamic codes from the table and reports unknown expressions with their line', () => {
    const referrers = only('internal/referrals/referrers.go')
    expect(parseApiErrorCodes(referrers).codes).toEqual(['link_active', 'link_paused'])
    expect(parseApiErrorCodes(referrers, {})).toEqual({
      codes: [],
      unresolved: ['internal/referrals/referrers.go:15: "link_"+status'],
    })
  })
})

describe('apiErrorIds', () => {
  const ids = apiErrorIds(files)

  it('adds the declared internal/api codes except the unused ones', () => {
    expect(ids).toEqual(expect.arrayContaining(['key_revoked', 'humans_only', 'locked', 'validation_failed']))
    for (const code of UNUSED_CODES) expect(ids).not.toContain(code)
    expect(ids).toHaveLength(33)
  })

  it('fails when a code expression cannot be read', () => {
    expect(() => apiErrorIds(files, {})).toThrow('internal/referrals/referrers.go:15: "link_"+status')
  })
})
