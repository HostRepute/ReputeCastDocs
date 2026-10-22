import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import starlightImageZoom from 'starlight-image-zoom'
import starlightLinksValidator from 'starlight-links-validator'
import starlightLlmsTxt from 'starlight-llms-txt'
import starlightOpenAPI, { createOpenAPISidebarGroup } from 'starlight-openapi'
import starlightSidebarTopics from 'starlight-sidebar-topics'
import previewNoindex from './src/integrations/preview-noindex.ts'
import { sidebarTopics } from './src/lib/sidebar.ts'

const isPreview = process.env.DOCS_PREVIEW === '1'
// Pages whose #anchors come from reference components (glossary terms, CLI commands, keys, tables).
const COMPONENT_ANCHORS = /^\/(vi\/)?(reference\/[^/#]+|developers\/api-errors)\/#/
// Placeholder that starlight-openapi fills with the generated API reference pages (Developers topic).
const apiSidebarGroup = createOpenAPISidebarGroup()
const topicsConfig = sidebarTopics(apiSidebarGroup)

export default defineConfig({
  site: 'https://docs.reputecast.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    starlight({
      title: 'ReputeCast Docs',
      titleDelimiter: '·',
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        vi: { label: 'Tiếng Việt', lang: 'vi' },
      },
      logo: { src: './src/assets/brand/reputecast-mark.svg', alt: 'ReputeCast' },
      favicon: '/favicon.svg',
      head: [
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico', sizes: '32x32' } },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
      ],
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/hostrepute/reputecast' }],
      editLink: { baseUrl: 'https://github.com/HostRepute/ReputeCastDocs/edit/main/' },
      lastUpdated: true,
      customCss: ['./src/styles/fonts.css', './src/styles/tokens.css', './src/styles/theme.css'],
      expressiveCode: {
        // Code panes stay dark in both themes (Clearwater code pane).
        themes: ['github-dark-default'],
        useStarlightDarkModeSwitch: false,
        styleOverrides: {
          codeBackground: '#0b1220',
          borderRadius: '8px',
          codeFontFamily: "'IBM Plex Mono', 'IBM Plex Mono Fallback', monospace",
          uiFontFamily: "'IBM Plex Sans', 'IBM Plex Sans Fallback', sans-serif",
        },
      },
      components: {
        PageTitle: './src/components/overrides/PageTitle.astro',
        Footer: './src/components/overrides/Footer.astro',
      },
      routeMiddleware: './src/routeData.ts',
      plugins: [
        // Must come before starlightSidebarTopics so the API reference group resolves inside the Developers topic.
        starlightOpenAPI([
          {
            base: 'api',
            schema: './src/data/openapi/reputecast.json',
            sidebar: {
              label: 'API reference',
              group: apiSidebarGroup,
              operations: { badges: true, labels: 'summary', sort: 'document' },
              tags: { sort: 'document' },
            },
            snippets: {
              operation: {
                clients: { shell: ['curl'], javascript: ['fetch'], go: ['nethttp'] },
                default: { target: 'shell', client: 'curl' },
              },
            },
          },
        ]),
        starlightSidebarTopics(topicsConfig, {
          exclude: ['/', '/vi/'],
          topics: { developers: ['/api/**'] },
        }),
        starlightLinksValidator({
          // Install guides link to the reader's own instance on localhost.
          errorOnLocalLinks: false,
          // Anchors rendered by data components and the generated API pages are invisible to the validator;
          // scripts/content/check-links.ts checks them in dist/ after the build.
          exclude: ({ link }) => /^\/(vi\/)?api\//.test(link) || (link.includes('#') && COMPONENT_ANCHORS.test(link)),
        }),
        starlightImageZoom(),
        starlightLlmsTxt({
          projectName: 'ReputeCast',
          description:
            'Open-source, self-hosted newsletter and email platform that checks inbox placement before you send and guards sender reputation while it sends.',
        }),
      ],
    }),
    ...(isPreview ? [previewNoindex()] : []),
  ],
})
