import { describe, expect, it } from 'vitest'
import {
  checkPages,
  findTags,
  locateEntry,
  parseFrontmatter,
  type CheckContext,
  type Page,
} from '../../scripts/content/lib.ts'

const ctx = (over: Partial<CheckContext> = {}): CheckContext => ({
  shotIds: new Set(['review-send']),
  shotFilesEn: new Set(['review-send']),
  uiLabels: new Set(['nav.settings', 'settings.keys']),
  permissions: new Set(['campaigns:send']),
  strictI18n: false,
  ...over,
})

const desc = (n: number, keyword = 'send readiness') => {
  const base = `About ${keyword} `
  return base + 'x'.repeat(Math.max(0, n - base.length))
}

const page = (over: Partial<Page> & { data?: Record<string, unknown> } = {}): Page => ({
  file: 'src/content/docs/campaigns/a.mdx',
  locale: 'en',
  path: 'campaigns/a',
  body: '',
  ...over,
  data: {
    title: 'Send Readiness',
    description: desc(120),
    type: 'explanation',
    primaryKeyword: 'send readiness',
    sources: ['internal/readiness'],
    ...over.data,
  },
})

const rules = (pages: Page[], c = ctx()) => checkPages(pages, c).map((i) => `${i.rule}: ${i.detail}`)

describe('title length', () => {
  it('accepts 60 characters and rejects 61', () => {
    expect(rules([page({ data: { title: 'a'.repeat(60) } })])).toEqual([])
    expect(rules([page({ data: { title: 'a'.repeat(61) } })])).toEqual(['title: 61 characters (max 60)'])
  })

  it('counts Vietnamese characters, not bytes', () => {
    expect(rules([page({ data: { title: 'ệ'.repeat(60) } })])).toEqual([])
  })
})

describe('description length', () => {
  it.each([
    [89, false],
    [90, true],
    [160, true],
    [161, false],
  ])('%i characters valid=%s', (n, ok) => {
    const out = rules([page({ data: { description: desc(n) } })])
    expect(out.length === 0).toBe(ok)
  })
})

describe('keywords and uniqueness', () => {
  it('requires the primary keyword in the description, case-insensitively', () => {
    expect(rules([page({ data: { primaryKeyword: 'Send Readiness' } })])).toEqual([])
    expect(rules([page({ data: { primaryKeyword: 'inbox placement' } })])).toEqual([
      'description: does not contain primaryKeyword "inbox placement"',
    ])
  })

  it('flags duplicate descriptions within a locale but not across locales', () => {
    const a = page()
    const b = page({ file: 'b.mdx', path: 'campaigns/b', data: { title: 'Other' } })
    expect(rules([a, b])).toEqual(['description: duplicate of src/content/docs/campaigns/a.mdx'])
    const vi = page({ file: 'vi.mdx', locale: 'vi' })
    expect(rules([a, vi])).toEqual([])
  })

  it('requires type, keyword and sources except on splash pages', () => {
    const bare = page({ data: { type: undefined, primaryKeyword: undefined, sources: [] } })
    expect(rules([bare])).toEqual(['type: missing', 'primaryKeyword: missing', 'sources: missing or empty'])
    expect(
      rules([page({ data: { template: 'splash', type: undefined, primaryKeyword: undefined, sources: [] } })]),
    ).toEqual([])
  })
})

describe('references', () => {
  it('checks screenshot ids, English files and alt text', () => {
    const body = [
      '<Screenshot id="review-send" alt="The verdict." />',
      '<Screenshot id="missing" alt="x" />',
      '<Screenshot\n  id="review-send"\n  alt=""\n/>',
    ].join('\n')
    expect(rules([page({ body })])).toEqual([
      'screenshot: line 2: "missing" is not in the manifest',
      'screenshot: line 3: "review-send" has empty alt text',
    ])
    expect(rules([page({ body: '<Screenshot id="review-send" alt="a" />' })], ctx({ shotFilesEn: new Set() }))).toEqual(
      ['screenshot: line 1: "review-send" has no English file'],
    )
  })

  it('checks UI label ids in frontmatter and components, and permission keys', () => {
    const p = page({
      data: { uiPath: 'nav.settings > settings.nope', permissions: ['campaigns:send', 'nope:x'] },
      body: '<UiPath path="nav.settings > settings.keys" /> <UiPath path="nav.gone" />',
    })
    expect(rules([p])).toEqual([
      'permissions: unknown key "nope:x"',
      'uiPath: unknown UI label "settings.nope"',
      'uiPath: line 1: unknown UI label "nav.gone"',
    ])
  })
})

describe('strict i18n parity', () => {
  it('reports missing counterparts in both directions only when strict', () => {
    const en = page()
    const viOnly = page({ file: 'vi/x.mdx', locale: 'vi', path: 'x', data: { title: 'X', description: desc(100) } })
    expect(rules([en, viOnly])).toEqual([])
    expect(rules([en, viOnly], ctx({ strictI18n: true }))).toEqual([
      'i18n: missing Vietnamese page vi/campaigns/a',
      'i18n: no English page x',
    ])
  })
})

describe('parsing helpers', () => {
  it('locates locale and path', () => {
    expect(locateEntry('vi/campaigns/a.mdx')).toEqual({ locale: 'vi', path: 'campaigns/a' })
    expect(locateEntry('campaigns/a.mdx')).toEqual({ locale: 'en', path: 'campaigns/a' })
    expect(locateEntry('vi/index.mdx')).toEqual({ locale: 'vi', path: 'index' })
  })

  it('parses frontmatter and attributes with expressions and > inside quotes', () => {
    const { data, body } = parseFrontmatter(
      '---\ntitle: A\n---\n<UiPath path="a > b" /><Screenshot id={"x"} alt={`a > b`} />',
    )
    expect(data).toEqual({ title: 'A' })
    expect(findTags(body, 'UiPath')[0].attrs).toEqual({ path: 'a > b' })
    expect(findTags(body, 'Screenshot')[0].attrs).toEqual({ id: 'x', alt: 'a > b' })
  })
})
