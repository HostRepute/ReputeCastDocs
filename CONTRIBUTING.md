# Contributing to ReputeCast Docs

This is the standard every page follows. Reviewers check pull requests against it; `pnpm check` and
`pnpm lint:prose` enforce the mechanical parts.

## Workflow

1. Run `pnpm dev` and open http://localhost:4321.
2. Verify what you describe against the upstream code (`../ReputeCast`) and the running demo (`make dev`, then
   `make seed`; sign in as `linh@acme.io` / `reputecast-demo`). When sources disagree, trust them in this order:
   code > UI message files (`web/src/**/messages.ts`, `messages.vi.ts`) > `docs/ROADMAP.md` "Done so far" notes >
   `docs/spec/*` > README, landing page and `docs/integrations/hub.md`.
3. List the upstream files the page documents in `sources` (repo-relative paths; directories and `{a,b}` braces
   are fine). `pnpm upstream:check` uses them to tell you which pages to review after upstream changes.
4. Before you open a pull request: `pnpm lint && pnpm check && pnpm lint:prose && pnpm build`.
5. Every English page has a Vietnamese page at the same path under `src/content/docs/vi/` (see
   [TRANSLATING.md](TRANSLATING.md)). CI fails when one is missing.

## Where pages live

Five sidebar topics, one directory per sidebar group, **no nested directories inside a group**. The topic and
group of a page come from its first path segment (`src/lib/topics.ts`). Order inside a group is
`sidebar: { order: N }`.

| Topic          | Directories                                                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guides         | `getting-started`, `providers`, `campaigns`, `audience`, `migrate`, `automations`, `transactional`, `forms`, `grow`, `earn`, `channels`, `integrations`, `team` |
| Deliverability | `deliverability`, `smtp-errors`                                                                                                                                 |
| Self-hosting   | `self-hosting`, `deploy` (one page per hosting platform)                                                                                                        |
| Developers     | `developers`, `adapters`, generated `api`                                                                                                                       |
| Reference      | `reference`                                                                                                                                                     |

Slugs are lowercase kebab-case English and never change after publishing. If a page must move, add a `301` to
`public/_redirects`.

## Frontmatter

```yaml
---
title: Connect Amazon SES # ≤ 60 characters, unique per locale, names the task or concept
description: Connect Amazon SES to ReputeCast … # 90–160 characters, unique per locale, contains primaryKeyword
type: how-to # tutorial | how-to | explanation | reference
audience: [admin] # publisher | admin | operator | developer
permissions: ['providers:manage'] # keys from src/data/permissions.yaml
uiPath: 'nav.providers' # UI label ids from src/data/ui-labels.yaml, joined by ' > '
primaryKeyword: Amazon SES newsletter
sources: [internal/providers/ses, internal/connect]
sidebar:
  order: 3
---
```

The title row under the heading shows the page type, audience, permissions (with a "sensitive" badge) and the
menu path, all from this frontmatter.

## Page types (Diátaxis)

**Tutorial** — learning by doing, start to finish.

1. Goal and time estimate in one sentence.
2. `## Before you begin`: prerequisites and permissions.
3. `<Steps>` with one `<Screenshot>` per screen change.
4. `## What you built`.
5. `## Next steps`: three `<LinkCard>`s.

**How-to guide** — one task for someone who knows what they want.

1. One-sentence outcome.
2. `## Before you begin`.
3. `<Steps>`.
4. `## Check that it worked`.
5. `## Troubleshooting`: a list of symptom → fix.
6. `## Related`.

**Explanation** — how something works and why.

1. What it is, in 2–3 sentences.
2. How it works: a diagram or an ordered list.
3. Defaults and limits: `<LimitsTable area="…" />`.
4. When to change them.
5. `## Related`.

**Reference** — facts to look up.

1. One-sentence scope.
2. The generated component or tables.
3. Notes. No narrative.

Headings are `##` and `###` only (the page title is the only `h1`).

## Voice

ReputeCast's voice (the Clearwater brand) is plain, specific and calm.

- Write in second person ("you") and US English.
- Lead with numbers, then the judgment: "Outlook complaints hit 0.18% (limit 0.10%)", not "complaints are high".
- Headings state the task or the fact in sentence case: "Connect Amazon SES", not "SES" or "Connecting SES".
- No exclamation marks. Never "oops", "simply", "just", "easy" or "easily".
- Use exact product and provider names: Amazon SES, Postmark, Microsoft Entra ID.
- Say plainly what is not supported ("ReputeCast does not support SAML") instead of hedging.
- Every feature is free. Never write Pro, Enterprise, premium, paywall or "upgrade to unlock".
- Never compare ReputeCast with other open-source projects. Migration guides are factual how-tos.
- The install story is PostgreSQL and the app. Redis appears only in the FAQ answer that says it is not needed.
- Link text describes the target ("set up SPF, DKIM and DMARC"), never "click here" or "this page".

## Terms

| Use                                               | Notes                                                                                                            |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| ReputeCast, HostRepute                            | One word, capital C / R.                                                                                         |
| Send Readiness                                    | Verdicts: Ready · Ready with warnings · Blocked. Check results: Pass · Warn · Block · Unknown.                   |
| guarded sending, auto-paused                      |                                                                                                                  |
| sending provider · mailbox provider               | Never "provider" alone when it could mean either. Amazon SES is a sending provider; Gmail is a mailbox provider. |
| Broadcasts · Automations · System · Transactional | The four streams.                                                                                                |
| contact                                           | What the UI says. Permission keys still read `subscribers:*`.                                                    |
| Owner, Admin, Editor, Viewer                      | Built-in roles, capitalized.                                                                                     |
| workspace, instance, instance admin               |                                                                                                                  |
| email, allowlist, blocklist                       | Not e-mail, whitelist, blacklist.                                                                                |

