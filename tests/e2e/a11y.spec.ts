import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { allPages, builtDocsPages } from './pages.ts'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * Starlight's search button is named "Search" and shows the keyboard hint "⌘K" next to the word. axe counts the
 * hint as part of the visible label (label-content-name-mismatch), but a shortcut hint is not the control's label
 * (WCAG 2.5.3 Understanding: only the text that labels the control must be in the name); the hint is hidden from
 * assistive technology (src/middleware.ts) and exposed as aria-keyshortcuts instead.
 */
function isKnownFalsePositive(rule: string, target: string): boolean {
  return rule === 'label-content-name-mismatch' && target === 'button[data-open-modal=""]'
}

/**
 * Code blocks and tables that scroll sideways but can't take keyboard focus, once the web fonts are in. Expressive
 * Code makes an overflowing code block focusable after load and TableFocus does the same for tables, so callers poll.
 * A box that isn't rendered (a closed <details>, such as a webhook event's sample) reports a width it doesn't have and
 * is skipped. axe's scrollable-region-focusable ignores an overflow under 13 px; this counts any.
 */
async function unreachableScrollBoxes(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    await document.fonts.ready
    return [...document.querySelectorAll('.expressive-code pre, .sl-markdown-content table')]
      .filter((box) => box.checkVisibility() && box.scrollWidth > box.clientWidth && !box.hasAttribute('tabindex'))
      .map((box) => `${box.tagName.toLowerCase()}: ${box.textContent?.trim().slice(0, 40)}`)
  })
}

for (const theme of ['light', 'dark'] as const) {
  for (const width of [1440, 390]) {
    for (const path of allPages) {
      test(`axe ${theme} ${width}px: ${path}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.addInitScript((t) => localStorage.setItem('starlight-theme', t), theme)
        await page.goto(path)
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        await expect.poll(() => unreachableScrollBoxes(page)).toEqual([])
        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
        const summary = results.violations
          .map((v) => ({ ...v, nodes: v.nodes.filter((n) => !isKnownFalsePositive(v.id, n.target.join(' '))) }))
          .filter((v) => v.nodes.length > 0)
          .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
        expect(summary).toEqual([])
      })
    }
  }
}

// Translations run longer than English, so a table that fits in one language can overflow in another. At the
// narrowest width the site supports, every docs page in every locale must let a keyboard reach what scrolls.
for (const path of builtDocsPages) {
  test(`scrolling regions reachable by keyboard at 320px: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 })
    await page.goto(path)
    await expect.poll(() => unreachableScrollBoxes(page)).toEqual([])
    const results = await new AxeBuilder({ page }).withRules(['scrollable-region-focusable']).analyze()
    expect(results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' ')))).toEqual([])
  })
}

test('the skip link is the first tab stop and moves focus to main', async ({ page }) => {
  await page.goto('/campaigns/send-readiness/')
  await page.keyboard.press('Tab')
  const skip = page.locator(':focus')
  await expect(skip).toHaveAttribute('href', '#_top')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#_top$/)
  const focusedInMain = await page.evaluate(() => Boolean(document.activeElement?.closest('main')))
  expect(focusedInMain).toBe(true)
})
