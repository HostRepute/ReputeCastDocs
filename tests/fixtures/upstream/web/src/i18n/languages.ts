import { PSEUDO_LOCALE } from './pseudo'
import { REGION_FORMATS, regionHourCycle, regionName, regionWeekStart, type HourCycle, type RegionFormat, type WeekStart } from './regions'
import { COMPLETE_LANGUAGES } from './status.gen'
import type { AppLocale, Preferences } from './store'

export interface AppLanguage {
  readonly code: AppLocale
  /** The language's name in itself, in every interface language. */
  readonly name: string
}

/** The languages ReputeCast's interface is translated into, in picker order. */
export const APP_LANGUAGES: readonly AppLanguage[] = [
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Tiếng Việt' },
]

export const PSEUDO_LANGUAGE: AppLanguage = { code: PSEUDO_LOCALE, name: 'Pseudo (+40%)' }
