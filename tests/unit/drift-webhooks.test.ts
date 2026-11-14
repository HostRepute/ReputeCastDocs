import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseStringConstants } from '../../scripts/upstream/lib/permissions.ts'
import { catalogs, parseWebhookEvents } from '../../scripts/upstream/lib/webhooks.ts'

const root = new URL('../fixtures/upstream/', import.meta.url).pathname
const read = (path: string) => readFileSync(`${root}${path}`, 'utf8')

describe('parseWebhookEvents', () => {
  it('reads the keyed rows of the Events catalogue, past comments', () => {
    expect(parseWebhookEvents(read('internal/webhooks/webhooks.go'))).toEqual([
      'contact.subscribed',
      'contact.unsubscribed',
      'contact.updated',
      'contact.erased',
      'referral.counted',
      'referral.held',
    ])
  })

  it('reads keyed WebhookEventInfo values appended in init()', () => {
    expect(parseWebhookEvents(read('internal/push/tracking.go'))).toEqual(['push.clicked'])
    expect(parseWebhookEvents(read('internal/website/post_publish.go'))).toEqual(['post.published', 'post.unpublished'])
  })

  it('resolves a Name given as a string constant of the same package', () => {
    const constants = parseStringConstants(read('internal/inbound/api.go'), read('internal/inbound/process.go'))
    expect(parseWebhookEvents(read('internal/inbound/api.go'), constants)).toEqual(['email.replied', 'email.received'])
    expect(() => parseWebhookEvents(read('internal/inbound/api.go'))).toThrow('unknown constant EventReplied')
  })

  it('finds nothing in files without events', () => {
    expect(parseWebhookEvents(read('internal/api/errors.go'))).toEqual([])
  })
})

describe('catalogs', () => {
  it('collects the catalogue and every init() append under internal/', () => {
    expect(catalogs[0].extract(root).sort()).toEqual(
      [
        'contact.erased',
        'contact.subscribed',
        'contact.unsubscribed',
        'contact.updated',
        'email.received',
        'email.replied',
        'post.published',
        'post.unpublished',
        'push.clicked',
        'referral.counted',
        'referral.held',
      ].sort(),
    )
  })
})
