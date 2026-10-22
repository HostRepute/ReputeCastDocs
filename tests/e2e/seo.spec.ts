import { expect, test } from '@playwright/test'
import { allPages, apiPages, localPath, SITE } from './pages.ts'

type JsonLd = { '@graph': { '@type': string }[] }

for (const path of allPages) {
  test(`SEO head: ${path}`, async ({ page, request }) => {
    await page.goto(path)
    const isApi = apiPages.includes(path)
    const lang = path.startsWith('/vi/') ? 'vi' : 'en'

    await expect(page.locator('h1')).toHaveCount(1)
    const h1 = (await page.locator('h1').innerText()).trim()
    await expect(page).toHaveTitle(`${h1} · ReputeCast Docs`)
    await expect(page.locator('html')).toHaveAttribute('lang', lang)

    const description = await page.locator('meta[name="description"]').getAttribute('content')
    expect(description?.length ?? 0).toBeGreaterThan(40)

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBe(`${SITE}${path}`)

    const alternates = await page
      .locator('link[rel="alternate"][hreflang]')
      .evaluateAll((links) => links.map((l) => l.getAttribute('hreflang')))
    if (isApi) expect(alternates).toEqual([])
    else expect(alternates.sort()).toEqual(['en', 'vi', 'x-default'])

    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content')
    expect(ogImage).toMatch(new RegExp(`^${SITE}/og/.+\\.png$`))
    const image = await request.get(localPath(ogImage!))
    expect(image.status()).toBe(200)
    expect(image.headers()['content-type']).toContain('image/png')

    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(
      (s) => JSON.parse(s) as JsonLd,
    )
    const types = ld.flatMap((doc) => doc['@graph'].map((node) => node['@type']))
    if (path === '/' || path === '/vi/')
      expect(types).toEqual(expect.arrayContaining(['WebSite', 'SoftwareApplication']))
    else expect(types).toEqual(expect.arrayContaining(['TechArticle', 'BreadcrumbList']))
  })
}

test('sitemap lists both languages', async ({ request }) => {
  const index = await (await request.get('/sitemap-index.xml')).text()
  const sitemaps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => localPath(m[1]))
  expect(sitemaps.length).toBeGreaterThan(0)
  const urls = (await Promise.all(sitemaps.map(async (s) => (await request.get(s)).text()))).flatMap((xml) =>
    [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]),
  )
  expect(urls).toContain(`${SITE}/`)
  expect(urls).toContain(`${SITE}/vi/`)
  expect(urls).toContain(`${SITE}/deliverability/spf-dkim-dmarc/`)
  expect(urls).toContain(`${SITE}/vi/deliverability/spf-dkim-dmarc/`)
})

test('robots.txt names the sitemap', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toContain(`Sitemap: ${SITE}/sitemap-index.xml`)
})

test('llms.txt files exist and list no Vietnamese pages', async ({ request }) => {
  for (const file of ['/llms.txt', '/llms-full.txt']) {
    const res = await request.get(file)
    expect(res.status()).toBe(200)
    const text = await res.text()
    expect(text).not.toContain(`${SITE}/vi/`)
  }
})
