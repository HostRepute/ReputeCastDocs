import { getCollection } from 'astro:content'
import { OGImageRoute } from 'astro-og-canvas'
import { API_OG, ogKey } from '../../lib/og.ts'

const entries = await getCollection('docs')
const pages: Record<string, { title: string; description?: string }> = Object.fromEntries(
  entries.map((entry) => [ogKey(entry.id), { title: entry.data.title, description: entry.data.description }]),
)
pages.api = API_OG

export const { getStaticPaths, GET } = await OGImageRoute({
  pages,
  getImageOptions: (_path, page: { title: string; description?: string }) => ({
    title: page.title,
    description: page.description,
    bgGradient: [[11, 18, 32]],
    border: { color: [15, 118, 110], width: 24, side: 'inline-start' },
    padding: 72,
    logo: { path: './src/assets/brand/og-logo.png', size: [96] },
    font: {
      title: { families: ['IBM Plex Sans'], weight: 'Bold', size: 64, color: [255, 255, 255], lineHeight: 1.15 },
      description: {
        families: ['IBM Plex Sans'],
        weight: 'Normal',
        size: 30,
        color: [195, 194, 183],
        lineHeight: 1.45,
      },
    },
    fonts: ['./src/assets/og/IBMPlexSans-Bold.ttf', './src/assets/og/IBMPlexSans-Regular.ttf'],
  }),
})
