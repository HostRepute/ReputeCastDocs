// Language and UI strings for our components. Pages are normally rendered by Starlight, but starlight-llms-txt
// renders page content in a bare Astro container (no Starlight route, no `t`), where English is the right answer.
import en from '../content/i18n/en.json'

type Vars = Record<string, string | number>
type Translate = (key: string, vars?: Vars) => string

const english: Translate = (key, vars) =>
  ((en as Record<string, string>)[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
    String(vars?.[name] ?? ''),
  )

export function pageContext(locals: App.Locals): { lang: string; t: Translate } {
  try {
    return { lang: locals.starlightRoute.lang, t: locals.t as unknown as Translate }
  } catch {
    return { lang: 'en', t: english }
  }
}
