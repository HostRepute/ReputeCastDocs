# ReputeCast Docs

[![CI](https://github.com/hostrepute/reputecastdocs/actions/workflows/ci.yml/badge.svg)](https://github.com/hostrepute/reputecastdocs/actions/workflows/ci.yml)
[![Code: MIT](https://img.shields.io/badge/code-MIT-0F766E)](LICENSE)
[![Docs: CC BY 4.0](https://img.shields.io/badge/docs-CC%20BY%204.0-0F766E)](LICENSE-docs)

Source of [docs.reputecast.com](https://docs.reputecast.com): the documentation for
[ReputeCast](https://github.com/hostrepute/reputecast), the open-source (AGPL-3.0), self-hosted newsletter and email
platform by [HostRepute](https://hostrepute.com).

The site is built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build). Pages are MDX in
English (root URLs) and Vietnamese (`/vi/`); the REST API reference is generated from the upstream OpenAPI spec.

## Prerequisites

- Node 24.21.0 (`.nvmrc`) and pnpm 12.11.0 (`corepack enable` picks it up from `packageManager`).
- [Vale](https://vale.sh) for prose linting (`brew install vale`).
- For upstream sync, drift checks and screenshots: a checkout of `hostrepute/reputecast` at `../ReputeCast` (override
  with `REPUTECAST_SRC`), Go, Docker and Google Chrome.

## Commands

| Command               | What it does                                                                      |
| --------------------- | --------------------------------------------------------------------------------- |
| `pnpm dev`            | Local dev server at http://localhost:4321                                         |
| `pnpm build`          | Static build into `dist/` (also validates every internal link)                    |
| `pnpm preview`        | Serve `dist/`                                                                     |
| `pnpm check`          | Type check plus the content check (`scripts/content/check.ts`)                    |
| `pnpm lint`           | ESLint and Prettier                                                               |
| `pnpm lint:prose`     | Vale on the English pages                                                         |
| `pnpm test`           | Unit tests (Vitest)                                                               |
| `pnpm test:e2e`       | SEO, accessibility, responsive and search tests against `pnpm preview`            |
| `pnpm lhci`           | Lighthouse CI on `dist/`                                                          |
| `pnpm openapi:sync`   | Regenerate `src/data/openapi/reputecast.json` from the upstream spec              |
| `pnpm upstream:check` | Compare the data catalogs, UI labels, OpenAPI hash and page sources with upstream |
| `pnpm shots`          | Capture app screenshots from the upstream demo                                    |

## How the site stays true to the product

- **Data catalogs** (`src/data/*.yaml`) hold reference facts once: CLI commands, configuration keys, permissions, roles,
  webhook events, MCP tools, API error codes, limits, providers, glossary and UI labels. Components in
  `src/components/` render them in both languages. `pnpm upstream:check` diffs their ids against the upstream code and
  fails when something was added or removed; it also lists pages whose `sources` changed upstream since the commit in
  `src/data/upstream.json` (`--update-commit` records a new one after review).
- **API reference**: `pnpm openapi:sync` reads `web/openapi.json` from upstream, keeps only the operations callable with
  API keys, humanizes summaries, adds permission lines and merges samples from `src/data/api-samples/`.
- **Screenshots**: `pnpm shots` drives the upstream dev build (`make dev` in `../ReputeCast`) with Playwright, reseeds
  the demo data, signs in as the demo users and writes `src/assets/screenshots/<locale>/<id>.webp` for every entry in
  `scripts/screenshots/manifest.ts`, plus `<id>.json` with the numbered markers' boxes. Use `--only id,id`,
  `--locale en|vi`, `--no-reseed`. The dev database is left reseeded with the Acme demo when the run ends; to keep
  yours, run a second upstream stack on other ports and point the run at it with `REPUTECAST_SRC`, `PG_PORT` and
  `--app`.

## Deployment

CI (`.github/workflows/ci.yml`) builds once, runs every gate (lint, content check, Vale, unit tests, build with link
validation, built-site link check, Playwright SEO/accessibility/responsive/search tests, Lighthouse CI) and deploys
the same `dist/` artifact to Cloudflare Pages with Wrangler (Direct Upload). Pushes to `main` deploy production;
pull-request branches deploy previews built with `DOCS_PREVIEW=1`, which adds `X-Robots-Tag: noindex` to every
response. `.github/workflows/upstream-drift.yml` runs `pnpm upstream:check` against `hostrepute/reputecast` every
Monday.

One-time setup by the owner:

1. Cloudflare: create the Pages project `reputecast-docs` with **Direct Upload**, add the custom domain
   `docs.reputecast.com` (CNAME in the `reputecast.com` zone) and an API token with "Cloudflare Pages: Edit".
2. GitHub: add the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
3. Search engines: verify the domain in Google Search Console and Bing Webmaster Tools with DNS TXT records and
   submit `https://docs.reputecast.com/sitemap-index.xml`.

## Contributing

Fixes and new pages are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) (page types, voice, components, SEO rules)
and, for Vietnamese, [TRANSLATING.md](TRANSLATING.md). Everyone taking part follows the
[code of conduct](CODE_OF_CONDUCT.md). For help, see [SUPPORT.md](SUPPORT.md); report security problems as
[SECURITY.md](SECURITY.md) describes.

## Dependencies

All versions are pinned exactly. pnpm 12 replaced `onlyBuiltDependencies` with `allowBuilds` (see
`pnpm-workspace.yaml`); releases newer than pnpm's minimum release age are listed in `minimumReleaseAgeExclude`.

## Licenses

- Code (configuration, components, styles, scripts): [MIT](LICENSE).
- Documentation content and screenshots (`src/content/**`, `src/assets/screenshots/**`):
  [CC BY 4.0](LICENSE-docs).
- IBM Plex fonts used for social images: SIL Open Font License 1.1 (`src/assets/og/OFL.txt`).
