import { defineMessages } from '@/i18n'

/**
 * Settings › Keys & MCP (A5 §5.10, SettingsKeys, SettingsKeysStates): the API
 * keys and MCP agents tables, the recent agent actions, the create, rotate,
 * revoke and delete dialogs, the one-time secret and the shared parts.
 * Permission keys (campaigns:send), audit action names (apikey.revoked) and
 * error codes (401 key_expired) stay as they are.
 */
export const m = defineMessages('keys', {
  presetConversions: 'Conversions key',
  expiryNever: 'Never',
  expiryDays: 'In {days, plural, one {# day} other {# days}}',
  expiryYears: 'In {years, plural, one {# year} other {# years}}',
  sensitiveFlag: 'sensitive',
  includedBy: 'included by {key}',
  listScopeLabel: 'List scope <opt>· optional</opt>',
  allListsOption: 'All lists',
})
