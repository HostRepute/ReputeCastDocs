import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { catalogs, parseKoanfKeys, UNUSED_KEYS } from '../../scripts/upstream/lib/config.ts'
import { diffIds } from '../../scripts/upstream/lib/diff.ts'

const src = readFileSync(new URL('../fixtures/upstream/internal/config/config.go', import.meta.url), 'utf8')

describe('parseKoanfKeys', () => {
  const keys = parseKoanfKeys(src)

  it('composes dotted keys by following nested struct field types', () => {
    expect(keys.slice(0, 6)).toEqual([
      'env',
      'roles',
      'http.addr',
      'http.public_url',
      'http.trusted_proxies',
      'http.rate_limit_auth',
    ])
    expect(keys).toContain('hostrepute.client_secret')
    expect(keys).toContain('connect.ses_template_url')
    expect(keys.at(-1)).toBe('files.dir')
  })

  it('reads fields with trailing comments and leaves out struct-typed parents', () => {
    expect(keys).toContain('log.format')
    expect(keys).toContain('metrics.addr')
    expect(keys).not.toContain('http')
    expect(keys).toHaveLength(44)
  })

  it('starts from any struct and fails on an unknown one', () => {
    expect(parseKoanfKeys(src, 'DNSConfig')).toEqual(['servers', 'timeout'])
    expect(() => parseKoanfKeys(src, 'Missing')).toThrow('struct Missing not found')
  })

  it('compares only kind "key" rows, and the unused keys are excluded upstream-side', () => {
    const upstream = keys.filter((k) => !UNUSED_KEYS.includes(k))
    expect(upstream).toHaveLength(41)
    const rows = [
      ...upstream.filter((k) => k !== 'dns.timeout').map((id) => ({ id, kind: 'key' })),
      { id: 'mail.from', kind: 'key' },
      { id: 'REPUTECAST_CONFIG', kind: 'env-only' },
    ]
    expect(diffIds(catalogs[0]!.dataIds!(rows), upstream)).toEqual({ added: ['dns.timeout'], removed: ['mail.from'] })
  })
})
