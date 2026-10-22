import { defineCollection } from 'astro:content'
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders'
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema'
import { z } from 'astro/zod'

const docsExtension = z.object({
  /** Diátaxis page type; required on non-splash pages by scripts/content/check.ts. */
  type: z.enum(['tutorial', 'how-to', 'explanation', 'reference']).optional(),
  audience: z.array(z.enum(['publisher', 'admin', 'operator', 'developer'])).default([]),
  /** Permission keys the task needs, e.g. `campaigns:send`. */
  permissions: z.array(z.string()).default([]),
  /** UI label ids joined by ' > ', e.g. `nav.settings > settings.keys`. */
  uiPath: z.string().optional(),
  /** Required on non-splash pages by scripts/content/check.ts. */
  primaryKeyword: z.string().optional(),
  /** Upstream repo-relative paths this page documents. */
  sources: z.array(z.string()).default([]),
})

const uiStrings = z.object({
  'rc.type.tutorial': z.string(),
  'rc.type.how-to': z.string(),
  'rc.type.explanation': z.string(),
  'rc.type.reference': z.string(),
  'rc.meta.for': z.string(),
  'rc.audience.publisher': z.string(),
  'rc.audience.admin': z.string(),
  'rc.audience.operator': z.string(),
  'rc.audience.developer': z.string(),
  'rc.meta.permissions': z.string(),
  'rc.meta.sensitive': z.string(),
  'rc.meta.where': z.string(),
  'rc.shot.englishFallback': z.string(),
  'rc.shot.zoom': z.string(),
  'rc.footer.report': z.string(),
  'rc.footer.website': z.string(),
  'rc.footer.license': z.string(),
  'rc.breadcrumbs': z.string(),
  'rc.uipath.then': z.string(),
})

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema({ extend: docsExtension }) }),
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema({ extend: uiStrings }) }),
}
