import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  SERVER_URL,
  SpecError,
  humanizeSummary,
  keyCallableTags,
  transformSpec,
  type ApiTag,
  type CodeSample,
  type Operation,
  type Spec,
  type TransformOptions,
} from '../../scripts/upstream/lib/openapi.ts'

const fixture = JSON.parse(readFileSync(new URL('../fixtures/openapi/spec.json', import.meta.url), 'utf8')) as Spec

const tags: ApiTag[] = [
  { id: 'Transactional messages', description: 'Send transactional email.', order: 20 },
  { id: 'SMS campaigns', description: 'Create and send SMS campaigns.', order: 10 },
  { id: 'WordPress plugin', description: 'Operations the WordPress plugin calls.', order: 30 },
]

function options(overrides: Partial<TransformOptions> = {}): TransformOptions {
  return {
    permissions: new Map([
      ['campaigns:view', { sensitive: false }],
      ['campaigns:edit', { sensitive: false }],
      ['transactional:send', { sensitive: true }],
    ]),
    tags,
    samples: new Map(),
    ...overrides,
  }
}

const op = (spec: Spec, path: string, method: string) => spec.paths[path]?.[method] as Operation | undefined

describe('transformSpec', () => {
  it('keeps only operations an API key can call and drops paths left empty', () => {
    const { spec, operations, sourceOperations } = transformSpec(fixture, options())
    expect(sourceOperations).toBe(5)
    expect(operations).toBe(3)
    expect(Object.keys(spec.paths)).toEqual([
      '/api/v1/workspaces/{workspace}/sms-campaigns',
      '/api/v1/workspaces/{workspace}/transactional/messages',
      '/api/v1/workspaces/{workspace}/wordpress/report',
    ])
    expect(op(spec, '/api/v1/workspaces/{workspace}/sms-campaigns', 'post')).toBeUndefined()
    expect(op(spec, '/api/v1/workspaces/{workspace}/sms-campaigns', 'get')?.security).toEqual([{ bearer: [] }])
    expect(Object.keys(spec.components?.securitySchemes ?? {})).toEqual(['bearer'])
  })

  it('prunes components to those reachable from kept operations, transitively', () => {
    const { spec, schemas } = transformSpec(fixture, options())
    expect(Object.keys(spec.components?.schemas ?? {}).sort()).toEqual([
      'ErrorDetail',
      'Problem',
      'SmsCampaign',
      'SmsCampaignList',
    ])
    expect(schemas).toBe(4)
  })

  it('humanizes kebab-case summaries', () => {
    const { spec } = transformSpec(fixture, options())
    expect(op(spec, '/api/v1/workspaces/{workspace}/sms-campaigns', 'get')?.summary).toBe('List SMS campaigns')
  })

  it('puts the permission, sensitivity and integration-key rule before the description', () => {
    const { spec } = transformSpec(fixture, options())
    expect(op(spec, '/api/v1/workspaces/{workspace}/sms-campaigns', 'get')?.description).toBe(
      '**Permission:** `campaigns:view`',
    )
    expect(op(spec, '/api/v1/workspaces/{workspace}/transactional/messages', 'post')?.description).toBe(
      '**Permission:** `transactional:send` (sensitive)\n\nAnswers 202 with the message ID and status queued.',
    )
    expect(op(spec, '/api/v1/workspaces/{workspace}/wordpress/report', 'post')?.description).toBe(
      "**Permission:** none\n\n**Keys:** only a WordPress site's key can call this operation.",
    )
  })

  it('sets the title, description, example server and tags in api-tags.yaml order', () => {
    const { spec, tags: count } = transformSpec(fixture, options())
    expect(spec.info.title).toBe('ReputeCast API')
    expect(spec.info.version).toBe('v1') // a development build's "dev" is shown as the API version v1
    expect(spec.info.description).toContain('/api/v1')
    expect(spec.servers).toEqual([{ url: SERVER_URL, description: 'Your ReputeCast public URL' }])
    expect(spec.tags?.map((t) => t.name)).toEqual(['SMS campaigns', 'Transactional messages', 'WordPress plugin'])
    expect(spec.tags?.[0]?.description).toBe('Create and send SMS campaigns.')
    expect(count).toBe(3)
  })

  it('appends /api/v1 to the server when paths do not carry it', () => {
    const paths = Object.fromEntries(
      Object.entries(fixture.paths).map(([p, item]) => [p.slice('/api/v1'.length), item]),
    )
    const { spec } = transformSpec({ ...fixture, paths }, options())
    expect(spec.servers?.[0]?.url).toBe(`${SERVER_URL}/api/v1`)
  })

  it('merges authored code samples by operationId', () => {
    const samples: CodeSample[] = [{ lang: 'python', label: 'Python', source: 'import requests' }]
    const { spec } = transformSpec(fixture, options({ samples: new Map([['send-transactional-message', samples]]) }))
    expect(op(spec, '/api/v1/workspaces/{workspace}/transactional/messages', 'post')?.['x-codeSamples']).toEqual(
      samples,
    )
  })

  it('errors on a tag missing from the tags list, naming it', () => {
    expect(() => transformSpec(fixture, options({ tags: tags.filter((t) => t.id !== 'SMS campaigns') }))).toThrow(
      'Tags missing from src/data/api-tags.yaml: SMS campaigns.',
    )
  })

  it('errors on a listed tag without key-callable operations', () => {
    expect(() =>
      transformSpec(fixture, options({ tags: [...tags, { id: 'Sign-in', description: 'Sign in.', order: 40 }] })),
    ).toThrow('Tags in src/data/api-tags.yaml without operations an API key can call: Sign-in.')
  })

  it('errors on an unknown permission key', () => {
    const permissions = new Map([['transactional:send', { sensitive: true }]])
    expect(() => transformSpec(fixture, options({ permissions }))).toThrow(
      'Permission keys missing from src/data/permissions.yaml: campaigns:view.',
    )
  })

  it('errors on samples for an operation that is not kept, and reports every problem at once', () => {
    let error: unknown
    try {
      transformSpec(fixture, options({ tags: [], samples: new Map([['create-sms-campaign', []]]) }))
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(SpecError)
    expect((error as SpecError).problems).toEqual([
      'Code samples for operations that are not in the API reference: create-sms-campaign.',
      'Tags missing from src/data/api-tags.yaml: SMS campaigns, Transactional messages, WordPress plugin.',
    ])
  })

  it('does not change its input', () => {
    const before = structuredClone(fixture)
    transformSpec(fixture, options())
    expect(fixture).toEqual(before)
  })
})

describe('humanizeSummary', () => {
  it('sentence-cases kebab-case and applies the token map', () => {
    expect(humanizeSummary('list-sms-campaigns')).toBe('List SMS campaigns')
    expect(humanizeSummary('api-keys')).toBe('API keys')
    expect(humanizeSummary('get-ab-test-for-whatsapp-2fa')).toBe('Get A/B test for WhatsApp 2FA')
  })

  it('leaves sentences alone', () => {
    expect(humanizeSummary("Send one message with a template's live version")).toBe(
      "Send one message with a template's live version",
    )
  })
})

describe('keyCallableTags', () => {
  it('lists the tags holding at least one bearer operation', () => {
    expect(keyCallableTags(fixture)).toEqual(['SMS campaigns', 'Transactional messages', 'WordPress plugin'])
  })
})
