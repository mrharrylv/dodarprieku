import { isPlaceholder, publishableCopy } from './placeholder'

/**
 * `/llms.txt`: the site, summarised for a language model (llmstxt.org).
 *
 * An assistant asked "who does X in Rīga" reads a site the way a crawler
 * does, without running its JavaScript. This file gives it, in one fetch,
 * what the business is, the facts it can repeat with confidence, and where
 * each page lives in each language.
 *
 * Build-time only, like `crawlers.ts`: the prerender writes it into `dist/`
 * when `VITE_SITE_URL` is set (`crawler-files.ts`).
 * The facts come only from values `placeholder.ts` accepts as real, and the
 * summary and each page's note only from real copy: a model repeats what it
 * reads, and a template phone number, or "Replace this with one sentence...",
 * would be repeated to everyone who asked.
 */

/**
 * Where each route's title and description live in the locale files. Keyed
 * by the `ROUTES` key, so a route added without an entry here fails the type
 * check in `crawler-files.ts`.
 */
export const PAGE_META = {
  home: { ns: 'home', key: 'meta' },
  services: { ns: 'services', key: 'meta' },
  about: { ns: 'about', key: 'meta' },
  contact: { ns: 'contact', key: 'meta' },
  privacy: { ns: 'legal', key: 'privacy.meta' },
  cookies: { ns: 'legal', key: 'cookies.meta' },
  terms: { ns: 'legal', key: 'terms.meta' },
  company: { ns: 'legal', key: 'company.meta' },
} as const

export interface PageText {
  readonly title: string
  readonly description: string
}

/** Reads `{ title, description }` at a dotted key, or throws naming what is missing. */
export const pageText = (namespace: unknown, key: string, where: string): PageText => {
  const node = key
    .split('.')
    .reduce<unknown>(
      (value, part) => (value !== null && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined),
      namespace,
    ) as Partial<Record<keyof PageText, unknown>> | undefined
  if (typeof node?.title !== 'string' || typeof node.description !== 'string') {
    throw new Error(`${where}: no title and description at "${key}"`)
  }
  return { title: node.title, description: node.description }
}

export interface SiteFactsInput {
  readonly brand: string
  /** Where the business operates, as a name ("Latvia") or a code ("LV"). */
  readonly country: string
  /** The site's languages, by their own names. */
  readonly languages: readonly string[]
  readonly legalName?: string
  readonly registrationNumber?: string
  readonly vatNumber?: string
  readonly registeredAddress?: string
  readonly email?: string
  readonly phone?: string
  readonly profiles?: readonly string[]
}

const listed = (items: readonly string[]): string =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

const real = (value: string | undefined): string | null => (isPlaceholder(value) ? null : (value ?? '').trim())

/** Sentences of fact, each one only when every value in it is real. */
export const siteFacts = (input: SiteFactsInput): readonly string[] => {
  const legalName = real(input.legalName)
  const identifiers = [
    real(input.registrationNumber) === null ? null : `registration number ${real(input.registrationNumber)}`,
    real(input.vatNumber) === null ? null : `VAT number ${real(input.vatNumber)}`,
  ].filter((part): part is string => part !== null)
  const address = real(input.registeredAddress)
  const contact = [
    real(input.email) === null ? null : `email ${real(input.email)}`,
    real(input.phone) === null ? null : `telephone ${real(input.phone)}`,
  ].filter((part): part is string => part !== null)
  const profiles = (input.profiles ?? []).filter((url) => !isPlaceholder(url))

  return [
    `${input.brand} operates in ${input.country}.`,
    input.languages.length > 0 ? `The site is published in ${listed(input.languages)}.` : null,
    legalName === null
      ? null
      : `The business is ${legalName}${identifiers.length > 0 ? `, ${identifiers.join(', ')}` : ''}.`,
    address === null ? null : `Registered address: ${address}.`,
    contact.length > 0 ? `Contact: ${contact.join(', ')}.` : null,
    profiles.length > 0 ? `Profiles: ${profiles.join(', ')}.` : null,
  ].filter((sentence): sentence is string => sentence !== null)
}

export interface LlmsLink extends PageText {
  readonly url: string
}

export interface LlmsInput {
  readonly brand: string
  /** One sentence on what the business does: the home page's meta description. */
  readonly summary: string
  readonly facts: readonly string[]
  readonly pages: readonly LlmsLink[]
  /** Pages a model may skip when its context is short: the legal ones. */
  readonly optional: readonly LlmsLink[]
}

/** One line, however the copy was wrapped in the locale file. */
const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim()

/** A link, with its description as the note when the description is real copy. */
const link = ({ title, url, description }: LlmsLink): string => {
  const note = publishableCopy(description)
  return `- [${oneLine(title)}](${url})${note === null ? '' : `: ${oneLine(note)}`}`
}

/**
 * The llmstxt.org shape: an H1 with the name, a blockquote summary, free
 * text, then H2 sections of links. A section called "Optional" is the one a
 * reader may drop first. Only the H1 is required, so a summary that is still
 * the template's instruction is left out rather than published.
 */
export const llmsTxt = (input: LlmsInput): string => {
  const summary = publishableCopy(input.summary)
  const sections = [
    `# ${oneLine(input.brand)}`,
    summary === null ? null : `> ${oneLine(summary)}`,
    input.facts.length > 0 ? input.facts.join(' ') : null,
    input.pages.length > 0 ? ['## Pages', '', ...input.pages.map(link)].join('\n') : null,
    input.optional.length > 0 ? ['## Optional', '', ...input.optional.map(link)].join('\n') : null,
  ].filter((section): section is string => section !== null)
  return `${sections.join('\n\n')}\n`
}
