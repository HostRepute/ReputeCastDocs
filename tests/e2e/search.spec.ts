import { expect, test } from '@playwright/test'

for (const [home, prefix] of [
  ['/', '/deliverability/'],
  ['/vi/', '/vi/deliverability/'],
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
