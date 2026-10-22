import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { allPages } from './pages.ts'

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

for (const theme of ['light', 'dark'] as const) {
  for (const width of [1440, 390]) {
    for (const path of allPages) {
      test(`axe ${theme} ${width}px: ${path}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.addInitScript((t) => localStorage.setItem('starlight-theme', t), theme)
        await page.goto(path)
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        // Expressive Code makes overflowing code blocks focusable from an idle callback after load.
        await page.waitForFunction(() =>
          [...document.querySelectorAll('.expressive-code pre')].every(
            (pre) => pre.scrollWidth <= pre.clientWidth || pre.hasAttribute('tabindex'),
          ),
        )
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
