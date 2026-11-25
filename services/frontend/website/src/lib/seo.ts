import { DEFAULT_LOCALE, SITE, LOCALES, type LocaleCode } from '@/config/site'
import { IMAGE_TYPES, OG_LOCALES, SHARE_IMAGE } from '@/config/constants'
import { originUrl } from '@/config/env'
import { localePath, stripLocale } from '@/lib/locale-path'

/**
 * Everything that goes in the document head.
 *
 * Pure string building, no DOM writes. `components/seo/Seo.tsx` applies the
 * result. Keeping the two apart is what makes this exhaustively testable
 * without a browser.
 */

export interface PageMeta {
  /** Page title WITHOUT the brand suffix: this adds it. */
  readonly title: string
  readonly description: string
  /** Unprefixed route, e.g. `/about`. */
  readonly path: string
  readonly locale: LocaleCode
  /** Absolute or root-relative image URL for social cards. */
  readonly image?: string
  /** `noindex` for pages that must stay out of search results. */
  readonly noIndex?: boolean
}

/**
 * "About us" → "About us · Dod ar prieku".
 *
 * The brand stands alone, rather than "Dod ar prieku · Dod ar prieku", when the title is
 * empty or is the brand. It also stands alone when the title is one of
 * `generic`: the words a navigation label uses for the home page. "Home ·
 * Dod ar prieku" is what a search result shows as the site's headline, and it says
 * nothing about what the business does. The home page's `meta.title` is meant
 * to be a real phrase; this is the guard for when it is not.
 */
export const buildTitle = (title: string, generic: readonly string[] = []): string => {
  const clean = title.trim()
  const isGeneric = generic.some((label) => label.trim().toLowerCase() === clean.toLowerCase())
  return clean.length === 0 || clean === SITE.name || isGeneric ? SITE.name : `${clean} · ${SITE.name}`
}

/**
 * Search engines truncate around 155–160 characters, and a description cut
 * mid-word looks broken. Trim at a word boundary and add an ellipsis.
 */
export const truncateDescription = (text: string, max = 155): string => {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (clean.length <= max) return clean

  const cut = clean.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/**
 * The share card's path, versioned by its content (`?v=` and eight hex digits,
 * from `vite.config.ts`). WhatsApp, iMessage and Telegram cache a link's card
 * for days, keyed on the image URL, so a redrawn card on the same URL shows
 * the old one until the cache expires. A new hash is a new URL.
 */
export const shareImagePath = (): string =>
  __SHARE_IMAGE_VERSION__ === '' ? SHARE_IMAGE.path : `${SHARE_IMAGE.path}?v=${__SHARE_IMAGE_VERSION__}`

/** `og:locale` form of a language: "lv" becomes "lv_LV". */
export const ogLocale = (code: string): string => OG_LOCALES[code] ?? `${code}_${code.toUpperCase()}`

/** The MIME type an image's extension names, or null when it names none we know. */
const imageTypeOf = (path: string): string | null => {
  const extension = path.split(/[?#]/)[0]?.split('.').pop()?.toLowerCase() ?? ''
  return IMAGE_TYPES[extension] ?? null
}

/** Absolute URL for a path, using the configured origin. */
export const absoluteUrl = (path: string): string => {
  const origin = originUrl()
  const suffix = path.startsWith('/') ? path : `/${path}`
  return origin ? `${origin}${suffix}` : suffix
}

/** The canonical URL for a page in one locale. */
export const canonicalUrl = (path: string, locale: LocaleCode): string =>
  absoluteUrl(localePath(stripLocale(path), locale))

/**
 * `hreflang` alternates: this page in every language, plus `x-default`.
 *
 * Without these, the language versions look like duplicate content and compete
 * with each other instead of being understood as translations.
 *
 * `x-default` is the page in `DEFAULT_LOCALE`, the language the bare root, the
 * 404 page and every unmatched URL fall back to, so a search engine sends a
 * reader it cannot match where the site itself would. Not `LOCALES[0]`: that
 * order is only the language switcher's.
 */
export interface AlternateLink {
  readonly hrefLang: string
  readonly href: string
}

export const alternateLinks = (path: string): AlternateLink[] => {
  const route = stripLocale(path)

  const perLocale = LOCALES.map((locale) => ({
    hrefLang: locale.htmlLang,
    href: absoluteUrl(localePath(route, locale.code)),
  }))

  return [...perLocale, { hrefLang: 'x-default', href: absoluteUrl(localePath(route, DEFAULT_LOCALE)) }]
}

/**
 * Open Graph and Twitter tags, as name/content pairs.
 *
 * Social crawlers do not run JavaScript, so anything that must appear in a
 * shared link has to be in the static `index.html` too. What this produces is
 * for the browser tab and for crawlers that DO execute: treat the copy in
 * `index.html` as the one that gets shared, and keep the two in step.
 */
export const socialTags = (
  meta: PageMeta,
  generic: readonly string[] = [],
): ReadonlyArray<[string, string]> => {
  const url = canonicalUrl(meta.path, meta.locale)
  const image = absoluteUrl(meta.image ?? shareImagePath())
  const localeEntry = LOCALES.find((l) => l.code === meta.locale)
  const title = buildTitle(meta.title, generic)

  // The generated card's size and alt text are known; a custom image's are not,
  // and a wrong width is worse than none.
  const imageDetails: ReadonlyArray<[string, string]> =
    meta.image === undefined
      ? [
          ['og:image:width', String(SHARE_IMAGE.width)],
          ['og:image:height', String(SHARE_IMAGE.height)],
          ['og:image:alt', SITE.name],
          ['og:image:type', SHARE_IMAGE.type],
        ]
      : imageTypeOf(meta.image) === null
        ? []
        : [['og:image:type', imageTypeOf(meta.image) ?? '']]

  return [
    ['og:type', 'website'],
    ['og:site_name', SITE.name],
    ['og:title', title],
    ['og:description', truncateDescription(meta.description)],
    ['og:url', url],
    ['og:image', image],
    ...imageDetails,
    ['og:locale', ogLocale(localeEntry?.code ?? DEFAULT_LOCALE)],
    ...LOCALES.filter((l) => l.code !== meta.locale).map((l): [string, string] => ['og:locale:alternate', ogLocale(l.code)]),
    ['twitter:card', 'summary_large_image'],
    ['twitter:title', title],
    ['twitter:description', truncateDescription(meta.description)],
    ['twitter:image', image],
  ]
}

/**
 * The robots meta for a page.
 *
 * `max-image-preview:large` lets Google show the share card at full width in
 * results and Discover, instead of a thumbnail. Everything else a crawler
 * assumes by default, so it is not spelled out.
 */
export const robotsContent = (noIndex = false): string =>
  noIndex ? 'noindex, nofollow' : 'max-image-preview:large'
