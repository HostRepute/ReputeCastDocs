import { describe, expect, it } from 'vitest'
import { toMarker } from '../../scripts/screenshots/lib/markers.ts'
import { fillPath, parsePlaceholders, placeholderKinds, workspaceOf } from '../../scripts/screenshots/lib/resolve.ts'
import { parseTempPassword } from '../../scripts/screenshots/lib/upstream.ts'
import { englishOnlyFeatures, shots } from '../../scripts/screenshots/manifest.ts'

describe('toMarker', () => {
  const viewport = { x: 0, y: 0, width: 1440, height: 900 }

  it('converts a box to percentages of the captured area', () => {
    expect(toMarker(1, { x: 144, y: 90, width: 288, height: 45 }, viewport)).toEqual({
      n: 1,
      x: 10,
      y: 10,
      w: 20,
      h: 5,
    })
  })

  it('measures from the origin of a clipped element', () => {
    const clip = { x: 100, y: 200, width: 400, height: 100 }
    expect(toMarker(2, { x: 200, y: 225, width: 100, height: 50 }, clip)).toEqual({ n: 2, x: 25, y: 25, w: 25, h: 50 })
  })

  it('clips boxes that reach outside the area', () => {
    expect(toMarker(3, { x: -50, y: 850, width: 194, height: 100 }, viewport)).toEqual({
      n: 3,
      x: 0,
      y: 94.44,
      w: 10,
      h: 5.56,
    })
  })

  it('rounds to 0.01%', () => {
    expect(toMarker(4, { x: 1, y: 1, width: 1, height: 1 }, { x: 0, y: 0, width: 3, height: 3 })).toEqual({
      n: 4,
      x: 33.33,
      y: 33.33,
      w: 33.34,
      h: 33.34,
    })
  })
})

describe('placeholders', () => {
  it('parses {campaign:Weekly Digest #142}', () => {
    expect(parsePlaceholders('/w/acme-newsletter/campaigns/{campaign:Weekly Digest #142}/review')).toEqual([
      { token: '{campaign:Weekly Digest #142}', kind: 'campaign', value: 'Weekly Digest #142' },
    ])
  })

  it('parses several placeholders and leaves the rest of the path alone', () => {
    const path =
      '/w/acme-newsletter/x?content={campaign:Weekly Digest #142}&test={placement:Weekly Digest #142 · SES vs Postal}'
    expect(parsePlaceholders(path).map((p) => [p.kind, p.value])).toEqual([
      ['campaign', 'Weekly Digest #142'],
      ['placement', 'Weekly Digest #142 · SES vs Postal'],
    ])
    expect(parsePlaceholders('/w/acme-newsletter/campaigns?status=sent')).toEqual([])
  })

  it('fills placeholders with URL-encoded ids', () => {
    const path = '/w/acme-newsletter/campaigns/{campaign:Weekly Digest #142}/edit?select=2'
    expect(fillPath(path, { '{campaign:Weekly Digest #142}': 'a b/c' })).toBe(
      '/w/acme-newsletter/campaigns/a%20b%2Fc/edit?select=2',
    )
    expect(() => fillPath(path, {})).toThrow('no id for {campaign:Weekly Digest #142}')
  })

  it('finds the workspace of a path', () => {
    expect(workspaceOf('/w/northwind-studio/agency/usage')).toBe('northwind-studio')
    expect(workspaceOf('/w/acme-newsletter?x=1')).toBe('acme-newsletter')
    expect(workspaceOf('/p/acme-newsletter/subscribe')).toBeUndefined()
  })
})

describe('parseTempPassword', () => {
  it('reads the password `reputecast install` prints (internal/cli/install.go printInstall)', () => {
    const out = [
      '',
      '  ReputeCast is installed.',
      '',
      '  Sign in at  http://localhost:5173',
      '  Email       owner@example.com',
      "  Password    k7Qm-2xPa-9dRt-WbN3   (temporary: you'll replace it at first sign-in)",
      '',
    ].join('\n')
    expect(parseTempPassword(out)).toBe('k7Qm-2xPa-9dRt-WbN3')
  })

  it('fails when no temporary password was printed', () => {
    expect(() => parseTempPassword('  Password    the one you set\n')).toThrow('no temporary password')
  })
})

describe('manifest', () => {
  it('has unique kebab-case ids', () => {
    const ids = shots.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('captures features without Vietnamese UI in English only', () => {
    for (const s of shots) {
      expect(s.locales, s.id).toEqual(englishOnlyFeatures.includes(s.feature) ? ['en'] : undefined)
    }
  })

  it('uses only placeholders the resolver knows', () => {
    for (const s of shots) for (const p of parsePlaceholders(s.path)) expect(placeholderKinds, s.id).toContain(p.kind)
  })

  it('uses structural marker selectors, numbered from 1', () => {
    for (const s of shots) {
      const markers = s.markers ?? []
      expect(
        markers.map((m) => m.n),
        s.id,
      ).toEqual(markers.map((_, i) => i + 1))
      for (const m of markers) expect(m.selector, s.id).not.toMatch(/:has-text|:text|text=|internal:text/)
    }
  })

  it('runs demo sends and clips only where they apply', () => {
    for (const s of shots) {
      if (s.demoSend) expect(s.sample ?? 'acme', s.id).toBe('acme')
      if (s.clip !== undefined) expect(s.clip, s.id).not.toBe('')
    }
  })
})
