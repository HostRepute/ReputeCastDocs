import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { allPages } from './pages.ts'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

for (const theme of ['light', 'dark'] as const) {
  for (const width of [1440, 390]) {
    for (const path of allPages) {
      test(`axe ${theme} ${width}px: ${path}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.addInitScript((t) => localStorage.setItem('starlight-theme', t), theme)
        await page.goto(path)
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
        const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
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
