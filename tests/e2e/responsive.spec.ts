import { expect, test } from '@playwright/test'
import { allPages } from './pages.ts'

for (const width of [320, 390, 834, 1440]) {
  for (const path of allPages) {
    test(`no page-level horizontal scroll at ${width}px: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(path)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
}

test('the mobile menu opens and shows the topic switcher', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/campaigns/send-readiness/')
  await page.getByRole('button', { name: 'Menu' }).click()
  const sidebar = page.locator('#starlight__sidebar')
  for (const topic of ['Guides', 'Deliverability', 'Self-hosting', 'Developers', 'Reference']) {
    await expect(sidebar.getByRole('link', { name: topic, exact: true })).toBeVisible()
  }
})
