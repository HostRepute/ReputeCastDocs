// Preview builds (DOCS_PREVIEW=1): tell crawlers not to index any response.
import { appendFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { AstroIntegration } from 'astro'

export default function previewNoindex(): AstroIntegration {
  return {
    name: 'reputecast:preview-noindex',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        await appendFile(fileURLToPath(new URL('_headers', dir)), '\n/*\n  X-Robots-Tag: noindex\n')
        logger.info('Preview build: added X-Robots-Tag: noindex to _headers')
      },
    },
  }
}
