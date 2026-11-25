import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import { DEFAULT_LOCALE, LOCALE_CODES, STORAGE_KEYS } from '@/config/site'

import enCommon from './locales/en/common.json'
import enHome from './locales/en/home.json'
import enServices from './locales/en/services.json'
import enAbout from './locales/en/about.json'
import enContact from './locales/en/contact.json'
import enLegal from './locales/en/legal.json'

import lvCommon from './locales/lv/common.json'
import lvHome from './locales/lv/home.json'
import lvServices from './locales/lv/services.json'
import lvAbout from './locales/lv/about.json'
import lvContact from './locales/lv/contact.json'
import lvLegal from './locales/lv/legal.json'

import ruCommon from './locales/ru/common.json'
import ruHome from './locales/ru/home.json'
import ruServices from './locales/ru/services.json'
import ruAbout from './locales/ru/about.json'
import ruContact from './locales/ru/contact.json'
import ruLegal from './locales/ru/legal.json'

/**
 * Namespaces are per PAGE, plus `common` for the chrome.
 *
 * A component uses `useTranslation('<ns>')` and plain keys. Never write a
 * `ns:key` prefix inside a component: crossing namespaces that way makes a key
 * impossible to find later and defeats the parity test.
 */
export const NAMESPACES = [
  'common',
  'home',
  'services',
  'about',
  'contact',
  'legal',
] as const

export type Namespace = (typeof NAMESPACES)[number]

/**
 * All locales are bundled rather than fetched.
 *
 * Three languages of JSON is a few tens of kilobytes; a network round-trip per
 * language means a visible flash of untranslated keys on first paint, and a
 * broken page whenever that request fails.
 */
export const resources = {
  en: {
    common: enCommon,
    home: enHome,
    services: enServices,
    about: enAbout,
    contact: enContact,
    legal: enLegal,
  },
  lv: {
    common: lvCommon,
    home: lvHome,
    services: lvServices,
    about: lvAbout,
    contact: lvContact,
    legal: lvLegal,
  },
  ru: {
    common: ruCommon,
    home: ruHome,
    services: ruServices,
    about: ruAbout,
    contact: ruContact,
    legal: ruLegal,
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
    // showing "home.hero.title" to a customer is worse than showing the
    // English fallback.
    returnEmptyString: false,
    saveMissing: false,
  })

export default i18n
