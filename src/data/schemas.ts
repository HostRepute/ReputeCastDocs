// Zod schemas of the data catalogs in src/data/*.yaml (one array of objects with `id` per file).
// Loaded as content collections in src/content.config.ts; rendered by the components in src/components/.
import { z } from 'astro/zod'

/** Localized text: English required, Vietnamese optional (components fall back to English). */
export const loc = z.object({ en: z.string(), vi: z.string().optional() })
export type Loc = z.infer<typeof loc>

export const cliSchema = z.object({
  id: z.string(), // 'serve', 'user reset-password'; '_global' holds the persistent flags
  command: z.string(), // full usage line, e.g. 'reputecast user reset-password <email>'
  summary: loc,
  description: loc.optional(),
  args: z.string().optional(),
  flags: z.array(z.object({ name: z.string(), type: z.string(), default: z.string(), description: loc })).default([]),
  examples: z.array(z.object({ code: z.string(), description: loc })).default([]),
  devOnly: z.boolean().default(false),
})

export const configSchema = z.object({
  id: z.string(), // dotted koanf key, e.g. 'http.public_url'; env-only vars use the variable name
  env: z.string(),
  type: z.enum(['string', 'int', 'bool', 'duration', 'list']),
  default: z.string(),
  group: z.string(),
  description: loc,
  kind: z.enum(['key', 'env-only']),
})

export const permissionSchema = z.object({
  id: z.string(), // 'campaigns:send'
  group: loc,
  description: loc,
  sensitive: z.boolean(),
  holders: z.enum(['all', 'people', 'no-agents', 'owner']),
  implies: z.array(z.string()).default([]),
})

export const roleSchema = z.object({
  id: z.string(),
  name: loc,
  scope: z.enum(['workspace', 'client', 'agency']),
  description: loc,
  permissions: z.array(z.string()),
})

export const webhookEventSchema = z.object({
  id: z.string(), // 'contact.subscribed'
  group: loc,
  description: loc,
  sample: z.string().optional(), // JSON string
})

export const mcpSchema = z.object({
  id: z.string(),
  type: z.enum(['tool', 'resource', 'prompt']),
  area: loc,
  permission: z.string().optional(),
  effect: z.enum(['read', 'write', 'proposal']).optional(),
  description: loc,
  params: z.array(z.object({ name: z.string(), description: loc })).optional(),
})

export const apiErrorSchema = z.object({
  id: z.string(), // 'permission_denied'
  status: z.number().int(),
  area: loc,
  description: loc,
})

export const limitSchema = z.object({
  id: z.string(), // '<area key>.<setting>', e.g. 'auto-pause.bounce-rate'; <LimitsTable area="auto-pause"> filters on the prefix
  area: loc,
  setting: loc,
  value: z.string(),
  change: loc.optional(), // where/how to change it, or that it is fixed
})

export const glossarySchema = z.object({
  id: z.string(), // anchor on /reference/glossary/
  term: loc,
  definition: loc,
  link: z.string().optional(), // docs path, e.g. '/campaigns/send-readiness/'
})

export const uiLabelSchema = z.object({
  id: z.string(), // 'nav.settings', 'settings.keys', '<feature>.<key>'
  en: z.string(),
  vi: z.string().optional(),
  source: z.string(), // upstream file holding the English literal
})

export const providerSchema = z.object({
  id: z.string(),
  name: z.string(),
  family: z.enum([
    'email',
    'sms',
    'verification',
    'ai',
    'payments',
    'stores',
    'push',
    'whatsapp',
    'seed',
    'import',
    'rendering',
    'lookups',
  ]),
  kind: loc.optional(),
  bulk: loc.optional(),
  webhooks: loc.optional(),
  domainApi: loc.optional(),
  suppressionSync: loc.optional(),
  batch: loc.optional(),
  notes: loc.optional(),
  page: z.string().optional(), // docs path
})

export const shortcutSchema = z.object({
  id: z.string(),
  keys: z.array(z.string()),
  action: loc,
})

export const apiTagSchema = z.object({
  id: z.string(), // OpenAPI tag name
  description: z.string(),
  order: z.number().int(),
})
