import { LOCALES, SITE } from '@/config/site'
import {
  alternateLinks,
  buildTitle,
  canonicalUrl,
  robotsContent,
  socialTags,
  truncateDescription,
  type PageMeta,
} from '@/lib/seo'
import { structuredDataFor } from '@/lib/structured-data'

/**
 * A page's whole `<head>`, as data.
 *
 * ONE function decides what a page declares, and two things apply it:
 * `components/seo/Seo.tsx` writes it into the live document after every
 * navigation, and the build's prerender (`entry-server.tsx`) serialises it into
 * each page's HTML with `headHtml`. A crawler that runs no JavaScript and a
 * browser that does therefore read the same title, canonical and JSON-LD,
 * because there is no second copy of the logic to drift.
 */

/** Every tag this module produces carries it, so the runtime can find and replace them. */
export const HEAD_MARK = 'data-seo'

export type HeadTag =
  | {
      readonly kind: 'meta'
      readonly attr: 'name' | 'property'
      readonly key: string
      readonly content: string
    }
  | { readonly kind: 'link'; readonly rel: string; readonly href: string; readonly hrefLang?: string }
  | { readonly kind: 'json-ld'; readonly data: Readonly<Record<string, unknown>> }

export interface PageHead {
  /** The full document title, brand included. */
  readonly title: string
  /** The value for `<html lang>`. */
  readonly lang: string
  readonly tags: readonly HeadTag[]
}

/** The page-independent strings `pageHead` needs, already translated. */
export interface HeadStrings {
  /** What the navigation calls the home page: never a title of its own, and the first breadcrumb. */
  readonly homeLabel: string
  /** The home page's meta description, the Organization's description. */
  readonly siteDescription: string
}

const meta = (attr: 'name' | 'property', key: string, content: string): HeadTag => ({
  kind: 'meta',
  attr,
  key,
  content,
})

/**
 * What one page puts in the head.
 *
 * A `noIndex` page (the 404) declares no canonical, no `hreflang` and no
 * `og:url`. A canonical on a page that also says `noindex` is two
 * contradictory instructions, and there is no URL for a page that does not
 * exist to be canonical at.
 */
export const pageHead = (page: PageMeta, strings: HeadStrings): PageHead => {
  const noIndex = page.noIndex === true
  const generic = [strings.homeLabel]
  const entry = LOCALES.find((locale) => locale.code === page.locale)

  const addresses: readonly HeadTag[] = noIndex
    ? []
    : [
        { kind: 'link', rel: 'canonical', href: canonicalUrl(page.path, page.locale) },
        ...alternateLinks(page.path).map(
          (alternate): HeadTag => ({
            kind: 'link',
            rel: 'alternate',
            href: alternate.href,
            hrefLang: alternate.hrefLang,
          }),
        ),
      ]

  const social = socialTags(page, generic)
    .filter(([key]) => !(noIndex && key === 'og:url'))
    .map(([key, content]) => meta(key.startsWith('og:') ? 'property' : 'name', key, content))

  const structured = structuredDataFor({
    path: page.path,
    locale: page.locale,
    title: page.title,
    homeLabel: strings.homeLabel,
    siteDescription: strings.siteDescription,
    ...(page.noIndex !== undefined ? { noIndex: page.noIndex } : {}),
  }).map((data): HeadTag => ({ kind: 'json-ld', data }))

  return {
    title: buildTitle(page.title, generic),
    lang: entry?.htmlLang ?? SITE.defaultLang,
    tags: [
      meta('name', 'description', truncateDescription(page.description)),
      meta('name', 'robots', robotsContent(noIndex)),
      meta('name', 'application-name', SITE.shortName),
      meta('name', 'apple-mobile-web-app-title', SITE.shortName),
      ...addresses,
      ...social,
      ...structured,
    ],
  }
}

/** The canonical URL a head declares, or null when it declares none. */
export const canonicalOf = (head: PageHead): string | null => {
  const links = head.tags.filter((tag) => tag.kind === 'link' && tag.rel === 'canonical')
  const [first] = links
  return links.length === 1 && first?.kind === 'link' ? first.href : null
}

/** The `hreflang` alternates a head declares, in the order it declares them. */
export const alternatesOf = (head: PageHead): ReadonlyArray<{ readonly hrefLang: string; readonly href: string }> =>
  head.tags.flatMap((tag) =>
    tag.kind === 'link' && tag.rel === 'alternate' && tag.hrefLang !== undefined
      ? [{ hrefLang: tag.hrefLang, href: tag.href }]
      : [],
  )

/** The content of one meta tag, or null. */
export const metaContent = (head: PageHead, key: string): string | null => {
  const tag = head.tags.find((candidate) => candidate.kind === 'meta' && candidate.key === key)
  return tag?.kind === 'meta' ? tag.content : null
}

const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Escapes text for an HTML attribute value or element body. */
export const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char)

/**
 * JSON for a `<script type="application/ld+json">` body.
 *
 * `<` is written as `<`: still the same JSON to a parser, but a
 * description containing `</script>` can no longer close the element early and
 * turn the rest of the string into markup.
 */
export const jsonLdText = (data: Readonly<Record<string, unknown>>): string =>
  JSON.stringify(data).replace(/</g, '\\u003c')

const tagHtml = (tag: HeadTag): string => {
  switch (tag.kind) {
    case 'meta':
      return `<meta ${tag.attr}="${escapeHtml(tag.key)}" content="${escapeHtml(tag.content)}" ${HEAD_MARK} />`
    case 'link': {
      const lang = tag.hrefLang === undefined ? '' : ` hreflang="${escapeHtml(tag.hrefLang)}"`
      return `<link rel="${escapeHtml(tag.rel)}" href="${escapeHtml(tag.href)}"${lang} ${HEAD_MARK} />`
    }
    case 'json-ld':
      return `<script type="application/ld+json" ${HEAD_MARK}>${jsonLdText(tag.data)}</script>`
  }
}

/** The head as HTML, for the prerendered page. The title first, then every tag, one per line. */
export const headHtml = (head: PageHead, indent = '    '): string =>
  [`<title>${escapeHtml(head.title)}</title>`, ...head.tags.map(tagHtml)].join(`\n${indent}`)
