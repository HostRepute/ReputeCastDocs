import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkUiLabels, checkUiLabelsAt, hasLiteral, viSiblings } from '../../scripts/upstream/lib/ui-labels.ts'

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

  it('finds labels shown as ICU select or plural options and as messages with inline tags', () => {
    const notifications = 'web/src/features/notifications/messages.ts'
    const keys = 'web/src/features/keys/messages.ts'
    const rows = [
      { id: 'notifications.tabUnread', en: 'Unread', vi: 'Chưa đọc', source: notifications },
      { id: 'notifications.tabAll', en: 'All', vi: 'Tất cả', source: notifications },
      { id: 'keys.expiresIn30Days', en: 'In 30 days', vi: 'Sau 30 ngày', source: keys },
      { id: 'keys.listScope', en: 'List scope · optional', vi: 'Phạm vi danh sách · không bắt buộc', source: keys },
      {
        id: 'ses.enforcementShutdown',
        en: 'sending paused by AWS',
        vi: 'AWS đã tạm dừng gửi',
        source: 'internal/providers/ses/messages/en.json',
      },
    ]
    expect(checkUiLabelsAt(root, rows)).toEqual({ problems: [], viAvailable: [] })
  })

  it('reports a label that upstream quotes only in a comment', () => {
    const sso = 'web/src/features/admin/sso/setup.messages.ts'
    const rows = [
      { id: 'sso.cardConnection', en: '2 · Connection', source: sso },
      { id: 'sso.presetApp', en: 'Entra app registration', source: sso },
    ]
    expect(checkUiLabelsAt(root, rows).problems).toEqual([
      `sso.presetApp: English "Entra app registration" not found in ${sso}`,
    ])
  })

  it('reads the Vietnamese of xMessages.ts from x.messages.vi.ts', () => {
    const digests = 'web/src/features/digests/settingsMessages.ts'
    const row = { id: 'digestSettings.weekly', en: 'Weekly', source: digests }
    expect(checkUiLabelsAt(root, [{ ...row, vi: 'Hằng tuần' }])).toEqual({ problems: [], viAvailable: [] })
    expect(checkUiLabelsAt(root, [row])).toEqual({ problems: [], viAvailable: ['digestSettings.weekly'] })
  })

  it('reports missing sources, a vi without a translation file, and duplicate ids', () => {
    const languages = 'web/src/i18n/languages.ts'
    const go = 'internal/webhooks/webhooks.go'
    const rows = [
      { id: 'gone', en: 'Gone', source: 'web/src/features/gone/messages.ts' },
      { id: 'language.pseudoLocale', en: 'Pseudo (+40%)', vi: 'Giả lập (+40%)', source: languages },
      { id: 'language.pseudoLocale', en: 'Pseudo (+40%)', source: languages },
      { id: 'webhooks.groupContacts', en: 'Contacts', vi: 'Liên hệ', source: go },
    ]
    expect(checkUiLabelsAt(root, rows).problems).toEqual([
      'gone: source web/src/features/gone/messages.ts not found upstream',
      'language.pseudoLocale: has vi but web/src/i18n/languages.vi.ts not found',
      'language.pseudoLocale: duplicate id',
      `webhooks.groupContacts: has vi but ${go} has no translation file`,
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

  it('ignores text quoted in comments, also after an apostrophe in a comment', () => {
    const sales = readFileSync(join(root, 'web/src/features/products/sales.messages.ts'), 'utf8')
    const sso = readFileSync(join(root, 'web/src/features/admin/sso/setup.messages.ts'), 'utf8')
    const languages = readFileSync(join(root, 'web/src/i18n/languages.ts'), 'utf8')
    expect(hasLiteral(sales, 'Product sales')).toBe(false)
    expect(hasLiteral(sales, 'Product sales · 30 days')).toBe(true)
    expect(hasLiteral(sso, 'Entra ID')).toBe(false)
    expect(hasLiteral(sso, '3 · Claim mapping')).toBe(true)
    expect(hasLiteral(languages, 'Tiếng Việt')).toBe(true)
  })

  it('matches the text of ICU options with # as a number, never a plain argument, and drops inline tags', () => {
    const sales = readFileSync(join(root, 'web/src/features/products/sales.messages.ts'), 'utf8')
    const keys = readFileSync(join(root, 'web/src/features/keys/messages.ts'), 'utf8')
    const notifications = readFileSync(join(root, 'web/src/features/notifications/messages.ts'), 'utf8')
    expect(hasLiteral(sales, 'orders')).toBe(true)
    expect(hasLiteral(sales, 'refunded · 2 orders')).toBe(true)
    expect(hasLiteral(sales, 'refunded · orders')).toBe(false)
    expect(hasLiteral(keys, 'In 1 day')).toBe(true)
    expect(hasLiteral(keys, 'List scope · optional')).toBe(true)
    expect(hasLiteral(keys, 'List scope')).toBe(false)
    expect(hasLiteral(notifications, 'HostRepute')).toBe(true)
    expect(hasLiteral(notifications, 'Unread · 3')).toBe(false)
  })

  it("resolves ICU apostrophe quoting ('{{ tier }}' is literal text)", () => {
    // internal/earn/messages/en.json:202
    const src = `  "starter.member-welcome.heading": "Welcome to '{{ tier }}'",`
    expect(hasLiteral(src, 'Welcome to {{ tier }}')).toBe(true)
  })
})

describe('viSiblings', () => {
  it('maps message sources to their Vietnamese files', () => {
    expect(viSiblings('web/src/features/settings/messages.ts')).toEqual(['web/src/features/settings/messages.vi.ts'])
    expect(viSiblings('web/src/features/audience/health.messages.ts')).toEqual([
      'web/src/features/audience/health.messages.vi.ts',
    ])
    expect(viSiblings('web/src/i18n/common.ts')).toEqual([
      'web/src/i18n/common.vi.ts',
      'web/src/i18n/common.messages.vi.ts',
    ])
    expect(viSiblings('internal/pagelabels/messages/en.json')).toEqual(['internal/pagelabels/messages/vi.json'])
    expect(viSiblings('web/src/features/digests/settingsMessages.ts')).toEqual([
      'web/src/features/digests/settings.messages.vi.ts',
    ])
    expect(viSiblings('web/src/features/keys/KeysPage.tsx')).toEqual([])
  })

  it('reads Vietnamese from common.messages.vi.ts when common.vi.ts does not exist', () => {
    const files: Record<string, string> = {
      'web/src/i18n/common.ts': "export const common = { save: 'Save changes' }",
      'web/src/i18n/common.messages.vi.ts': "export default { save: 'Lưu thay đổi' }",
    }
    const rows = [
      { id: 'common.saveChanges', en: 'Save changes', vi: 'Lưu thay đổi', source: 'web/src/i18n/common.ts' },
    ]
    expect(checkUiLabels(rows, (p) => files[p])).toEqual({ problems: [], viAvailable: [] })
  })
})
