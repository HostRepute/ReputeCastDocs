// Builds the starlight-sidebar-topics configuration from src/lib/topics.ts.
// Groups and links whose pages do not exist yet are left out, so an empty group never ships.
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { StarlightUserConfig } from '@astrojs/starlight/types'
import type { StarlightSidebarTopicsUserConfig } from 'starlight-sidebar-topics'
import { topics, type SidebarSpec } from './topics.ts'

type SidebarItem = NonNullable<StarlightUserConfig['sidebar']>[number]

const docsDir = join(process.cwd(), 'src/content/docs')

function hasPages(directory: string): boolean {
  const dir = join(docsDir, directory)
  return existsSync(dir) && readdirSync(dir).some((f) => /\.mdx?$/.test(f))
}

function pageExists(slug: string): boolean {
  return existsSync(join(docsDir, `${slug}.mdx`)) || existsSync(join(docsDir, `${slug}.md`))
}

function toItems(spec: SidebarSpec, apiGroup: SidebarItem | undefined): SidebarItem[] {
  switch (spec.kind) {
    case 'group':
      if (!hasPages(spec.directory)) return []
      return [
        {
          label: spec.label.en,
          translations: { vi: spec.label.vi },
          collapsed: spec.collapsed,
          items: [{ autogenerate: { directory: spec.directory } }],
        },
      ]
    case 'flat':
      return hasPages(spec.directory) ? [{ autogenerate: { directory: spec.directory } }] : []
    case 'links': {
      const slugs = spec.slugs.filter(pageExists)
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

/** Topics with at least one page. `apiGroup` is the starlight-openapi sidebar group placeholder. */
export function sidebarTopics(apiGroup?: SidebarItem): StarlightSidebarTopicsUserConfig {
  return topics.flatMap((topic) => {
    const items = topic.sidebar.flatMap((spec) => toItems(spec, apiGroup))
    const hasOwnPage = topic.sidebar.some((s) => (s.kind === 'group' || s.kind === 'flat') && hasPages(s.directory))
    if (!hasOwnPage) return []
    return [{ id: topic.id, label: topic.label, link: topic.link, icon: topic.icon, items }]
  })
}
