import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { catalogs, parseWebhookEvents } from '../../scripts/upstream/lib/webhooks.ts'

const root = new URL('../fixtures/upstream/', import.meta.url).pathname
const read = (path: string) => readFileSync(`${root}${path}`, 'utf8')

describe('parseWebhookEvents', () => {
  it('reads the positional rows of the Events catalogue, past comments', () => {
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
        'post.published',
        'post.unpublished',
        'push.clicked',
        'referral.counted',
        'referral.held',
      ].sort(),
    )
  })
})
