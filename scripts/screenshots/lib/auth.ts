/**
 * Signs a browser context in as a demo user through the ReputeCast API.
 *
 * Re-implemented from hostrepute/reputecast web/scripts/lib/demo-auth.ts (same copyright holder):
 * the demo password and TOTP secret come from internal/demo.
 */
import { createHmac } from 'node:crypto'
import type { APIRequestContext } from '@playwright/test'

export const DEMO_PASSWORD = 'reputecast-demo'
export const DEMO_TOTP = 'JBSWY3DPEHPK3PXP'

function base32(s: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const c of s.replace(/=+$/, '').toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, '0')
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(bytes)
}

/** The 6-digit code of a base32 secret at `now` (RFC 6238, SHA-1, 30 s steps). */
export function totp(secret: string, now = Date.now()): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / 30)))
  const h = createHmac('sha1', base32(secret)).update(counter).digest()
  const o = h[h.length - 1]! & 0xf
  const n = ((h[o]! & 0x7f) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!
  return String(n % 1_000_000).padStart(6, '0')
}

export type SignInResult = { status: string; next?: string }

/**
 * Signs `request` (a browser context's request API, so the session cookie is shared with its pages) in as
 * `email`, answering the TOTP challenge with the demo secret when one is asked.
 */
export async function signIn(
  request: APIRequestContext,
  app: string,
  email: string,
  password = DEMO_PASSWORD,
): Promise<SignInResult> {
  const r = await request.post(`${app}/api/v1/auth/password`, { data: { email, password, remember: true } })
  if (!r.ok()) throw new Error(`sign-in as ${email} failed: ${r.status()} ${await r.text()}`)
  const body = (await r.json()) as SignInResult & { challenge?: string }
  if (body.status !== 'two_factor') return body
  const r2 = await request.post(`${app}/api/v1/auth/two-factor`, {
    data: { challenge: body.challenge, method: 'totp', code: totp(DEMO_TOTP) },
  })
  if (!r2.ok()) throw new Error(`two-factor for ${email} failed: ${r2.status()} ${await r2.text()}`)
  return (await r2.json()) as SignInResult
}

export type AppLocale = 'en' | 'vi' | 'default'

/** Sets the signed-in member's app language (PUT /api/v1/me/language); formats follow the language. */
export async function setLanguage(request: APIRequestContext, app: string, language: AppLocale): Promise<void> {
  const r = await request.put(`${app}/api/v1/me/language`, {
    data: { language, regionFormat: 'auto', hourCycle: 'auto', weekStart: 'auto' },
  })
  if (!r.ok()) throw new Error(`setting the app language to ${language} failed: ${r.status()} ${await r.text()}`)
}
