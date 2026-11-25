import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import { DEFAULT_LOCALE, LOCALE_CODES, STORAGE_KEYS } from '@/config/site'

import lvCommon from './locales/lv/common.json'
import lvMap from './locales/lv/map.json'
import lvCharity from './locales/lv/charity.json'
import lvRegister from './locales/lv/register.json'
import lvAccount from './locales/lv/account.json'
import lvAbout from './locales/lv/about.json'
import lvLegal from './locales/lv/legal.json'

/**
 * Namespaces are per PAGE, plus `common` for the chrome.
 *
 * A component uses `useTranslation('<ns>')` and plain keys. Never write a
 * `ns:key` prefix inside a component: crossing namespaces that way makes a key
 * impossible to find later and defeats the parity test.
 */
export const NAMESPACES = [
  'common',
  'map',
  'charity',
  'register',
  'account',
  'about',
  'legal',
] as const

export type Namespace = (typeof NAMESPACES)[number]

/**
 * All locales are bundled rather than fetched: a network round-trip means a
 * visible flash of untranslated keys on first paint, and a broken page
 * whenever that request fails. The site is Latvian only.
 *
 * Owners: `map` and `charity` the public pages, `register` and `account` the
 * registration wizard and the charity's account pages. `map.meta` is also the
 * site's own description (structured data, `llms.txt`), and `map.share.headline`
 * the share card's headline (`npm run images`).
 */
export const resources = {
  lv: {
    common: lvCommon,
    map: lvMap,
    charity: lvCharity,
    register: lvRegister,
    account: lvAccount,
    about: lvAbout,
    legal: lvLegal,
  },
} as const

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: [...LOCALE_CODES],
    fallbackLng: DEFAULT_LOCALE,
    defaultNS: 'common',
    ns: [...NAMESPACES],

    detection: {
      // The path is checked first: a URL is a shareable, linkable statement of
      // which language this page is in, and it must beat a remembered setting.
      // Otherwise someone opening /lv/about with 'en' stored gets English at a
      // Latvian URL.
      order: ['path', 'localStorage', 'navigator'],
      lookupFromPathIndex: 0,
      lookupLocalStorage: STORAGE_KEYS.locale,
      caches: ['localStorage'],
    },

    interpolation: {
      // React escapes for us; doing it twice turns an apostrophe into &#39;.
      escapeValue: false,
    },

    // A missing key should be loud in development and invisible in production:
    // showing "map.title" to a customer is worse than showing the
    // English fallback.
    returnEmptyString: false,
    saveMissing: false,
  })

export default i18n
