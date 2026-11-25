import {
  COMPANY,
  CONTACT,
  LOCALES,
  ROUTES,
  SITE,
  activeSocial,
  type LocaleCode,
} from '@/config/site'
import { LOGO_IMAGE } from '@/config/constants'
import { stripLocale } from '@/lib/locale-path'
import { isPlaceholder, publishable, publishableCopy } from '@/lib/placeholder'
import { absoluteUrl, canonicalUrl } from '@/lib/seo'

/**
 * schema.org structured data, as plain objects. `components/seo/Seo.tsx`
 * serialises them into `<script type="application/ld+json">`.
 *
 * This is what a search engine reads to know the site's name, its logo and
 * the business behind it, and what an AI assistant reads to say who provides
 * what, where. So it follows two rules:
 *
 * - **Nothing that is still a placeholder is published.** A template phone
 *   number in JSON-LD is a machine-readable false statement about a real
 *   company, and "Replace this with one sentence..." is not a description of
 *   one. `lib/placeholder.ts` decides, and absent is the answer.
 * - **Only what the page shows.** Services are marked up on the page that
 *   lists them, from the same strings the visitor reads. Markup describing
 *   content the page does not have is what Google's guidelines penalise.
 */

type JsonLd = Record<string, unknown>

const CONTEXT = 'https://schema.org'

/** Drops keys whose value is null or undefined, returning a new object. */
const withoutEmpty = (entries: Record<string, unknown>): JsonLd =>
  Object.fromEntries(Object.entries(entries).filter(([, value]) => value !== null && value !== undefined))

/** Stable identifiers, so the website, services and pages can point at one organisation. */
export const organizationId = (): string => `${absoluteUrl('/')}#organization`
export const websiteId = (): string => `${absoluteUrl('/')}#website`

/** Only the social profiles that were filled in with a real, absolute URL. */
const sameAs = (): string[] =>
  activeSocial()
    .map(([, url]) => url)
    .filter((url) => !isPlaceholder(url) && /^https?:\/\//.test(url))

/** The street is what makes an address; without a real one, only the country is true. */
const postalAddress = (): JsonLd => {
  const street = publishable(CONTACT.address.street)
  return withoutEmpty({
    '@type': 'PostalAddress',
    streetAddress: street,
    addressLocality: street === null ? null : publishable(CONTACT.address.city),
    postalCode: street === null ? null : publishable(CONTACT.address.postalCode),
    addressCountry: SITE.country,
  })
}

const areaServed = (): JsonLd =>
  withoutEmpty({ '@type': 'Country', name: publishable(CONTACT.address.country) ?? SITE.country })

const contactPoint = (email: string | null, telephone: string | null): JsonLd[] | null =>
  email === null && telephone === null
    ? null
    : [
        withoutEmpty({
          '@type': 'ContactPoint',
          contactType: 'customer service',
          email,
          telephone,
          availableLanguage: LOCALES.map((locale) => locale.htmlLang),
          areaServed: areaServed(),
        }),
      ]

/**
 * Organization: the business behind the site.
 *
 * `description` is the home page's meta description in the page's language,
 * the one sentence the site already uses to say what the business does. Left
 * out while it is still the template's instruction to write one.
 */
export const organizationJsonLd = (description?: string): JsonLd => {
  const email = publishable(CONTACT.email)
  const telephone = publishable(CONTACT.phoneE164)
  const profiles = sameAs()

  return withoutEmpty({
    '@context': CONTEXT,
    '@type': 'Organization',
    '@id': organizationId(),
    name: SITE.name,
    url: absoluteUrl('/'),
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl(LOGO_IMAGE.path),
      width: LOGO_IMAGE.width,
      height: LOGO_IMAGE.height,
    },
    description: publishableCopy(description),
    email,
    telephone,
    legalName: publishable(COMPANY.legalName),
    taxID: publishable(COMPANY.registrationNumber),
    vatID: publishable(COMPANY.vatNumber),
    address: postalAddress(),
    areaServed: areaServed(),
    contactPoint: contactPoint(email, telephone),
    sameAs: profiles.length > 0 ? profiles : null,
  })
}