Link the first use of a product term on a page to the glossary: `[Send Readiness](/reference/glossary/#send-readiness)`.

## Components

Import Starlight's components from `@astrojs/starlight/components` and ours with the `~` alias:

```mdx
import { Aside, Steps, Tabs, TabItem, LinkCard, CardGrid } from '@astrojs/starlight/components'
import Screenshot from '~/components/Screenshot.astro'
import UiPath from '~/components/UiPath.astro'
```

| Component                                                                                                                                                                                                                                                    | Use for                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<Steps>`                                                                                                                                                                                                                                                    | Every procedure (an ordered Markdown list inside).                                                                                                                    |
| `<Tabs syncKey="…">` + `<TabItem>`                                                                                                                                                                                                                           | Alternatives the reader picks once: `syncKey="os"`, `"dns"`, `"proxy"`, `"idp"`, `"lang"`.                                                                            |
| `<Aside type="note">`                                                                                                                                                                                                                                        | Context. `tip` = a shortcut, `caution` = data loss or anything irreversible, `danger` = security.                                                                     |
| `<LinkCard>`, `<CardGrid>`                                                                                                                                                                                                                                   | Next steps and overviews.                                                                                                                                             |
| `<FileTree>`, `<Badge>`                                                                                                                                                                                                                                      | File layouts, short status words.                                                                                                                                     |
| Code fences                                                                                                                                                                                                                                                  | Every multi-line block has a title: ` ```yaml title="config.yaml" `. Shell commands use `sh`.                                                                         |
| `<kbd>`                                                                                                                                                                                                                                                      | Keys: `<kbd>⌘</kbd> <kbd>S</kbd>`.                                                                                                                                    |
| `<UiPath path="nav.settings > settings.keys" />`                                                                                                                                                                                                             | **Every** menu path or UI label in prose. Renders **Settings › Keys & MCP** (Vietnamese labels on Vietnamese pages). Add missing labels to `src/data/ui-labels.yaml`. |
| `<Screenshot id="…" alt="…">`                                                                                                                                                                                                                                | App screenshots (see below).                                                                                                                                          |
| `<TableScroll label="…">`                                                                                                                                                                                                                                    | Wrap any table with more than three columns.                                                                                                                          |
| `<LimitsTable area="…" />`, `<ProviderMatrix family="…" />`, `<PermissionsTable />`, `<RolesMatrix />`, `<WebhookEventsTable />`, `<McpReference />`, `<ErrorCodesTable />`, `<CliReference />`, `<ConfigReference />`, `<ShortcutsTable />`, `<Glossary />` | Reference facts. Never retype a value that lives in `src/data/*.yaml`; render it.                                                                                     |
| `<ArchitectureDiagram />`, `<SendFlowDiagram />`                                                                                                                                                                                                             | Diagrams (`~/components/diagrams/`). Follow each with a one-sentence text description.                                                                                |

## Screenshots

- Screenshots are captured automatically (`pnpm shots`); only ids in `scripts/screenshots/manifest.ts` exist.
  To add one, add a manifest entry and capture it. Never edit images by hand.
- At most 6 per page; one per meaningful screen change. Add a phone screenshot only where the phone layout differs
  (navigation, live monitor, composer).
- Markers: up to 5 numbered regions per screenshot, defined in the manifest, with a matching `<ol>` legend inside
  the component, one item per marker in marker order (`pnpm check` fails when the counts differ):

  ```mdx
  <Screenshot id="review-send" alt="Send Readiness shows Ready with warnings: 9 checks pass and one warns.">
    1. The verdict. 2. Check groups, worst result first.
  </Screenshot>
  ```

  Each number sits outside its box, on the first side with room (left, top, right, bottom), so it never hides what
  the box points at. When it lands on something the reader needs, set `badge` on that marker in the manifest.

- Check every marker against the captured image after `pnpm shots`: the box must surround exactly the thing its
  legend item names, in English and Vietnamese.
- `alt` is required. Describe what the screen shows and why it matters on this page, not "screenshot of".
- Vietnamese pages show the Vietnamese capture of a screenshot when one exists, else the English image with a note
  under it.

## SEO rules (checked by `pnpm check`)

- `title` ≤ 60 characters, unique per locale, contains the task or concept.
- `description` 90–160 characters, unique per locale, contains `primaryKeyword`.
- The first paragraph uses `primaryKeyword` naturally.
- At least three internal links to related pages; descriptive link text.
- Internal links are root-relative with a trailing slash: `/campaigns/send-readiness/`. On Vietnamese pages,
  prefix `/vi`: `/vi/campaigns/send-readiness/`.

## Facts

- Every behavior, default and label comes from upstream code or the running demo.
- External facts (Gmail, Yahoo and Microsoft sender rules, AWS limits, DNS host screens, RFCs, SMTP codes, MCP
  client syntax) cite the official source inline and say "Checked <Month YYYY>". Leave out what you cannot verify.
- Never invent SMTP codes, provider limits or UI labels.
