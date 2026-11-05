// The docs locales: English at the root URLs, the others under /<code>/, in the language picker's order (English,
// then by their own names, as the app's picker). Every page exists in each one (scripts/content/check.ts).

export const LOCALES = ['en', 'de', 'es', 'fr', 'vi'] as const
export type Lang = (typeof LOCALES)[number]

/** Locales with their own URL prefix (every one but English). */
export const PREFIXED_LOCALES = ['de', 'es', 'fr', 'vi'] as const satisfies readonly Lang[]
export type PrefixedLang = (typeof PREFIXED_LOCALES)[number]

/** Each language's name in itself, as the language picker shows it. */
export const LANGUAGE_NAMES: Record<Lang, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  vi: 'Tiếng Việt',
}

/** A text in every locale. */
export type Localized = Record<Lang, string>

export function isLang(code: string): code is Lang {
  return (LOCALES as readonly string[]).includes(code)
}

const PREFIX = new RegExp(`^/?(${PREFIXED_LOCALES.join('|')})(?=/|$)`)

/** The locale of an entry id or root-relative path ('de/campaigns/a', '/vi/'); English without a prefix. */
export function localeOf(path: string): Lang {
  return (PREFIX.exec(path)?.[1] as Lang | undefined) ?? 'en'
}

/** An entry id or root-relative path without its locale prefix ('/vi/campaigns/' → '/campaigns/', 'de/a' → 'a'). */
export function stripLocale(path: string): string {
  const match = PREFIX.exec(path)
  if (!match) return path
  const rest = path.slice(match[0].length)
  return path.startsWith('/') ? rest || '/' : rest.replace(/^\//, '')
}

/** Prefixes a root-relative docs path with the locale, unless it has one or is the English-only API reference. */
export function localizedPath(path: string, lang: string): string {
  if (lang === 'en' || !isLang(lang) || PREFIX.test(path) || /^\/api(\/|$)/.test(path)) return path
  return `/${lang}${path}`
}
