/**
 * Captures the docs screenshots from the upstream ReputeCast demo (scripts/screenshots/manifest.ts).
 *
 *   pnpm shots                                   # every shot, English and Vietnamese
 *   pnpm shots --only review-send,live-monitor   # some shots
 *   pnpm shots --locale vi --no-reseed           # Vietnamese only, on the current Acme database
 *
 * Options
 *   --only <id,id>          shot ids (default: all)
 *   --locale en|vi          one locale (default: both; English-only shots skip vi)
 *   --app <url>             web app origin (default $SHOT_APP, else http://localhost:5173)
 *   --no-reseed             keep the current Acme database for the Acme shots
 *   --channel chrome|bundled  installed Google Chrome (default) or Playwright's Chromium
 *
 * Environment: REPUTECAST_SRC (default ../ReputeCast), PG_PORT (default: the checkout's .env, else 5432).
 * Needs upstream `make dev` running (the Vite dev build: release builds offer English only). The run recreates
 * the dev database for each sample and leaves it re-seeded with Acme.
 *
 * Writes src/assets/screenshots/<locale>/<id>.webp, plus <id>.json with the marker boxes in percent.
 *
 * Re-implements hostrepute/reputecast web/scripts/shot.ts and the sign-in and path resolution of
 * web/scripts/lib/demo-auth.ts, web/scripts/a11y.ts and web/scripts/qa.ts (same copyright holder).
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { parseArgs } from 'node:util'
import {
  chromium,
  errors,
  request,
  type APIRequestContext,
  type Browser,
  type BrowserContextOptions,
  type Page,
} from '@playwright/test'
import sharp from 'sharp'
import { setLanguage, signIn } from './lib/auth.ts'
import { toMarker, type Box, type MarkerFile } from './lib/markers.ts'
import { resolvePath } from './lib/resolve.ts'
import {
  buildCli,
  parseTempPassword,
  recreateDatabase,
  reputecast,
  upstreamFromEnv,
  waitForApi,
  type Upstream,
} from './lib/upstream.ts'
import { shots, type Shot } from './manifest.ts'

type Locale = 'en' | 'vi'
type User = NonNullable<Shot['user']>
type Result = { id: string; locale: Locale; result: 'captured' | 'failed' | 'skipped'; kb?: number; note?: string }
type Prefs = { language: string; regionFormat: string; hourCycle: string; weekStart: string }
/** GET /api/v1/me, the part this script reads. */
type Me = { user: { preferences: Prefs } }
type Session = {
  api: APIRequestContext
  storage: BrowserContextOptions['storageState']
  prefs?: Prefs
  language?: Locale
}

const root = resolve(import.meta.dirname, '../..')
const outDir = resolve(root, 'src/assets/screenshots')
const WARN_BYTES = 400 * 1024
const OWNER = { email: 'owner@example.com', name: 'Alex Morgan' }
const emails: Record<Exclude<User, 'anon'>, string> = {
  linh: 'linh@acme.io',
  aisha: 'aisha@acme.io',
  tomas: 'tomas@northwind.studio',
  owner: OWNER.email,
}
const viewports = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  tablet: { width: 834, height: 1112, deviceScaleFactor: 1 },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2 },
}

const { values: opts } = parseArgs({
  options: {
    only: { type: 'string' },
    locale: { type: 'string' },
    app: { type: 'string' },
    'no-reseed': { type: 'boolean', default: false },
    channel: { type: 'string', default: 'chrome' },
  },
})
const app = (opts.app ?? process.env.SHOT_APP ?? 'http://localhost:5173').replace(/\/+$/, '')
const runLocales: Locale[] = opts.locale ? [opts.locale as Locale] : ['en', 'vi']
const only = new Set((opts.only ?? '').split(',').filter(Boolean))

function usage(message: string): never {
  console.error(message)
  process.exit(2)
}
if (!runLocales.every((l) => l === 'en' || l === 'vi')) usage(`--locale must be en or vi, not ${opts.locale}`)
if (opts.channel !== 'chrome' && opts.channel !== 'bundled') usage(`--channel must be chrome or bundled`)
const unknown = [...only].filter((id) => !shots.some((s) => s.id === id))
if (unknown.length) usage(`unknown shot ids: ${unknown.join(', ')}`)

const selected = shots.filter((s) => only.size === 0 || only.has(s.id))
const results: Result[] = []
let browser: Browser
let sessions = new Map<User, Session>()
let ownerPassword = ''

/** Signs `user` in once per database (sign-in is limited to 30 per minute per IP) and keeps the cookies. */
async function session(user: User): Promise<Session | undefined> {
  if (user === 'anon') return undefined
  const known = sessions.get(user)
  if (known) return known
  const api = await request.newContext()
  await signIn(api, app, emails[user], user === 'owner' ? ownerPassword : undefined)
  const me = await api.get(`${app}/api/v1/me`)
  const body: Me | undefined = me.ok() ? await me.json() : undefined
  const s: Session = { api, storage: await api.storageState(), prefs: body?.user.preferences }
  sessions.set(user, s)
  return s
}

