# Translating ReputeCast Docs (Tiếng Việt)

Every English page `src/content/docs/<path>.mdx` has a Vietnamese page at `src/content/docs/vi/<path>.mdx`.
`pnpm check` runs with `--strict-i18n` and fails when either side is missing.

## What a Vietnamese page is

- A full translation written for Vietnamese readers, not a word-for-word copy. Same structure, same headings
  order, same components, same screenshot ids.
- Same frontmatter values for `type`, `audience`, `permissions`, `uiPath`, `sources` and `sidebar.order`.
- Translated `title` (≤ 60 characters) and `description` (90–160 characters).
- Its own `primaryKeyword`: what Vietnamese readers actually search, e.g. "cấu hình SPF DKIM DMARC",
  "gửi newsletter bằng Amazon SES", "phần mềm email marketing tự host", "tỷ lệ bounce email". Keep English
  technical terms people search in English (SPF, DKIM, DMARC, SMTP, API, webhook, MCP).
- Internal links point to the Vietnamese page: `/vi/campaigns/send-readiness/`. Anchors stay the same.

## Terms

Upstream `docs/i18n/glossary-vi.md` is binding for every product term: navigation labels, statuses, Send
Readiness verdicts ("Sẵn sàng · Sẵn sàng, có cảnh báo · Bị chặn"), roles ("Chủ sở hữu, Quản trị viên, Biên tập
viên, Người xem"), "không gian làm việc" for workspace, "nhà cung cấp gửi thư" for sending provider, "danh sách
chặn gửi" for the suppression list.

- Address the reader as **bạn**. Sentence case. No exclamation marks.
- UI labels in prose come only from `<UiPath>`; it shows the label from upstream `messages.vi.ts` and falls back
  to the English label where the app has no Vietnamese yet, so the docs always match the screen.
- Never translate: product and provider names, permission keys, API error codes, environment variables,
  configuration keys, CLI commands and output, DNS record names and values, HTTP headers, code.

Docs-only terms (not in the app glossary):

| English                          | Tiếng Việt             |
| -------------------------------- | ---------------------- |
| Documentation                    | Tài liệu               |
| Guides                           | Hướng dẫn              |
| Quickstart                       | Bắt đầu nhanh          |
| Tutorial                         | Hướng dẫn từng bước    |
| How-to guide                     | Hướng dẫn thao tác     |
| Explanation                      | Giải thích             |
| Reference                        | Tham chiếu             |
| Self-hosting                     | Tự triển khai          |
| Troubleshooting                  | Khắc phục sự cố        |
| Prerequisites / Before you begin | Trước khi bắt đầu      |
| Check that it worked             | Kiểm tra kết quả       |
| Related                          | Liên quan              |
| What you built                   | Bạn đã làm được gì     |
| Next steps                       | Bước tiếp theo         |
| Defaults and limits              | Mặc định và giới hạn   |
| Server operators                 | Người vận hành máy chủ |
| Developers                       | Nhà phát triển         |

## Data catalogs

`src/data/*.yaml` text fields are `{ en, vi }`. Fill `vi` with the upstream Vietnamese wording where it exists
(`web/src/**/messages.vi.ts`, `internal/*/messages/vi.json`); components fall back to English when `vi` is empty.

## Screenshots

`pnpm shots --locale vi` captures the Vietnamese app. Screens whose upstream feature has no Vietnamese messages
yet are English-only (see `scripts/screenshots/manifest.ts`); Vietnamese pages show the English image with the
note "Ảnh chụp này hiển thị giao diện tiếng Anh." `pnpm upstream:check` reports when a screen can be recaptured.

## Review

The Vietnamese edition is reviewed by a native speaker (the project owner) before launch.

| Reviewer                 | Date | Scope                                                           |
| ------------------------ | ---- | --------------------------------------------------------------- |
| _pending: project owner_ | —    | all 170 Vietnamese pages and the `vi` text in `src/data/*.yaml` |
