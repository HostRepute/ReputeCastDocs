import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { diffIds } from '../../scripts/upstream/lib/diff.ts'
import { catalogs, parseMcpServer } from '../../scripts/upstream/lib/mcp.ts'
import { parseStringConstants } from '../../scripts/upstream/lib/permissions.ts'

const root = new URL('../fixtures/upstream/', import.meta.url).pathname
const read = (path: string) => readFileSync(`${root}${path}`, 'utf8')
const sources = [read('internal/mcpserver/tools.go'), read('internal/mcpserver/resources.go')]
const permissions = parseStringConstants(read('internal/authz/permissions.go'))

const expected = [
  'tool:list_campaigns',
  'tool:list_campaigns=campaigns:view',
  'tool:get_campaign_report',
  'tool:get_campaign_report=reports:view',
  'tool:create_segment',
  'tool:create_segment=segments:edit',
  'resource:reputecast://campaigns/{id}.mjml',
  'resource:reputecast://campaigns/{id}/report.csv',
  'resource:reputecast://audit/recent.json',
  'prompt:draft_weekly_digest',
  'prompt:explain_auto_pause',
]

describe('parseMcpServer', () => {
  it('reads tool() registrations with their permission, resource URIs and prompt names', () => {
    expect(parseMcpServer(sources, permissions)).toEqual(expected)
  })

  it("ignores the generic helper's own mcp.AddTool call", () => {
    expect(parseMcpServer([sources[0]], permissions).filter((id) => !id.includes('='))).toEqual([
      'tool:list_campaigns',
      'tool:get_campaign_report',
      'tool:create_segment',
    ])
  })

  it('fails on a permission constant it cannot resolve', () => {
    expect(() => parseMcpServer(sources, new Map())).toThrow(
      'tool list_campaigns checks unknown permission authz.CampaignsView',
    )
  })

  it('fails on a resource URI constant it cannot resolve', () => {
    expect(() => parseMcpServer([sources[1].replace(/^const \([\s\S]*?^\)/m, '')], permissions)).toThrow(
      'cannot resolve resource URI mjmlTemplate',
    )
  })
})

describe('catalogs', () => {
  const [mcp] = catalogs

  it('extracts from internal/mcpserver with the authz constants', () => {
    expect(mcp.extract(root).sort()).toEqual([...expected].sort())
  })

  it('compares rows as type:id plus the tool permission', () => {
    const rows = [
      { id: 'list_campaigns', type: 'tool', permission: 'campaigns:view' },
      { id: 'get_campaign_report', type: 'tool', permission: 'campaigns:view' },
      { id: 'create_segment', type: 'tool', permission: 'segments:edit' },
      { id: 'reputecast://campaigns/{id}.mjml', type: 'resource', permission: 'campaigns:view' },
      { id: 'reputecast://campaigns/{id}/report.csv', type: 'resource', permission: 'reports:view' },
      { id: 'reputecast://audit/recent.json', type: 'resource', permission: 'audit:view' },
      { id: 'draft_weekly_digest', type: 'prompt' },
      { id: 'explain_auto_pause', type: 'prompt' },
    ]
    expect(diffIds(mcp.dataIds!(rows), mcp.extract(root))).toEqual({
      added: ['tool:get_campaign_report=reports:view'],
      removed: ['tool:get_campaign_report=campaigns:view'],
    })
  })
})
