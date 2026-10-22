import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { diffIds } from '../../scripts/upstream/lib/diff.ts'
import {
  catalogs,
  parseDefs,
  parsePermissionKeys,
  parseRoleIds,
  parseStringConstants,
} from '../../scripts/upstream/lib/permissions.ts'

const root = new URL('../fixtures/upstream/', import.meta.url).pathname
const permissionsGo = readFileSync(`${root}internal/authz/permissions.go`, 'utf8')
const agencyGo = readFileSync(`${root}internal/authz/agency.go`, 'utf8')

const views = [
  'campaigns:view',
  'templates:view',
  'transactional:view',
  'automations:view',
  'subscribers:view',
  'reports:view',
  'deliverability:view',
  'providers:view',
  'team:view',
  'integrations:view',
  'grow:view',
  'earn:view',
  'website:view',
  'products:view',
  'audit:view',
]
const workspaceKeys = [
  'campaigns:view',
  'campaigns:edit',
  'campaigns:approve',
  'templates:view',
  'transactional:view',
  'automations:view',
  'subscribers:view',
  'segments:edit',
  'segments:sql',
  'reports:view',
  'deliverability:view',
  'providers:view',
  'team:view',
  'integrations:view',
  'grow:view',
  'earn:view',
  'website:view',
  'products:view',
  'audit:view',
  'workspace:transfer',
  'workspace:delete',
]
const agencyKeys = ['agency:view', 'agency:usage', 'agency:library', 'agency:manage']

describe('parsePermissionKeys', () => {
  it('lists the Defs keys in catalogue order, then the agency keys', () => {
    expect(parsePermissionKeys(permissionsGo, agencyGo)).toEqual([...workspaceKeys, ...agencyKeys])
  })

  it('fails on a key constant it cannot resolve', () => {
    expect(() => parseDefs(permissionsGo, 'Defs', new Map())).toThrow('unknown constant CampaignsView')
  })
})

describe('parseDefs', () => {
  const defs = parseDefs(permissionsGo, 'Defs', parseStringConstants(permissionsGo))

  it('reads implied keys', () => {
    expect(defs.find((d) => d.key === 'segments:sql')?.implies).toEqual(['segments:edit', 'subscribers:view'])
    expect(defs.find((d) => d.key === 'campaigns:view')?.implies).toEqual([])
  })

  it('reads the owner-only flag', () => {
    expect(defs.filter((d) => d.ownerOnly).map((d) => d.key)).toEqual(['workspace:transfer', 'workspace:delete'])
  })
})

describe('parseRoleIds', () => {
  const ids = parseRoleIds(permissionsGo, agencyGo)
  const held = (role: string) =>
    ids
      .filter((id) => id.startsWith(`${role}=`))
      .map((id) => id.slice(role.length + 1))
      .sort()

  it('lists the built-in, client and agency roles', () => {
    expect(ids.filter((id) => !id.includes('='))).toEqual([
      'owner',
      'admin',
      'viewer',
      'client_approver',
      'client_viewer',
      'agency_manager',
      'account_manager',
    ])
  })

  it('expands All(), AllGrantable() and viewAll', () => {
    expect(held('owner')).toEqual([...workspaceKeys].sort())
    expect(held('admin')).toEqual(workspaceKeys.filter((k) => !k.startsWith('workspace:')).sort())
    expect(held('viewer')).toEqual([...views].sort())
  })

  it('reads NewSet and AgencySet arguments', () => {
    expect(held('client_approver')).toEqual(
      [
        'campaigns:view',
        'campaigns:approve',
        'templates:view',
        'automations:view',
        'reports:view',
        'deliverability:view',
        'subscribers:view',
      ].sort(),
    )
    expect(held('client_viewer')).toEqual(
      ['campaigns:view', 'templates:view', 'automations:view', 'reports:view', 'deliverability:view'].sort(),
    )
    expect(held('agency_manager')).toEqual([...agencyKeys].sort())
    expect(held('account_manager')).toEqual(['agency:library', 'agency:usage', 'agency:view'])
  })
})

describe('catalogs', () => {
  const [permissions, roles] = catalogs

  it('extracts the permission keys from an upstream checkout', () => {
    expect(permissions.extract(root)).toEqual([...workspaceKeys, ...agencyKeys])
  })

  it('compares role rows as role and role=permission ids', () => {
    const upstream = roles.extract(root).filter((id) => id.startsWith('account_manager'))
    const rows = [{ id: 'account_manager', permissions: ['agency:view', 'agency:usage', 'agency:library'] }]
    expect(diffIds(roles.dataIds!(rows), upstream)).toEqual({ added: [], removed: [] })
    expect(
      diffIds(roles.dataIds!([{ id: 'account_manager', permissions: ['agency:view', 'agency:manage'] }]), upstream),
    ).toEqual({
      added: ['account_manager=agency:library', 'account_manager=agency:usage'],
      removed: ['account_manager=agency:manage'],
    })
  })
})