/** Puts every signed-in member's language back as it was, and forgets the sessions (before a new database). */
async function endSessions(): Promise<void> {
  for (const s of sessions.values()) {
    if (s.prefs && s.language) await s.api.put(`${app}/api/v1/me/language`, { data: s.prefs }).catch(() => undefined)
    await s.api.dispose()
  }
  sessions = new Map()
}

async function goto(page: Page, url: string): Promise<void> {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15_000 })
  } catch (err) {
    // Pages with a live stream (SSE) never go idle.
    if (!(err instanceof errors.TimeoutError)) throw err
    await page.waitForLoadState('load')
  }
}

async function runStep(page: Page, step: NonNullable<Shot['before']>[number]): Promise<void> {
  if ('click' in step) await page.locator(step.click).first().click()
  else if ('hover' in step) await page.locator(step.hover).first().hover()
  else if ('press' in step) await page.keyboard.press(step.press)
  else if ('fill' in step) await page.locator(step.fill[0]).first().fill(step.fill[1])
  else await page.waitForTimeout(step.wait)
}

/** Captures one shot in one locale; returns the WebP size in bytes. Throws with the reason on failure. */
async function capture(s: Shot, locale: Locale): Promise<number> {
  const user = s.user ?? 'linh'
  const auth = await session(user)
  if (auth && auth.language !== locale) {
    await setLanguage(auth.api, app, locale)
    auth.language = locale
  }
  const vp = viewports[s.viewport ?? 'desktop']
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: s.clip ? 2 : vp.deviceScaleFactor,
    reducedMotion: 'reduce',
    colorScheme: 'light',
    // The browser stays en-US so the "Your browser prefers Tiếng Việt" suggestion never shows.
    locale: 'en-US',
    timezoneId: 'America/New_York',
    storageState: auth?.storage,
  })
  try {
    // Visitors (sign-in) pick their language in the card's menu, stored as JSON in rc.language.
    if (!auth) await ctx.addInitScript(`localStorage.setItem('rc.language', ${JSON.stringify(JSON.stringify(locale))})`)
    const path = await resolvePath(ctx.request, app, s.path)
    const page = await ctx.newPage()
    let rateLimited = false
    page.on('response', (r) => {
      if (r.status() === 429) rateLimited = true
    })
    await goto(page, app + path)
    await page.evaluate('document.fonts.ready')
    if (s.waitFor) await page.locator(s.waitFor).first().waitFor({ state: 'visible', timeout: 15_000 })
    for (const step of s.before ?? []) await runStep(page, step)
    await page.waitForTimeout(400)
    if (rateLimited) throw new RateLimited()
    const landed = new URL(page.url()).pathname
    if (landed.startsWith('/sign-in') && !s.path.startsWith('/sign-in')) throw new Error('redirected to /sign-in')
    if (await page.locator('vite-error-overlay').count()) throw new Error('the Vite error overlay is showing')

    // Deep links that select a block (?select=2) scroll the window; page captures start at the top.
    if (!s.clip) await page.evaluate('window.scrollTo(0, 0)')
    let area: Box = { x: 0, y: 0, width: vp.width, height: vp.height }
    const clip = s.clip ? page.locator(s.clip).first() : undefined
    if (clip) {
      await clip.scrollIntoViewIfNeeded()
      const box = await clip.boundingBox()
      if (!box) throw new Error(`clip ${s.clip} is not visible`)
      area = box
    } else if (s.fullPage) {
      const [x, y, width, height] = (await page.evaluate(
        '[scrollX, scrollY, document.documentElement.scrollWidth, document.documentElement.scrollHeight]',
      )) as number[]
      area = { x: -x!, y: -y!, width: width!, height: height! }
    }
    const markers = []
    for (const m of s.markers ?? []) {
      const box = await page.locator(m.selector).first().boundingBox()
      if (!box) throw new Error(`marker ${m.n} (${m.selector}) is not visible`)
      markers.push(toMarker(m.n, box, area))
    }
    const shotOptions = {
      animations: 'disabled' as const,
      caret: 'hide' as const,
      mask: s.mask?.map((sel) => page.locator(sel)),
      maskColor: '#e5e7eb',
    }
    const png = clip
      ? await clip.screenshot(shotOptions)
      : await page.screenshot({ ...shotOptions, fullPage: s.fullPage })
    const image = sharp(png)
    const { width, height } = await image.metadata()
    const webp = await image.webp({ quality: 88, effort: 6 }).toBuffer()

    const dir = resolve(outDir, locale)
    mkdirSync(dir, { recursive: true })
    writeFileSync(resolve(dir, `${s.id}.webp`), webp)
    const json = resolve(dir, `${s.id}.json`)
    if (markers.length) {
      const file: MarkerFile = { width: width!, height: height!, markers }
      writeFileSync(json, `${JSON.stringify(file, null, 2)}\n`)
    } else if (existsSync(json)) rmSync(json)
    return webp.length
  } finally {
    await ctx.close()
  }
}

