import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkUiLabels, checkUiLabelsAt, hasLiteral, viSibling } from '../../scripts/upstream/lib/ui-labels.ts'

// Verbatim snippets of the upstream files named in `source`, at their upstream-relative paths.
const root = join(import.meta.dirname, '../fixtures/upstream')
const settings = 'web/src/features/settings/messages.ts'

describe('checkUiLabelsAt', () => {
  it('accepts labels whose English and Vietnamese literals are both upstream', () => {
    const rows = [
      { id: 'settings.keys', en: 'Keys & MCP', vi: 'Khóa và MCP', source: settings },
      { id: 'admin.instance', en: 'Instance & updates', vi: 'Hệ thống và cập nhật', source: settings },
    ]
    expect(checkUiLabelsAt(root, rows)).toEqual({ problems: [], viAvailable: [] })
  })

  it('reports an English label that changed upstream', () => {
    const rows = [{ id: 'settings.keys', en: 'Keys and MCP', vi: 'Khóa và MCP', source: settings }]
    expect(checkUiLabelsAt(root, rows).problems).toEqual([
      `settings.keys: English "Keys and MCP" not found in ${settings}`,
    ])
  })

  it('reports a Vietnamese label that changed upstream', () => {
    const rows = [{ id: 'settings.audit', en: 'Audit log', vi: 'Nhật ký', source: settings }]
    expect(checkUiLabelsAt(root, rows).problems).toEqual([
      'settings.audit: Vietnamese "Nhật ký" not found in web/src/features/settings/messages.vi.ts',
    ])
  })

  it('lists labels without vi whose source now has a Vietnamese file', () => {
    const rows = [{ id: 'settings.roles', en: 'Roles', source: settings }]
    expect(checkUiLabelsAt(root, rows)).toEqual({ problems: [], viAvailable: ['settings.roles'] })
  })

  it('finds hard-coded English as JSX text, including HTML entities, and never expects vi for .tsx', () => {
    const rows = [
      { id: 'webhooks.addEndpoint', en: 'Add endpoint', source: 'web/src/features/webhooks/WebhooksPage.tsx' },
      { id: 'webhooks.empty', en: 'No webhooks', source: 'web/src/features/webhooks/WebhooksPage.tsx' },
      { id: 'admin.versionCard', en: 'Version & updates', source: 'web/src/features/admin/instance/InstancePage.tsx' },
    ]
    expect(checkUiLabelsAt(root, rows)).toEqual({ problems: [], viAvailable: [] })
  })

  it('reports missing sources, a vi without a translation file, and duplicate ids', () => {
    const page = 'web/src/features/webhooks/WebhooksPage.tsx'
    const rows = [
      { id: 'gone', en: 'Gone', source: 'web/src/features/gone/messages.ts' },
      { id: 'webhooks.addEndpoint', en: 'Add endpoint', vi: 'Thêm endpoint', source: page },
      { id: 'webhooks.addEndpoint', en: 'Add endpoint', source: page },
    ]
    expect(checkUiLabelsAt(root, rows).problems).toEqual([
      'gone: source web/src/features/gone/messages.ts not found upstream',
      `webhooks.addEndpoint: has vi but ${page} has no translation file`,
      'webhooks.addEndpoint: duplicate id',
    ])
  })
})

describe('checkUiLabels', () => {
  it('reads files only through the given reader', () => {
    const files: Record<string, string> = { 'a/messages.ts': "  save: 'Save',", 'a/messages.vi.ts': "  save: 'Lưu'," }
    const rows = [{ id: 'a.save', en: 'Save', vi: 'Lưu', source: 'a/messages.ts' }]
    expect(checkUiLabels(rows, (p) => files[p])).toEqual({ problems: [], viAvailable: [] })
  })
})

describe('hasLiteral', () => {
  it('matches whole quoted literals with the source escaping, not substrings', () => {
    const src = `a: "Couldn't load", b: 'It\\'s here', c: \`Back\\\\slash\`, d: 'Save draft'`
    expect(hasLiteral(src, "Couldn't load")).toBe(true)
    expect(hasLiteral(src, "It's here")).toBe(true)
    expect(hasLiteral(src, 'Back\\slash')).toBe(true)
    expect(hasLiteral(src, 'Save')).toBe(false)
  })

  it('accepts JSX text only when asked', () => {
    expect(hasLiteral('<b>\n  Export CSV\n</b>', 'Export CSV')).toBe(false)
    expect(hasLiteral('<b>\n  Export CSV\n</b>', 'Export CSV', true)).toBe(true)
  })
})

describe('viSibling', () => {
  it('maps message sources to their Vietnamese files', () => {
    expect(viSibling('web/src/features/settings/messages.ts')).toBe('web/src/features/settings/messages.vi.ts')
    expect(viSibling('web/src/features/audience/health.messages.ts')).toBe(
      'web/src/features/audience/health.messages.vi.ts',
    )
    expect(viSibling('internal/pagelabels/messages/en.json')).toBe('internal/pagelabels/messages/vi.json')
    expect(viSibling('web/src/features/keys/KeysPage.tsx')).toBeUndefined()
  })
})
