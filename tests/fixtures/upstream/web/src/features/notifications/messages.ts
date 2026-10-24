import { defineMessages } from '@/i18n'

/**
 * The notification center (A5 §5.16): the category filters, the list and my
 * preferences. Each notification's title and body, and the event types'
 * names and audiences in the preferences, come from the server as they are.
 */
export const m = defineMessages('notifications', {
  title: 'Notifications',
  account: 'Account & security',
  filterLabel: 'Filter',
  filter: '{filter, select, unread {Unread} approvals {Approvals} sending {Sending} providers {Providers} team {Team} hostrepute {HostRepute} other {All}}',
  unreadCount: 'Unread · {count}',
})