class RateLimited extends Error {
  constructor() {
    super('the API answered 429 (rate limited)')
  }
}

/** Captures `list` locale by locale (one language change per member and locale), retrying after a 429. */
async function captureAll(list: Shot[]): Promise<void> {
  for (const locale of runLocales) {
    for (const s of list) {
      if (!(s.locales ?? ['en', 'vi']).includes(locale)) {
        results.push({ id: s.id, locale, result: 'skipped', note: 'English only (no Vietnamese UI upstream)' })
        continue
      }
      for (let attempt = 1; ; attempt++) {
        try {
          const bytes = await capture(s, locale)
          const kb = Math.round(bytes / 1024)
          const note = bytes > WARN_BYTES ? 'over 400 KB' : undefined
          if (note) console.warn(`warning: ${locale}/${s.id}.webp is ${kb} KB (over 400 KB)`)
          results.push({ id: s.id, locale, result: 'captured', kb, note })
          console.log(`  ✓ ${locale}/${s.id} (${kb} KB)`)
          break
        } catch (err) {
          if (err instanceof RateLimited && attempt < 3) {
            console.log(`  … ${locale}/${s.id}: rate limited, waiting a minute`)
            await sleep(61_000)
            continue
          }
          const note = (err as Error).message.split('\n')[0]
          results.push({ id: s.id, locale, result: 'failed', note })
          console.log(`  ✗ ${locale}/${s.id}: ${note}`)
          break
        }
      }
    }
  }
  await endSessions()
}

async function seed(u: Upstream, args: string[]): Promise<void> {
  await endSessions()
  await recreateDatabase(u)
  await reputecast(u, ['seed', ...args])
  await waitForApi(app)
}

function printSummary(): void {
  const rows = results.map((r) => [r.id, r.locale, r.result, r.kb === undefined ? '' : `${r.kb} KB`, r.note ?? ''])
  const head = ['id', 'locale', 'result', 'size', 'note']
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]!.length)))
  const line = (cells: string[]) =>
    cells
      .map((c, i) => c.padEnd(widths[i]!))
      .join('  ')
      .trimEnd()
  console.log(`\n${line(head)}\n${widths.map((w) => '-'.repeat(w)).join('  ')}`)
  for (const r of rows) console.log(line(r))
  const count = (k: Result['result']) => results.filter((r) => r.result === k).length
  console.log(`\n${count('captured')} captured, ${count('failed')} failed, ${count('skipped')} skipped`)
}

async function main(): Promise<void> {
  const u = upstreamFromEnv(resolve(root, '.shots-tmp'), app)
  const fresh = selected.filter((s) => s.sample === 'fresh')
  const acme = selected.filter((s) => (s.sample ?? 'acme') === 'acme' && !s.demoSend)
  const demo = selected.filter((s) => (s.sample ?? 'acme') === 'acme' && s.demoSend)
  const northwind = selected.filter((s) => s.sample === 'northwind')
  // The developer's database is Acme until the run replaces it.
  let database: 'dev' | 'acme' | 'changed' = 'dev'

  console.log(`Building the ReputeCast CLI from ${u.src} …`)
  await buildCli(u)
  await waitForApi(app)
  browser = await chromium.launch({ headless: true, ...(opts.channel === 'chrome' ? { channel: 'chrome' } : {}) })
  try {
    if (fresh.length) {
      console.log('Fresh install …')
      await endSessions()
      await recreateDatabase(u)
      await reputecast(u, ['migrate', 'up'])
      ownerPassword = parseTempPassword(await reputecast(u, ['install', '--email', OWNER.email, '--name', OWNER.name]))
      await waitForApi(app)
      database = 'changed'
      await captureAll(fresh)
    }
    if (acme.length || demo.length) {
      if (database !== 'dev' || !opts['no-reseed']) {
        console.log('Seeding Acme …')
        await seed(u, [])
        database = 'acme'
      }
      await captureAll(acme)
    }
    const groups = Map.groupBy(demo, (s) => JSON.stringify(s.demoSend))
    for (const [key, list] of groups) {
      const d = JSON.parse(key) as NonNullable<Shot['demoSend']>
      console.log(`Demo send "${d.campaign}" (${d.scenario}, ${d.elapsed}) …`)
      await reputecast(u, ['demo', 'send', d.campaign, '--scenario', d.scenario, '--elapsed', d.elapsed, '--reset'])
      database = 'changed'
      await sleep(5_000)
      await captureAll(list)
    }
    if (northwind.length) {
      console.log('Seeding Northwind …')
      await seed(u, ['--sample', 'northwind'])
      database = 'changed'
      await captureAll(northwind)
    }
    if (database === 'changed') {
      console.log('Re-seeding Acme for development …')
      await seed(u, [])
    }
  } finally {
    await endSessions()
    await browser.close()
  }
  printSummary()
  if (results.some((r) => r.result === 'failed')) process.exitCode = 1
}

await main()
