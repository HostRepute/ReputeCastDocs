# Translating ReputeCast Docs

Every English page `src/content/docs/<path>.mdx` has a translation in each docs locale at
`src/content/docs/<code>/<path>.mdx`: German (`de`), Spanish (`es`), French (`fr`) and Vietnamese (`vi`), the languages
the app itself speaks. `pnpm check` runs with `--strict-i18n` and fails when a page is missing in any locale.

## What a translated page is

- A full translation written for readers of that language, not a word-for-word copy. Same structure, same headings
  order, same components, same screenshot ids, same legend items.
- A table your translation makes too wide for a 320 px phone gets `<TableScroll label="…" wrap>`, on the English page
  and every translation too, so the pages keep the same components. Translate the `label`.
- Same frontmatter values for `type`, `audience`, `permissions`, `uiPath`, `sources` and `sidebar.order`.
- Translated `title` (≤ 60 characters) and `description` (90–160 characters), both unique in the locale.
- Its own `primaryKeyword`: what readers of that language actually search, e.g. "SPF DKIM DMARC einrichten",
  "newsletter con Amazon SES", "logiciel newsletter auto-hébergé", "cấu hình SPF DKIM DMARC". Keep English technical
  terms people search in English (SPF, DKIM, DMARC, SMTP, API, webhook, MCP). The description contains it and the first
  paragraph uses it naturally.
- Internal links point to the same locale: `/de/campaigns/send-readiness/`. The API reference (`/api/…`) is English
  only and keeps its English path. An anchor is the slug of the target page's heading in that language; glossary and
  reference anchors (`/de/reference/glossary/#send-readiness`) stay the same in every locale.

## Terms

The upstream glossary of each language is binding for every product term: navigation labels, statuses, Send
Readiness verdicts, roles, streams, "sending provider", "suppression list":
[`docs/i18n/glossary-de.md`](https://github.com/hostrepute/reputecast/blob/main/docs/i18n/glossary-de.md),
[`glossary-es.md`](https://github.com/hostrepute/reputecast/blob/main/docs/i18n/glossary-es.md),
[`glossary-fr.md`](https://github.com/hostrepute/reputecast/blob/main/docs/i18n/glossary-fr.md) and
[`glossary-vi.md`](https://github.com/hostrepute/reputecast/blob/main/docs/i18n/glossary-vi.md).

| Language   | Address the reader               | Typography                                                                                    |
| ---------- | -------------------------------- | --------------------------------------------------------------------------------------------- |
| Deutsch    | **Sie** (Ihr, Ihnen), never "du" | „…“ quotation marks; nouns keep their capital; "ß" as in Germany                              |
| Español    | **tú**, never "usted"            | No "¡"; questions keep both marks ("¿…?")                                                     |
| Français   | **vous**, never "tu"             | « … » with U+00A0 inside; U+00A0 before `:`, U+202F before `;` `!` `?`; apostrophe ’ (U+2019) |
| Tiếng Việt | **bạn**                          | Sentence case                                                                                 |

- Sentence case. No exclamation marks.
- UI labels in prose come only from `<UiPath>`; it shows the label from upstream's `messages.<code>.ts` or
  `messages/<code>.json`, so the docs always match the screen. It falls back to the English label only for an id
  without that locale's text.
- Never translate: product and provider names, permission keys, API error codes, environment variables,
  configuration keys, CLI commands and output, DNS record names and values, HTTP headers, code.

Docs-only terms (not in the app glossaries):

| English                          | Deutsch                        | Español                           | Français                      | Tiếng Việt             |
| -------------------------------- | ------------------------------ | --------------------------------- | ----------------------------- | ---------------------- |
| Documentation                    | Dokumentation                  | Documentación                     | Documentation                 | Tài liệu               |
| Guides                           | Anleitungen                    | Guías                             | Guides                        | Hướng dẫn              |
| Quickstart                       | Schnellstart                   | Inicio rápido                     | Démarrage rapide              | Bắt đầu nhanh          |
| Tutorial                         | Tutorial                       | Tutorial                          | Tutoriel                      | Hướng dẫn từng bước    |
| How-to guide                     | Anleitung                      | Guía práctica                     | Guide pratique                | Hướng dẫn thao tác     |
| Explanation                      | Erklärung                      | Explicación                       | Explication                   | Giải thích             |
| Reference                        | Referenz                       | Referencia                        | Référence                     | Tham chiếu             |
| Self-hosting                     | Selbst hosten                  | Autoalojamiento                   | Auto-hébergement              | Tự triển khai          |
| Troubleshooting                  | Fehlerbehebung                 | Solución de problemas             | Dépannage                     | Khắc phục sự cố        |
| Prerequisites / Before you begin | Bevor Sie beginnen             | Antes de empezar                  | Avant de commencer            | Trước khi bắt đầu      |
| Check that it worked             | Prüfen, ob es funktioniert hat | Comprobar que funciona            | Vérifier le résultat          | Kiểm tra kết quả       |
| Related                          | Verwandte Themen               | Relacionado                       | Voir aussi                    | Liên quan              |
| What you built                   | Was Sie erstellt haben         | Lo que has creado                 | Ce que vous avez créé         | Bạn đã làm được gì     |
| Next steps                       | Nächste Schritte               | Próximos pasos                    | Étapes suivantes              | Bước tiếp theo         |
| Defaults and limits              | Standardwerte und Grenzen      | Valores predeterminados y límites | Valeurs par défaut et limites | Mặc định và giới hạn   |
| When to change them              | Wann Sie sie ändern sollten    | Cuándo cambiarlos                 | Quand les modifier            | Khi nào nên thay đổi   |
| Server operators                 | Serverbetreiber                | Operadores del servidor           | Exploitants du serveur        | Người vận hành máy chủ |
| Developers                       | Entwickler                     | Desarrolladores                   | Développeurs                  | Nhà phát triển         |

## Data catalogs

`src/data/*.yaml` text fields are `{ en, de, es, fr, vi }`. Fill each language with the upstream wording where it exists
(`web/src/**/messages.<code>.ts`, `internal/*/messages/<code>.json`); components fall back to English when a language
is missing. The built-in strings of the docs' own components live in `src/content/i18n/<code>.json`.

## Screenshots

`pnpm shots --locale de,es,fr` captures the German, Spanish and French app (`--locale vi` the Vietnamese one). Upstream
has every screen in all five languages (`COMPLETE_LANGUAGES` in `web/src/i18n/status.gen.ts`). Public pages show the
newsletter's own content and are captured in English only; a translated page then shows the English image with a note
in its language.

## Review

Each translation is reviewed by a native speaker before it is final.

| Reviewer                 | Date | Scope                                                                        |
| ------------------------ | ---- | ---------------------------------------------------------------------------- |
| _pending: project owner_ | —    | Vietnamese: all 184 pages and the `vi` text in `src/data/*.yaml`             |
| _pending_                | —    | German, Spanish and French: all 184 pages each and their text in `src/data/` |
