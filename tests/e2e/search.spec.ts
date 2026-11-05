import { expect, test } from '@playwright/test'
import { PREFIXED_LOCALES } from '../../src/lib/locales.ts'

for (const [home, prefix] of [
  ['/', '/deliverability/'],
  ...PREFIXED_LOCALES.map((l) => [`/${l}/`, `/${l}/deliverability/`] as const),
] as const) {
  test(`search finds the DMARC pages from ${home}`, async ({ page }) => {
    await page.goto(home)
    await page.locator('site-search button[data-open-modal]').first().click()
    await page.locator('#starlight__search input').fill('DMARC')
    const first = page.locator('#starlight__search .pagefind-ui__result-link').first()
    await expect(first).toBeVisible({ timeout: 15_000 })
    const href = await first.getAttribute('href')
    expect(href).toContain(prefix)
    expect(href).toContain('dmarc')
  })
}
