/** OG image key (path under /og/ without `.png`) for a docs entry id. */
export function ogKey(entryId: string): string {
  return entryId === '' ? 'index' : entryId
}

export const API_OG = {
  title: 'ReputeCast API reference',
  description: 'REST API for campaigns, contacts, transactional email, webhooks and more.',
}
