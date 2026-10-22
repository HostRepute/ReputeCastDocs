// Builds the starlight-sidebar-topics configuration from src/lib/topics.ts.
// Every group is always configured (scripts/content/check.ts fails when a group directory has no page, so an empty
// group never ships). Cross-topic `slug` links are added only when their page exists, because Starlight rejects
// sidebar slugs without a page.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { StarlightUserConfig } from '@astrojs/starlight/types'
import type { StarlightSidebarTopicsUserConfig } from 'starlight-sidebar-topics'
import { topics, type SidebarSpec } from './topics.ts'

type SidebarItem = NonNullable<StarlightUserConfig['sidebar']>[number]

const docsDir = join(process.cwd(), 'src/content/docs')

function toItems(spec: SidebarSpec, apiGroup: SidebarItem | undefined): SidebarItem[] {
  switch (spec.kind) {
    case 'group':
      return [
        {
          label: spec.label.en,
          translations: { vi: spec.label.vi },
          collapsed: spec.collapsed,
          items: [{ autogenerate: { directory: spec.directory } }],
        },
      ]
    case 'flat':
      return [{ autogenerate: { directory: spec.directory } }]
    case 'links': {
      const slugs = spec.slugs.filter((slug) => existsSync(join(docsDir, `${slug}.mdx`)))
      if (slugs.length === 0) return []
      return [
        {
          label: spec.label.en,
          translations: { vi: spec.label.vi },
          collapsed: spec.collapsed,
          items: slugs.map((slug) => ({ slug })),
        },
      ]
    }
    case 'api':
      return apiGroup ? [apiGroup] : []
  }
}

/** `apiGroup` is the starlight-openapi sidebar group placeholder. */
export function sidebarTopics(apiGroup?: SidebarItem): StarlightSidebarTopicsUserConfig {
  return topics.map((topic) => ({
    id: topic.id,
    label: topic.label,
    link: topic.link,
    icon: topic.icon,
    items: topic.sidebar.flatMap((spec) => toItems(spec, apiGroup)),
  }))
}