/**
 * WebSite: where Google takes the site name it shows above a result, instead
 * of guessing one from the title or the domain. Belongs on the home page.
 */
export const websiteJsonLd = (): JsonLd => {
  const alternates = [SITE.shortName, SITE.domain].filter(
    (name, index, all) => name !== SITE.name && !isPlaceholder(name) && all.indexOf(name) === index,
  )
  const languages = LOCALES.map((locale) => locale.htmlLang)

  return withoutEmpty({
    '@context': CONTEXT,
    '@type': 'WebSite',
    '@id': websiteId(),
    name: SITE.name,
    alternateName: alternates.length > 0 ? alternates : null,
    url: absoluteUrl('/'),
    inLanguage: languages.length === 1 ? languages[0] : languages,
    publisher: { '@id': organizationId() },
  })
}

/** Breadcrumb structured data. Pass the trail from home to the current page. */
export const breadcrumbJsonLd = (
  trail: ReadonlyArray<{ name: string; path: string }>,
  locale: LocaleCode,
): JsonLd => ({
  '@context': CONTEXT,
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((crumb, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: crumb.name,
    item: canonicalUrl(crumb.path, locale),
  })),
})

/** One service as the visitor reads it on the services page, already translated. */
export interface ServiceSummary {
  readonly name: string
  readonly description: string
  /** The anchor the services page gives it, from `data/services.ts`. */
  readonly slug: string
}

/**
 * The services a page lists, each a Service provided by the organisation. A
 * service whose text is still the template's instruction is listed by name,
 * with no description.
 */
export const serviceJsonLd = (
  services: readonly ServiceSummary[],
  locale: LocaleCode,
): JsonLd => ({
  '@context': CONTEXT,
  '@type': 'ItemList',
  itemListElement: services.map((service, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: withoutEmpty({
      '@type': 'Service',
      name: service.name,
      description: publishableCopy(service.description),
      url: `${canonicalUrl(ROUTES.services, locale)}#${service.slug}`,
      provider: { '@id': organizationId() },
      areaServed: areaServed(),
    }),
  })),
})

export interface StructuredDataInput {
  /** The path the page gives `Seo`, prefixed or not. */
  readonly path: string
  readonly locale: LocaleCode
  /** The page's own title, without the brand: the last breadcrumb. */
  readonly title: string
  readonly noIndex?: boolean
  /** What the navigation calls the home page, in this language: the first breadcrumb. */
  readonly homeLabel: string
  /** The home page's meta description, in this language. */
  readonly siteDescription: string
  /** The services the page lists. Empty unless it is the services page. */
  readonly services: readonly ServiceSummary[]
}

/**
 * Which blocks a page carries.
 *
 * Every page: the Organization. The home page: the WebSite. Every other
 * indexable page: its breadcrumb, and on the services page, the services.
 * A `noIndex` page gets nothing beyond the Organization; it is not meant to
 * be understood, only to exist.
 */
export const structuredDataFor = (input: StructuredDataInput): readonly JsonLd[] => {
  const organization = organizationJsonLd(input.siteDescription)
  if (input.noIndex === true) return [organization]

  const route = stripLocale(input.path)
  if (route === ROUTES.home) return [organization, websiteJsonLd()]

  const breadcrumb = breadcrumbJsonLd(
    [
      { name: input.homeLabel, path: ROUTES.home },
      { name: input.title, path: route },
    ],
    input.locale,
  )
  const listsServices = route === ROUTES.services && input.services.length > 0
  return listsServices
    ? [organization, breadcrumb, serviceJsonLd(input.services, input.locale)]
    : [organization, breadcrumb]
}
