# Frontend architecture

**This document is binding, not advisory.** It describes the directory layout,
the modules that already exist and their exact signatures, the component
conventions, the routing model, the i18n rules, and the testing and
accessibility bars. Code that contradicts it is wrong, and so is a doc that
contradicts the code.

If you need to change a signature listed here, change the document and every
call site in the same commit. A doc that has drifted from the code is worse than
no doc: it is read, believed, and acted on.

Everything below is about `services/frontend/website/src`. Paths are relative to
that directory unless stated otherwise.

---

## The shape of the thing

A static React 19 app, built by Vite 8 (Rolldown), styled with Tailwind 4, translated
with i18next, and deployed to S3 behind CloudFront. There is no server. Every
route in every language is prerendered at build time into its own HTML file,
with its own head, and the browser hydrates it (see
[Prerendering and hydration](#prerendering-and-hydration)). Any dynamic
behaviour comes from an optional Lambda Function URL that the frontend treats
as absent until proven present.

Three locales ship in the bundle: `en`, `lv`, `ru`. URLs carry a language
prefix (`/lv/about`) because a multilingual site served from one URL can only
ever get its default language indexed.

---

## Directory map

| Directory | What belongs there | What does not |
| --- | --- | --- |
| `src/` (root files) | `main.tsx` hydrates the prerendered page (or mounts React on an empty one) and imports `index.css` and `i18n`. `entry-server.tsx` is the same app compiled for Node, which the build's prerender calls. `App.tsx` builds the route table from the ACTIVE style. `routes.tsx` is the table itself, built for any style. `index.css` holds every design token. `vite-env.d.ts` types the `VITE_*` build variables and `__BUILD_YEAR__`. | Anything else. Six files, and it stays six files. |
| `src/styles/` | One folder per design style: a shell, the four marketing pages, `tokens.css`, a README. Plus `contract.ts` (the type), `build.ts` (which style is active, and the Tailwind exclusions), `registry.ts` (discovery for the tests). See [`styles.md`](styles.md). | Content of any kind. A style decides how the site looks, never what it says. Also: a file that another style imports. Styles never reference each other. |
| `src/components/ui/` | Presentational primitives with no domain knowledge: `Container`, `Section`, `Card`, `CardLink`, `Button`, `ButtonLink`, `Input`, `Textarea`, `Alert`, `Spinner`. | Anything that imports from `config/site.ts`, `data/`, or a page's namespace. A primitive that knows the site's phone number is not a primitive. |
| `src/components/layout/` | Chrome that EVERY style shares: `LocaleLayout`, `RootRedirect`, `SkipLink`, `ThemeToggle`, `LanguageSwitcher`, `DevelopedBy`, and `SiteChrome` with `ScrollProgress`, `BackToTop`, `WhatsAppBubble`, `ScrollRestoration` and `PageTransition`. | The header and the footer. Those are a style's, and live in `src/styles/<id>/`. Page content, too: if it appears on one page only, it is not layout. |
| `src/components/contact/` | The contact form and its parts. | The submission transport, which lives in `lib/contact.ts`, and the validation, which lives in `lib/validation.ts`. |
| `src/components/legal/` | `LegalShell` and `LegalSection`, the wrapper every policy page uses, plus `legal-values.ts`, the interpolation values those pages share. | Policy prose. That is in `i18n/locales/*/legal.json`. |
| `src/components/seo/` | `Seo`, the one component that writes to `document.head`, and `head-collector.ts`, the context through which it hands its head to the prerender. | What the head holds, which is `lib/head.ts` (built from `lib/seo.ts` and `lib/structured-data.ts`) and is pure. |
| `src/config/` | Values that are the same in every language and that a person may want to change without touching logic: routes, contact details, the legal entity, field limits, storage keys, the parsed environment. | Prose of any kind. If a visitor reads it, it is a translation, not config. |
| `src/context/` | React contexts and their providers. Currently theming: `theme-context.ts` (context object plus types) and `ThemeProvider.tsx` (the provider). | The consuming hook. That is `hooks/useTheme.ts`, kept separate so the provider module exports only a component and Fast Refresh stays intact. |
| `src/data/` | Structural content lists: which services exist, in what order, under which key. | The words. Every visible string for a data entry lives under `items.<key>` in the locale files. |
| `src/hooks/` | Reusable stateful behaviour: `useLocale`, `useMobileMenu`, `useScrollLock`, `useTheme`. | One-off state that only one component uses. Leave it in the component. |
| `src/i18n/` | The i18next setup, the namespace list, the bundled `resources` object, the locale JSON, and the parity test. | Component code. |
| `src/lib/` | Pure functions. No React, no DOM writes, no imports from `components/`. Each file is one concern and each is exhaustively testable without a browser. | Anything that needs a hook, a ref, or `document`. |
| `src/pages/` | Pages that are the same in every style: the four legal pages and the 404. They render inside whichever shell is active. | The four marketing pages. Those are a style's, and live in `src/styles/<id>/`. Reusable pieces, too: the moment two pages want it, it moves to `components/`. |
| `src/test/` | `render.tsx` (the provider-wrapped render helper), `setup.ts` (global test environment), `static-head.ts` (`index.html`'s head, for tests of what `<Seo>` replaces), `prerender-in-child.ts` (prerenders pages in a separate Node process, for the hydration test), and the colour helpers the contrast test uses. | Tests. Those live beside the code they test. |
| `src/types/` | Shared type declarations that belong to no single module. Currently empty. | Types with an obvious owner. A type used by one module is declared and exported by that module. |

---

## Existing modules

**These are written. Import them. Do not recreate them, and do not guess their
exports: open the file.** Re-implementing a helper that already exists is the
most expensive kind of mistake here, because the duplicate is subtly different
and both copies then have to be maintained.

### `src/config/`

| File | Exports |
| --- | --- |
| `site.ts` | `LOCALES` (readonly array of `{ code, label, short, htmlLang }`), `type LocaleCode`, `DEFAULT_LOCALE: LocaleCode`, `LOCALE_CODES: readonly LocaleCode[]`, `SITE`, `CONTACT`, `SOCIAL`, `activeSocial(): ReadonlyArray<[keyof typeof SOCIAL, string]>`, `COMPANY`, `ROUTES`, `type RoutePath`, `NAV_LINKS`, `LEGAL_LINKS`, `STORAGE_KEYS`, `type StorageKey`, `ANALYTICS_ENDPOINT: string \| null` (HA Group's CRM; its origin is `analytics_origin` in Terraform) |
| `constants.ts` | `FIELD_LIMITS` (`name`, `email`, `phone`, `subject`, `message`, each `{ min, max }`), `RATE_LIMIT` (`{ maxAttempts, windowMs }`), `REQUEST_TIMEOUT_MS`, `HIDDEN_PAGE_TIMEOUT_MS` (the longest `public/theme-init.js` keeps a page hidden, repeated there), `CONSENT_TTL_DAYS`, `BREAKPOINTS`, `SHARE_IMAGE` (`{ path, width, height, type, maxBytes }`: the generated share card, its MIME type and the 300 KB WhatsApp limit), `LOGO_IMAGE` (`{ path, width, height }`, the structured-data logo), `IMAGE_TYPES` (MIME by extension, for `og:image:type`), `ANALYTICS` (`{ schemaVersion, campaignParams, maxCampaign, maxPath, maxHost, maxLanguage, maxTimeZone, maxEngagedMs }`: the visit-report limits of `doc/visit-tracking.md`) and `OG_LOCALES` (language to `language_TERRITORY` for `og:locale`; a language not listed gets `xx_XX`) |
| `dom.ts` | `MAIN_CONTENT_ID` |
| `env.ts` | `type OptionalEndpoint = string \| null`, `ENV` (`{ siteUrl, contactEndpoint, contactMode, consentEndpoint, analyticsEndpoint, isDev, isProd }`), `parseAnalyticsEndpoint(raw, fallback): OptionalEndpoint` (unset: `ANALYTICS_ENDPOINT`; `off`: null), `hasContactBackend(): boolean`, `hasConsentBackend(): boolean`, `hasAnalytics(): boolean`, `originUrl(): string` |

`env.ts` validates at the boundary and never throws. A `VITE_*` endpoint that is
absent, malformed, or not `https:` is logged once and treated as "feature off",
because a misconfigured endpoint is worse than an absent one: absent shows the
"call or email us" fallback, malformed fails at submit time after the visitor
has typed everything.

### `src/lib/`

| File | Exports |
| --- | --- |
| `cn.ts` | `type ClassValue = string \| number \| false \| null \| undefined`, `cn(...values: ClassValue[]): string` |
| `locale-path.ts` | `isPrefixed(): boolean`, `isLocaleCode(value: unknown): value is LocaleCode`, `localePath(path: string, locale: LocaleCode): string`, `stripLocale(pathname: string): string`, `localeFromPath(pathname: string): LocaleCode`, `switchLocale(pathname: string, next: LocaleCode): string`, `fallbackPath(pathname: string, locale?: LocaleCode): string`, `rootLocale(resolvedLanguage: string \| undefined): LocaleCode`, `startupRedirect(pathname: string, resolvedLanguage: string \| undefined): string \| null` |
| `storage.ts` | `readRaw(key: string): string \| null`, `writeRaw(key: string, value: string): boolean`, `remove(key: string): void`, `readJson<T>(key: string, isValid: (value: unknown) => value is T): T \| null`, `writeJson(key: string, value: unknown): boolean` |
| `rateLimit.ts` | `interface RateLimitStatus { allowed; remaining; retryAfterMs }`, `checkRateLimit(key: string, now?: number): RateLimitStatus`, `recordAttempt(key: string, now?: number): RateLimitStatus`, `clearRateLimit(key: string): void`, `retryAfterMinutes(retryAfterMs: number): number` |
| `validation.ts` | `type ContactField`, `interface ContactFormValues`, `type FieldErrors`, `interface ValidationResult`, `validateName`, `validateEmail`, `validatePhone`, `validateSubject`, `validateMessage` (each `(raw: string) => string \| null`), `validateConsent(given: boolean): string \| null`, `validateContactForm(values: ContactFormValues): ValidationResult`, `normaliseContactForm(values: ContactFormValues): ContactFormValues` |
| `contact.ts` | `type ContactResult`, `submitContactForm(values: ContactFormValues, locale: LocaleCode): Promise<ContactResult>` |
| `seo.ts` | `interface PageMeta { title; description; path; locale; image?; noIndex? }`, `buildTitle(title: string, generic?: readonly string[]): string`, `truncateDescription(text: string, max?: number): string`, `absoluteUrl(path: string): string`, `canonicalUrl(path: string, locale: LocaleCode): string`, `interface AlternateLink`, `alternateLinks(path: string): AlternateLink[]`, `socialTags(meta: PageMeta, generic?: readonly string[]): ReadonlyArray<[string, string]>`, `robotsContent(noIndex?: boolean): string` |
| `head.ts` | `HEAD_MARK` (`'data-seo'`), `type HeadTag` (`meta` / `link` / `json-ld`), `interface PageHead { title; lang; tags }`, `interface HeadStrings { homeLabel; siteDescription; services }`, `pageHead(page: PageMeta, strings: HeadStrings): PageHead`, `canonicalOf(head): string \| null`, `alternatesOf(head): ReadonlyArray<{ hrefLang; href }>`, `metaContent(head, key): string \| null`, `escapeHtml(text): string`, `jsonLdText(data): string`, `headHtml(head, indent?): string` |
| `analytics.ts` | Visit statistics, pure: `type DeviceClass`, `deviceClass(viewportWidth)`, `clip(value, max)`, `externalReferrer(referrer, host): string` (origin only), `campaignFrom(search)` (only `ANALYTICS.campaignParams`), `scrollPercent(scrollY, viewportHeight, documentHeight)`, `interface TrackingConditions`, `trackingAllowed(c): boolean` (production, not localhost, not webdriver, no GPC or DNT), `interface PageContext`, `interface VisitIds { sid; pid }`, `PageviewPayload`, `EngagementPayload`, `type TrackPayload`, `pageviewPayload(ids, seq, ctx, ts)`, `engagementPayload(ids, input, ts)`. If a field is not built here it is not sent; the contract is `doc/visit-tracking.md` |
| `tracker.ts` | `interface TrackerDeps { send; now; newId; context; visible }`, `interface Tracker { pageview(path); visibility(visible); scrolled(percent) }`, `createTracker(deps): Tracker` (one visit, in memory: engaged time counts only while visible), `randomId(): string` |
| `beacon.ts` | `type Transport`, `sendReport(endpoint, payload): boolean`: `sendBeacon` with a `text/plain` JSON body, else `fetch` `keepalive`/`no-cors`/`credentials: omit`; never throws, never awaits |
| `anchor.ts` | `anchorId(hash: string): string \| null`: the decoded id a URL fragment names, or null for none or one nobody can decode |
| `prerender.ts` | `PRERENDER_ATTR` (`'data-prerendered'`, on `#root` naming the page and, empty, on `<html>`), `REDIRECTING_ATTR` (`'data-redirecting'`), `type StartupPlan`, `interface StartupInput { pathname; resolvedLanguage; prerendered; redirecting }`, `startupPlan(input: StartupInput): StartupPlan`, `NOT_FOUND_PROBE`, `NOT_FOUND_FILE`, `interface PrerenderPage { key; url; locale; route; files }`, `interface RenderedPage { body; head }`, `pageKey(locale, route): string`, `fileForUrl(url): string`, `prerenderPages(): readonly PrerenderPage[]`, `keyForPathname(pathname): string \| null`, `pageDocument(template, page, rendered): string`, `validatePage(page, rendered, siteUrl): readonly string[]`, `declaredPages(rendered: { page; head }[], siteUrl): readonly DeclaredPage[]` |
| `structured-data.ts` | `organizationId(): string`, `websiteId(): string`, `organizationJsonLd(description?: string)`, `websiteJsonLd()`, `breadcrumbJsonLd(trail, locale)`, `interface ServiceSummary { name; description; slug }`, `serviceJsonLd(services, locale)`, `interface StructuredDataInput`, `structuredDataFor(input): readonly Record<string, unknown>[]` |
| `placeholder.ts` | `isPlaceholder(value: string \| null \| undefined): boolean`, `publishable(value): string \| null`, `isPlaceholderCopy(text: string \| null \| undefined): boolean`, `publishableCopy(...parts): string \| null` |
| `crawlers.ts` | `interface CrawlerGroup { comment; agents; allow }`, `CRAWLER_GROUPS`, `robotsTxt({ siteUrl, groups? }): string`, `interface SitemapAlternate { hrefLang; href }`, `interface SitemapPage { loc; alternates; route }`, `sitemapXml({ siteUrl, pages, legalRoutes? }): string` |
| `llms.ts` | `PAGE_META`, `interface PageText`, `pageText(namespace, key, where): PageText`, `interface SiteFactsInput`, `siteFacts(input): readonly string[]`, `interface LlmsLink`, `interface LlmsInput`, `llmsTxt(input): string` |
| `crawler-files.ts` | `type NamespaceReader`, `interface DeclaredPage { route; locale; url; canonical; alternates }`, `crawlerFiles({ siteUrl, site, read, pages }): ReadonlyArray<[fileName, source]>` |
| `edge-preview.ts` | `type EdgeQuery`, `interface EdgeRequest`, `interface EdgeResponse`, `type ViewerRequestHandler`, `type EdgeAnswer` (`response` / `file` / `missing`), `parseQuery(search: string): EdgeQuery`, `edgeAnswer(handler, target, hasFile): EdgeAnswer`. Build-time only: what `make preview` answers, through the CloudFront Function (see "At the edge") |

`crawlers.ts`, `llms.ts` and `crawler-files.ts` build `robots.txt`,
`sitemap.xml` and `llms.txt` at BUILD time, in the prerender, from what the
rendered pages' heads declare (see
[Prerendering and hydration](#prerendering-and-hydration)). They import each
other and `placeholder.ts` by relative path, and take everything else (the site
config, the locale strings, the pages) as arguments.

`placeholder.ts` is the one definition of "still a template value", for a
value (`isPlaceholder`: a phone number, a registration number) and for copy
(`isPlaceholderCopy`: the locale files' own instructions, "Replace this with
one sentence..."). The legal company page, the structured data and `llms.txt`
all ask it; a second, local idea of what a fake looks like is how one of them
ends up publishing it. Copy is judged only by the instructions, never by the
value markers, which would take "for example" or "XXXL" in real prose for a
placeholder.

Three of these carry rules that are easy to break by accident.

`storage.ts` is the only module allowed to touch `localStorage`. Every accessor
is wrapped, because `localStorage` does not merely return `null` sometimes, it
*throws on access* in Safari private mode, with site data blocked, and in a
partitioned iframe. An unguarded `getItem` in a render path takes the page down
as a white screen. `readJson` requires a type guard rather than accepting one
optionally: stored data is untrusted input that may have been written by an
older version of the site or edited by hand in devtools.

`validation.ts` returns error *keys*, never sentences. `validateEmail` returning
`'errors.email.invalid'` is what lets the component look the message up in the
current language. An English string returned from here would make the form
untranslatable.

`contact.ts` returns every outcome as a value and never throws. `sent`,
`unavailable`, `invalid`, `rate-limited`, and `error` with a reason of
`timeout | network | server` each get their own copy in the UI, because "we
cannot reach the server, here is our phone number" and "your message was too
long" ask completely different things of the person reading them.

### `src/hooks/`

| File | Exports |
| --- | --- |
| `useLocale.ts` | `useLocale(): { locale: LocaleCode; change: (next: LocaleCode) => void }` |
| `useMobileMenu.ts` | `useMobileMenu(): { open: boolean; toggle: () => void; close: () => void; toggleRef: RefObject<HTMLButtonElement \| null> }`: every style's phone menu. Closes on navigation (derived from the address, no effect), locks the page behind it, Escape closes it and returns focus to the toggle. A style's header uses this; it never re-implements the menu state |
| `useScrollLock.ts` | `useScrollLock(locked: boolean): void` |
| `useTheme.ts` | `useTheme(): ThemeContextValue`, throws if used outside `<ThemeProvider>`; reports the neutral theme the page was prerendered with (`system`, `light`) until hydration is done |
| `useHydrated.ts` | `useHydrated(): boolean`: false on the server and while hydrating, true from then on |
| `useVisitTracker.ts` | `useVisitTracker(): void`: reports page views and time on page to `ENV.analyticsEndpoint`. Called once, by `SiteChrome`; a style never calls it |

`useLocale().change` navigates rather than calling `i18n.changeLanguage`
directly. The URL is changed and the route's own effect brings i18next into
line. Doing it the other way round leaves the URL saying one language while the
page shows another, and that URL is what search engines index.

### `src/context/`

| File | Exports |
| --- | --- |
| `theme-context.ts` | `type ThemePreference = 'light' \| 'dark' \| 'system'`, `type ResolvedTheme = 'light' \| 'dark'`, `interface ThemeContextValue { preference; resolved; setPreference }`, `ThemeContext`, `THEME_PREFERENCES`, `isThemePreference(value: unknown): value is ThemePreference`, `themePreference(stored: string \| null): ThemePreference` (anything unrecognised is `system`), `resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme` |
| `ThemeProvider.tsx` | `ThemeProvider({ children }: { children: ReactNode })` |

`ThemeContext` defaults to `undefined` on purpose, so `useTheme` can tell "no
provider above me" from "provider with a default" and throw a useful error
instead of silently rendering an unthemed page.

`ThemeProvider` reads storage synchronously in `useState`'s initialiser, not in
an effect, and starts the resolved theme from the `data-theme` attribute already
on `<html>`. An effect runs after the first paint, which is exactly the
full-screen flash of the wrong theme. `public/theme-init.js`, loaded
synchronously from the head, covers the earlier gap, before React has started
at all; it is a file rather than an inline script because production's CSP is
`script-src 'self'`. **The storage key, the `data-theme` attribute name and the
rule (`resolveTheme`: a stored `light` or `dark` wins, anything else, blocked
storage included, follows the OS) appear in both places. Change one, change
both, in the same commit.** `context/theme-init.test.ts` runs every
combination of stored value and OS setting through both and fails the build
when they differ. They have to agree exactly: a provider that corrects the
script's answer just after hydration changes the context, and that throws
away the server markup of a lazy legal page still waiting for its code.

The context always holds the real theme. The prerendered markup was built with
none (the build has no visitor), so `useTheme` reports `system`/`light` until
hydration is done and the real values straight after. The switch is per
component, not a change of the context value, on purpose: a context change
right after hydration reaches every Suspense boundary still waiting for its
lazy chunk, and React answers by discarding that boundary's server markup.

### `src/data/` and `src/i18n/`

| File | Exports |
| --- | --- |
| `data/services.ts` | `interface ServiceEntry { key; slug }`, `SERVICES: readonly ServiceEntry[]`, `PROCESS_STEPS: readonly string[]`, `HIGHLIGHTS: readonly string[]`, `VALUES: readonly string[]` |
| `i18n/index.ts` | `NAMESPACES` (`common`, `home`, `services`, `about`, `contact`, `legal`), `type Namespace`, `resources`, and the configured i18next instance as the default export |

`data/services.ts` holds structure only. Every visible string for an entry lives
under `items.<key>` (or `highlights.items.<key>`, `values.items.<key>`,
`process.steps.<key>`) in the locale files, in all three languages.

### Components, by directory

| File | Exports |
| --- | --- |
| `components/ui/Container.tsx` | `Container({ as?, width?: 'content' \| 'prose' \| 'full', className?, children })` |
| `components/ui/Section.tsx` | `Section({ id?, tone?: 'page' \| 'sunken' \| 'raised', title?, subtitle?, align?: 'start' \| 'center', className?, children })` |
| `components/ui/Card.tsx` | `Card({ className?, children })`, `CardLink({ to, title, children, className? })` |
| `components/ui/Button.tsx` | `Button({ variant?, size?, loading?, loadingLabel?, ...ButtonHTMLAttributes })`, `ButtonLink({ to, external?, variant?, size?, className?, children })` |
| `components/ui/button-styles.ts` | `type ButtonVariant = 'primary' \| 'secondary' \| 'ghost' \| 'danger'`, `type ButtonSize = 'sm' \| 'md' \| 'lg'`, `buttonClasses(variant?, size?, className?): string` |
| `components/ui/Field.tsx` | `Input({ label, error?, hint?, required?, badge?, ...InputHTMLAttributes })`, `Textarea({ ...same, rows? })` |
| `components/ui/Alert.tsx` | `type AlertTone = 'info' \| 'success' \| 'warning' \| 'error'`, `Alert({ tone?, title, children?, className? })` |
| `components/ui/Spinner.tsx` | `Spinner({ className? })` |
| `components/layout/LocaleLayout.tsx` | `LocaleLayout({ Shell })`: validates `/:lang`, syncs i18next, renders the active style's shell |
| `components/layout/RootRedirect.tsx` | `RootRedirect()`: sends `/` to the visitor's language |
| `components/layout/SiteChrome.tsx` | `SiteChrome()`: scroll restoration, page transition, progress bar, back-to-top, WhatsApp bubble |
| `components/layout/PageTransition.tsx` | `PageTransition()`: on a client navigation, restarts the `animate-page-in` fade on `<main>` so the next page eases in instead of blinking; never on the page load, and nothing under reduced motion |
| `components/layout/ScrollProgress.tsx` | `ScrollProgress()`: renders `null` on a page shorter than the viewport |
| `components/layout/BackToTop.tsx` | `BackToTop({ raised? })`: absent until one viewport of scroll, then moves focus to `main` |
| `components/layout/WhatsAppBubble.tsx` | `WhatsAppBubble({ number? })`: renders `null` without a number |
| `components/layout/ScrollRestoration.tsx` | `ScrollRestoration()`: on a client navigation, the top of the next page, or its fragment's element (instantly when the link came from another page, so the reader never watches a fading page scroll past: no blink; smoothly within a page); never on the page load, which the browser positions |
| `components/layout/DevelopedBy.tsx` | `DevelopedBy({ className? })` |
| `components/layout/CopyrightYear.tsx` | `CopyrightYear()`: the build's year while hydrating, the visitor's after; every style's footer renders it |
| `components/layout/SkipLink.tsx` | `SkipLink()` |
| `components/ui/Icon.tsx` | `type IconName`, `Icon({ name, className?, ...SVGProps })`: inline, decorative, `aria-hidden` |
| `components/ui/Reveal.tsx` | `Reveal({ as?, delay?, stagger?, className?, children })`: IntersectionObserver entrance; content is visible without JavaScript, and prerendered content already on screen at hydration makes no entrance |
| `routes.tsx` | `buildRoutes(style: SiteStyle): RouteObject[]` |
| `styles/contract.ts` | `interface SiteStyle { id, Shell, pages: { Home, Services, About, Contact } }` |
| `styles/build.ts` | `STYLE_ID`, `UnknownStyleError`, `resolveActiveStyle({ fromEnv?, fromFile?, available })`, `transformIndexCss(code, { id, available })` |
| `styles/registry.ts` | `STYLE_MODULES`, `styleIdFromPath(path)`, `styleIds()`, `loadStyle(id)` |
| `components/layout/ThemeToggle.tsx` | `ThemeToggle()` |
| `components/layout/LanguageSwitcher.tsx` | `LanguageSwitcher({ className? })`: renders `null` when there is only one locale |
| `components/seo/Seo.tsx` | `Seo(meta: PageMeta)`, renders `null`. Computes the page's head with `pageHead()` (title, description, robots, canonical, `hreflang` alternates, Open Graph and Twitter tags, and the JSON-LD from `structuredDataFor`: Organization everywhere, WebSite on the home page, a breadcrumb elsewhere, the services on the services page; a `noIndex` page gets no canonical, alternates or `og:url`), hands it to the prerender through `HeadCollectorContext` when one is provided, and writes it to `document.head` in an effect. Every page also carries `application-name`, `apple-mobile-web-app-title` (both `SITE.shortName`), `og:image:type`, `og:locale` and an `og:locale:alternate` per other language; `og:image` is `shareImagePath()` (`/og-image.png?v=<content hash>`, so a redrawn card is a new URL for chat apps that cache by image URL). `scripts/verify-share.mjs`, the last step of `npm run build`, checks the finished pages and files. It replaces the `data-seo` tags already there rather than adding to them. |
| `components/seo/head-collector.ts` | `type HeadCollector = (head: PageHead) => void`, `HeadCollectorContext` (default `null`) |
| `entry-server.tsx` | `renderPage(page: PrerenderPage): Promise<RenderedPage>`, `siteOrigin(): string`, `crawlerFilesFor(siteUrl, rendered: { page; head }[]): ReadonlyArray<[fileName, source]>`, and re-exports `prerenderPages`, `pageDocument`, `validatePage` |
| `components/legal/LegalShell.tsx` | `LegalShell({ title, description, path, locale, children })`, `LegalSection({ title, children })` |
| `components/legal/legal-values.ts` | `legalValues(): { legalName, registrationNumber, address, email, domain, brandName }`, `LEGAL_LAST_UPDATED` |
| `components/contact/ContactForm.tsx` | `ContactForm()`: `method="post"`, and its fields are disabled until hydration is done |
| `components/contact/LocationMap.tsx` | `LocationMap()`: the contact page's Google map, shown straight away (lazy iframe over a drawn street plan) in a card with the address and an "Open in Google Maps" link; carries `MAP_ID`; renders `null` while `MAP` is null. Every style's contact page renders it |
| `components/contact/MapLink.tsx` | `MapLink({ children })`: links the footer address to the contact page's map; passes the children through unchanged while `MAP` is null. Every style's footer wraps its address in it |
| `components/ui/Photo.tsx` | `Photo({ src, alt, className?, imgClassName?, priority?, ratio? })`: fixed-ratio frame that shimmers until the file arrives, then fades it in; lazy unless `priority`; `draggable={false}`, `referrerPolicy="no-referrer"` |
| `components/ui/Lightbox.tsx` | `type LightboxPhoto = { src, alt }`, `Lightbox({ title, photos, start, onClose })`, `wrapIndex(i, n)`: pop-up gallery with arrows, keys, swipe and thumbnails; open the gallery here rather than on a separate page. Strings in `common:lightbox` |
| `components/ui/Sparks.tsx` | `Sparks({ className? })`: optional decoration for a dark hero band: slow, nearly horizontal glowing streaks from off screen bottom left, no visible source; canvas, `aria-hidden`, paused off screen, one still frame under reduced motion. Colours `--color-spark-*`; physics in `components/ui/weld.ts` (pure, tested) |
| `lib/map.ts` | `type MapConfig = { embedUrl, linkUrl }`, `googleMap(query, zoom?)`: the embed and the link for one place |

---

## Component conventions

### Props

Props are a plain inline object type on the component, destructured in the
parameter list, with defaults given there rather than inside the body. Naming is
consistent across the tree and worth matching:

- `className` is always the last visual prop and is always merged through `cn()`,
  never concatenated by hand and never ignored.
- `children` is `ReactNode`.
- `to` is a link target. `href` is not used except on a raw `<a>` for an
  off-site or `mailto:`/`tel:` target.
- Boolean props read as states, not as questions: `loading`, `required`,
  `external`, `noIndex`, not `isLoading` or `shouldIndex`.
- A variant prop is a string union with a `Record<Variant, string>` lookup, not a
  chain of ternaries. See `button-styles.ts`, `Alert.tsx`, `Section.tsx`.
- Text that a visitor reads is passed in already translated. A primitive never
  calls `useTranslation` for its own copy; the page or layout that owns the
  meaning does. The exceptions are the layout components, which own the chrome's
  copy, and `ContactForm`, which owns the form's.

`tsconfig.app.json` sets `exactOptionalPropertyTypes`, so passing
`error={undefined}` to an optional prop is a type error. That is why the code
spreads conditionally:

```tsx
{...(error !== undefined ? { error } : {})}
```

### `cn()`

`cn(...values)` joins class names and drops anything falsy. It is deliberately
not `clsx` plus `tailwind-merge`: these components compose classes rather than
override them, so conflict resolution would be 8 KB spent on a problem this
codebase does not have. If a component one day genuinely needs to override a
caller's utility, add the dependency then, and not before.

A useful side effect is that `cn(a && x, b && y) || undefined` yields either a
class string or `undefined`, which is exactly the shape `aria-describedby`
wants. `Field.tsx` uses it that way.

### How the primitives compose

The composition is intentionally shallow. A page is a stack of bands; each band
is a `Section` (or a bare `Container` for a hero); inside it are `Card`s,
`Button`s, and `Field`s.

```
Section          background tone, vertical rhythm, optional <h2> + subtitle
└── Container    max-width and horizontal gutter (content | prose | full)
    └── content  Card / CardLink / ButtonLink / Input / Alert / plain markup
```

`Section` renders its own `Container`, so do not nest one inside it. A page's
hero uses `Container` directly, because the hero owns the page's single `<h1>`
and `Section`'s heading is an `<h2>`.

`Card` is a shell. `CardLink` is a card that is entirely one link: the whole
card is the anchor rather than a "read more" inside it, so the target is big
enough to hit on a phone and there is exactly one tab stop. A card with a linked
heading *and* a nested button gives keyboard users three stops that all go to
the same place.

`Button` defaults to `type="button"`. A `<button>` inside a `<form>` defaults to
`type="submit"` in HTML, which is how a decorative button ends up submitting a
form. Submitting is an explicit choice here. `ButtonLink` stays an anchor so
middle-click and "copy link address" work.

`Input` and `Textarea` own the accessible wiring, and that is the whole reason
they exist. Do not hand-roll a labelled field.

`Alert` picks its ARIA role from its tone: `error` is `role="alert"` with
`aria-live="assertive"`, everything else is `role="status"` with `polite`. An
over-assertive live region talks over whatever the user was reading.

### Colour comes from a token, always

A component reads a **semantic** token: `--text-primary`, `--text-secondary`,
`--text-muted`, `--text-accent`, `--surface-page`, `--surface-raised`,
`--surface-sunken`, `--border-subtle`, `--border-strong`, `--fill-accent`,
`--fill-accent-hover`, `--ring-accent`.

```tsx
// Correct
<p className="text-(--text-secondary)">…</p>
<div className="bg-(--surface-raised) border border-(--border-subtle)">…</div>

// Wrong: a hex, a Tailwind palette colour, or a raw brand shade as body text
<p className="text-slate-500">…</p>
<p style={{ color: '#6659e8' }}>…</p>
```

The semantic tokens are redefined under `[data-theme='dark']`, which is what
makes a component correct in both themes without a single `dark:` class in its
markup. Reaching past them to `--color-brand-500` or `--color-ink-600` puts one
theme's colour on both themes' screens.

Reaching for a raw ramp shade is acceptable in exactly one situation: a
decorative fill or wash where you have handled both themes explicitly, as the
home page hero does with `from-(--color-brand-50) … dark:from-(--color-brand-950)`.
Text is never that situation. See [`design.md`](design.md) for which token to
pick and why.

Font sizes come from the fluid scale the same way: `text-(length:--text-lg)`,
never `text-lg` and never a rem literal.

---

## Routing

`App.tsx` imports the active style through the `@active-style` alias and passes
it to `buildRoutes` in `routes.tsx`, which calls `useRoutes`. The style supplies
the shell and the four marketing pages; the legal pages, the 404 and the
redirects are the same whichever style is active.

There are two possible shapes, chosen by `isPrefixed()` (which is simply
`LOCALES.length > 1`):

```
Multi-locale                         Single-locale
/            → RootRedirect          /        → Layout
/:lang       → LocaleLayout            index  → HomePage
  index      → HomePage                …      → the same pageRoutes
  services   → ServicesPage
  …
  *          → NotFoundPage
```

Both shapes are built from the same `pageRoutes` array, so a new page is added
in one place and works either way. Route paths inside `pageRoutes` are relative
to the layout and therefore carry no leading slash; the `relative()` helper
strips it from the `ROUTES` value so the two stay in sync automatically.

`/` is sent to the visitor's language. i18next's detector has already read the
path, local storage and `Accept-Language` by the time anything renders, so
`i18n.resolvedLanguage` is the best guess available. On a page load the
decision is made before the first paint: `public/theme-init.js` sends a
visitor whose language is not the default to `/<locale>` with
`location.replace`, hiding the page meanwhile, so nobody reads the default
language first. For the default language, `main.tsx` moves the address to
`/<default>` with `history.replaceState` before React starts
(`startupRedirect`), and the prerendered page in `#root` is hydrated.
`RootRedirect` makes the same decision (`rootLocale`) for an in-app navigation
to `/`. All of them replace rather than push, so Back from `/en` leaves the
site instead of bouncing through the redirect again.

`LocaleLayout` guards the `/:lang` segment. **The URL is the authority, not the
stored preference.** Someone opening a shared `/lv/services` link must get
Latvian even if they once chose English on this site, because otherwise the page
contradicts its own address. An unknown first segment goes through
`fallbackPath`, which keeps the page: `/services` becomes `/en/services`, and
`/de/services` becomes `/en/services`. Sending both to the home page, which is
what a naive redirect does, loses the destination in each case. A page load
never reaches it with such an address in production: the edge has already
answered it with a 301 to the same place (see "At the edge"). It is what the
dev server and an in-app navigation get.

The four legal pages are `React.lazy` chunks. They are long, rarely read, and
identical for everyone, so keeping them out of the initial bundle is free. Their
`Suspense` fallback is a blank `min-h-[60vh]` rather than a spinner: the chunks
resolve in a frame or two, and a spinner that flashes for 40 ms is worse than
nothing appearing. The prerender waits for them, so their HTML carries the
whole policy, and the browser hydrates it once the chunk arrives.

### The link rule

**Every internal link target is a `ROUTES` value wrapped in `localePath()`.**

```tsx
import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'

const { locale } = useLocale()
<ButtonLink to={localePath(ROUTES.contact, locale)}>…</ButtonLink>
```

Never write `to="/contact"`, and never assemble `` `/${locale}/contact` `` by
hand. A string literal breaks silently in the one place you forgot when a route
is renamed, and a hand-built prefix breaks entirely when the site is trimmed to
a single locale, at which point `localePath` correctly stops adding one.

An anchor into a page keeps the same shape:
`` `${localePath(ROUTES.services, locale)}#${service.slug}` ``.

---

## Prerendering and hydration

`npm run build` is three steps: `vite build` (the browser bundle and a
`dist/index.html` template), `vite build --ssr src/entry-server.tsx` (the same
app compiled for Node, into `dist-ssr/`, which is thrown away afterwards), and
`scripts/prerender.mjs`, which renders every page and writes it into `dist/`:

```
dist/<locale>/<route>/index.html   every route in every language
dist/index.html                    the default language's home page again
dist/404.html                      the not-found page, in the default language
dist/robots.txt, sitemap.xml,      with VITE_SITE_URL only: built from what
     llms.txt                      those pages' heads declare
```

Each page's `<html lang>`, its whole head (from the same `pageHead()` the
runtime `<Seo>` uses) and its body are in the file. `#root` is marked with
`data-prerendered="<locale>:<route>"` (`en:404` for the 404 page), and
`<html>` with an empty `data-prerendered`, which the dev server's
`index.html` never has.

**What fails the build.** Every page is rendered and checked before any file is
written (`validatePage` in `lib/prerender.ts`): a page that throws (inside a
Suspense boundary too), an empty `#root`, anything but exactly one `<h1>`, a
`<script>` in the body, no `<Seo>`, an empty title or description, the wrong
`lang`, and, for an indexable page, a canonical that is not its own URL or its
language's home page (the one other answer a style may give, as `long-scroll`
does), an `og:url` that differs from it, a missing `hreflang`, or an `og:image`
off the site's origin. The 404 page must be `noindex` and declare no canonical.
`src/entry-server.test.tsx` runs the same checks in the test suite.

**The crawler files come from the heads.** With an origin, the prerender then
builds `robots.txt`, `sitemap.xml` and `llms.txt` (`crawlerFilesFor` in
`entry-server.tsx`, `lib/crawler-files.ts`) from each page's declared
canonical and `hreflang`, not from `ROUTES`. A URL is listed only when its
page is its own canonical, with exactly the alternates its head declares, so
the sitemap cannot contradict a page: under `long-scroll` the sitemap and
`llms.txt` list each language's home page and the legal pages, not the three
routes that render the same document. A canonical that no page claims as its
own fails the build, since the sitemap could not lead a crawler to it.
`src/entry-server.test.tsx` builds the files from the rendered heads and holds
every URL, canonical and alternate to them, and `make verify-styles` runs it
for every style.

**One default language.** `DEFAULT_LOCALE` decides the page written as
`dist/index.html`, the 404 page's language, the i18n fallback, where an
unprefixed or unpublished-language URL is sent, and every `x-default`. The
order of `LOCALES` is only the language switcher's. `lib/default-locale.test.ts`
moves the default off the first entry and checks that all of them follow it.

**The bare `/`.** A crawler gets `dist/index.html`: a real page, the default
language's home, whose canonical is `/<default>`. A browser whose language is
another one the site publishes is sent there before the first paint, by
`public/theme-init.js`: it reads the stored choice, then the browser's
languages, exactly as i18next does, and calls `location.replace('/<locale>')`
with the page hidden and `<html data-redirecting>` set, which tells `main.tsx`
not to start React on a page that is on its way out. A crawler that runs
JavaScript reports an English browser and stores nothing, so it stays on the
page it was served. The script repeats the locale list and i18next's
matching rule, and `context/theme-init.test.ts` runs a table of stored values
and browser languages through both. Chosen over a 301 at the edge because an
edge redirect cannot see local storage, and would send a returning Latvian
visitor to English.

**Hydration.** `main.tsx` does what `startupPlan` (`lib/prerender.ts`) says:
nothing while `theme-init.js` is sending the page elsewhere; otherwise it moves
the address to its one spelling and calls `hydrateRoot` only when `#root`'s
mark equals `keyForPathname` of that address, the page it renders. Anything
else is rendered from scratch with `createRoot`: the dev server's empty
`#root`, the default-language 404 page served for `/lv/nope`, and the root
page for a visitor sent to another language when `theme-init.js` could not
send them first.

The 404 page is the one case where the served markup is in another language
than the address. There is one `404.html`, in the default language, so
`theme-init.js` hides any prerendered page (`<html data-prerendered>`) whose
address names a published language other than its `<html lang>`, and
`main.tsx` shows it again once it has rendered the not-found page in the
address's language (synchronously, with `flushSync`, so the old markup is
never on screen again). The script carries each language's `htmlLang` for
that comparison, since it need not be the code, and
`context/theme-init.test.ts` holds its lists to `site.ts`. The marker is what
keeps the dev server out of it: its `index.html` is `lang="en"` at every
address, so without it every `/lv` and `/ru` page would start hidden, and a
compile error, which stops `main.tsx` from running, would leave Vite's error
overlay hidden with the page.

Nothing stays hidden for long. Whichever of the two reasons hid the page (the
language, or the bare `/` on its way to the visitor's language), the script
shows it again after `HIDDEN_PAGE_TIMEOUT_MS` (3 s, `config/constants.ts`)
whatever happened. A bundle that failed to load or was blocked leaves the
404 page in the default language rather than a blank one. A redirect from
the bare `/` that never lands (a 204, the visitor pressed Stop) shows what
the browser had parsed; Chromium stops parsing the page when the redirect
starts, so there it is empty either way. On a normal load `main.tsx` has
shown the page long before.

Hydration reuses the server markup only if the browser's first render is
identical, so:

- The tree in `main.tsx`, `entry-server.tsx` and `hydration.test.tsx` is the
  same, provider for provider. Change all three together.
- Nothing the server cannot know may change the first render. The theme comes
  through `useTheme` (see above). Today's date comes through `CopyrightYear`.
  Local storage is read in effects or event handlers, never in render.
  `LegalShell` formats its date in UTC, with `suppressHydrationWarning` for the
  one string Node's and the browser's locale data may spell differently.
- The address takes its one spelling before React starts (`startupRedirect`):
  `/lv/about/` and `/lv/about/index.html` become `/lv/about`, `/index.html`
  is the bare root, and repeated leading slashes collapse to one. The edge
  (and `make preview`) answers those spellings with a 301 before any page is
  served, so in production this only ever moves the bare `/`; it is still
  needed on the dev server and on any other host that serves a page's file
  at them. The router treats them as different addresses (at
  `.../index.html` it finds no route and shows the 404), and `//host/` is a
  scheme-relative URL that `history.replaceState` refuses, which stopped
  React from starting at all.
- What the reader already has is left alone. The page is on screen and
  usable for scrolling before React is, so `ScrollRestoration` does not move
  the window when it mounts, and a `Reveal` that is on screen at hydration
  makes no entrance (its animation starts from opacity 0). What cannot work
  before React does not pretend to: the contact form's fields stay disabled
  until `useHydrated()` is true, and the form is `method="post"`, so a native
  submit can never put the visitor's details in a URL.
- React outlines a large Suspense boundary behind an inline script unless told
  not to; `renderPage` sets `progressiveChunkSize` to infinity, because the CSP
  blocks inline scripts and a crawler runs none.

`src/hydration.test.tsx` prerenders a sample in a separate Node process (as the
build does) and hydrates it in jsdom as `main.tsx` does; any recoverable error,
console error or replaced `<h1>` fails it. `make verify-styles` runs it, the
prerender test and the build against every style.

**At the edge.** A CloudFront Function (`infrastructure/terraform/functions/viewer-request.js`)
does two things before the cache is asked. Every other spelling of a page's
address gets a 301 to the one address, query string kept, so no visitor or
crawler needs JavaScript to reach it: `//en//about`, `/en/about/` and
`/en/about/index.html` go to `/en/about`, `/index.html` to `/`, and an
address that names no published language (`/services`, `/de/services`) goes
where `fallbackPath` sends it, `/en/services`. Those used to be answered with
the 404 page and a 404 status, which a crawler never looks past. Then each
page's address is pointed at its file (`/lv/about` to `/lv/about/index.html`),
and a missing key is answered with `404.html` and a real 404 status. The bare
`/` is served, not redirected: an edge redirect cannot see local storage (see
"The bare `/`" above).

Every one of those 301s carries `Cache-Control: public, max-age=3600`. A 301
without it may be kept by a browser for ever, and these depend on `LOCALES`
and `DEFAULT_LOCALE`: after either changes, a returning visitor would keep
being sent where the site used to send them. An hour bounds that. The
function answers before CloudFront's cache is asked, so the header is what
browsers (and any proxy on the way) go by; `make preview` sends the same one.

The function repeats `LOCALES`, the default first, and `fallbackPath`'s rule.
`scripts/viewer-request.test.mjs` holds its list to `site.ts` and every
redirect to `fallbackPath`'s answer, so a changed language list fails the
build until the function has it too.

`make preview` runs the same function file in front of `vite preview` (the
`edge-preview` plugin in `vite.config.ts`, deciding through
`lib/edge-preview.ts`), so a local check of the build answers exactly as
production does, 301s and 404s included.

A cache behaviour takes one viewer-request function, and this is it. Anything
else that must happen before CloudFront looks up the object (the 301s of a
site migration, say) goes into the same file, first in the handler, with a
case in `scripts/viewer-request.test.mjs`; a second function cannot be
attached. The function ships with the infrastructure: a change to it goes
live on the next Terraform Infrastructure run, not on a deploy.

Outside prod, the response headers policy in `main.tf` also sends
`X-Robots-Tag: noindex, nofollow` on every response, HTML or not, so only the
production site can be indexed. `robots.txt` cannot do that job: a disallowed
URL can still be indexed from a link to it.

---

## Internationalisation

**Namespaces are one per page, plus `common` for the chrome.** The list lives in
`i18n/index.ts` as `NAMESPACES`: `common`, `home`, `services`, `about`,
`contact`, `legal`.

Use `useTranslation('<ns>')` and plain keys:

```tsx
const { t } = useTranslation('about')
<h1>{t('hero.title')}</h1>
```

**Never write a `ns:` prefix inside a component.** `t('common:nav.home')` works
at runtime and is still wrong: it makes a key impossible to find by grep from
its namespace, and it routes around the discipline the parity test relies on.
When a component genuinely needs two namespaces, take two `t` functions and name
them for what they are, the way `HomePage` does:

```tsx
const { t } = useTranslation('home')
const { t: tc } = useTranslation('common')
const { t: ts } = useTranslation('services')
```

**The three locales of a namespace must stay key-identical.**
`i18n/parity.test.ts` walks `LOCALE_CODES` and every namespace and fails the
build on a key that exists in one language and not another, so adding a key to
`en` alone cannot reach production. It also checks two things that are easy to
lose in translation: every `{{placeholder}}` in the reference string must appear
in the translated one, and no value may be an empty string. A translator who
drops `{{email}}` produces a sentence that silently omits the address it was
meant to give.

All locales are bundled rather than fetched. Three languages of JSON is a few
tens of kilobytes; a round-trip per language means a visible flash of raw keys
on first paint and a broken page whenever that request fails.

### The `<1>` tag convention

The consent checkbox needs a link inside a translated sentence. The locale
string marks it with a numbered tag:

```json
"consent": "I have read the <1>privacy policy</1> and agree that my details will be used to answer this enquiry."
```

and the component supplies the components positionally:

```tsx
<Trans
  t={t}
  i18nKey="form.consent"
  components={[
    <span key="0" />,
    <Link key="1" to={privacyHref} className="…" />,
  ]}
/>
```

react-i18next indexes the `components` array **from 0**, so `<1>` is the
*second* element. The leading `<span />` is a placeholder that makes the
numbering line up. Drop it and the link renders as plain text, in every language
at once, which is how a consent checkbox quietly stops linking to the policy it
references. `parity.test.ts` asserts that `<1>` and `</1>` survive in every
locale for exactly this reason.

Numbered tags rather than named ones because that is what `<Trans>` produces
when you let it, and a translator can move the tag within the sentence without
understanding React.

---

## The testing bar

Vitest, jsdom, tests beside the code as `*.test.ts(x)`. Run them with
`make test`, or `make coverage` for the thresholds.

**Coverage thresholds, enforced in `vite.config.ts`:**

| Metric | Threshold |
| --- | --- |
| Statements | 80 % |
| Lines | 80 % |
| Functions | 80 % |
| Branches | 75 % |

These fail the build. Raise them as coverage improves; never lower one to go
green. `src/main.tsx`, `src/vite-env.d.ts`, `src/test/**`, the test files
themselves and `src/i18n/locales/**` are excluded from the measurement, the
locale JSON because it holds no logic and the parity test already covers what
matters about it.

**Every `lib/` function is pure and should be tested exhaustively.** That is the
point of keeping the DOM out of them. `contact`, `crawler-files`, `crawlers`,
`edge-preview`, `head`, `llms`, `locale-path`, `placeholder`, `prerender`, `rateLimit`, `seo`,
`storage`, `structured-data` and `validation` each have a `.test.ts` beside them.

The image scripts in `scripts/` are tested the same way, beside the code:
`scripts/lib/og-layout.test.mjs` proves every box on the share card stays
inside the central square for short, long, Latvian and Russian headlines (and,
for the photo card, for wide, tall and tiny photos), `scripts/lib/share-card.test.mjs`
composites a fixture hero in a temp dir and holds the card to its size budget,
`scripts/generate-images.test.mjs` checks the committed PNGs and ICO, and
`scripts/verify-share.test.mjs` builds a small correct `dist/` and breaks it one
rule at a time (the share guard, `scripts/verify-share.mjs`).
`scripts/prerender.test.mjs` covers the prerender's file handling (nothing is
written unless every page passed), and `scripts/viewer-request.test.mjs`
evaluates the CloudFront Function as CloudFront runs it: it finds the file the
build wrote for every page, and sends every other spelling of every page, and
every address with no published language, where `fallbackPath` would.
`lib/edge-preview.test.ts` runs `make preview`'s answers through the same file.
`cn.ts` currently has none, and is the one gap worth closing if you touch it.

`rateLimit`'s functions take `now` as an argument rather than reading the clock
inside. That is deliberate: behaviour at a window boundary is testable without
waiting ten real minutes. Keep new time-dependent code the same shape.

**Component tests go through `src/test/render.tsx`:**

```tsx
import { renderWithProviders } from '@/test/render'

renderWithProviders(<ContactForm />)
renderWithProviders(<App />, { route: '/lv/services' })
```

`renderWithProviders` wraps the tree in `I18nextProvider`, `ThemeProvider` and
`MemoryRouter` (default entry `/en`). A test that renders a component bare
passes while the real page throws, because anything reaching for a router, a
theme or a translation blows up outside its provider.

`src/test/setup.ts` runs before each test: it stubs `matchMedia` (jsdom has
none, and `ThemeProvider` calls it on mount), stubs `scrollTo`, clears local
storage, and resets the language to `en`. Do not duplicate that setup in a test
file, and do not leave global state behind: a suite that passes alone and fails
in CI is nearly always a test that changed the language or wrote a storage key
and did not clean up.

What earns a test, in rough priority order: every `lib/` function, every failure
path of the contact form, every route rendering its `h1`, and every legal page
rendering real copy rather than raw translation keys. The unhappy paths matter
most. A form that silently does nothing loses the enquiry and the customer.

Mock at the seam, not at `fetch`. `ContactForm.test.tsx` mocks
`@/lib/contact`, because `lib/contact.test.ts` already proves the mapping from
HTTP responses to `ContactResult`; what is under test in the component is what
the form *does* with each result. It also avoids `vi.resetModules()`, which
loads a second copy of react-i18next and quietly breaks context lookups.

---

## The accessibility bar

Every one of these is a requirement, not an aspiration. Most are already
implemented by the primitives, which is the main reason to use them.

**One `<h1>` per page, in the hero.** `Section`'s optional heading renders as an
`<h2>` for exactly this reason, and `CardLink` renders its title as an `<h3>`
because a card almost always sits inside a titled `Section`. A plain `Card`
leaves the heading level to the caller, so choose it from the context: `<h3>`
under a `Section` that has a title, `<h2>` under one that does not, which is
what `ServicesPage` does. Skipping a level or shipping two `<h1>`s makes a
screen reader's document outline useless.

**A skip link, first in the tab order.** `SkipLink` targets
`MAIN_CONTENT_ID`, and `Layout`'s `<main>` carries `tabIndex={-1}` so focus can
actually land there. Without the `tabIndex` the link scrolls but focus stays in
the header and the next Tab goes back to the navigation. Without the link, a
keyboard user tabs through the entire header on every page.

**Focus is always visible.** One `:focus-visible` treatment is defined in
`index.css` for the whole site and works on every surface in both themes.
Removing an outline without replacing it makes the site unusable by keyboard.
Do not.

**4.5:1 contrast for text**, and 3:1 for focus indicators and other non-text UI.

Do not choose an accent step by eye. `brand-500` is neither accent text nor a
fill behind white text: it measures 3.06:1 to 3.58:1 on white depending on hue.
Accent text uses `--text-accent` (brand-700 light, brand-400 dark), the button
uses `--fill-accent` with its label in `--text-on-accent`, and the focus ring
uses `--ring-accent` (brand-600 light).

`src/index.contrast.test.ts` computes every one of those ratios from the token
definitions in `index.css`, at all six brand hues the docs offer, and fails the
build when one misses the bar. It is not documentation: it is the check.
[`design.md`](design.md#the-measured-ratios) has the measured table.

**44 px minimum touch targets.** Buttons carry `min-h-11`; the header's icon
buttons are `h-11 w-11`; mobile nav rows are `min-h-12`. Smaller than that and a
real thumb misses.

**Errors are tied to their field.** `Input`/`Textarea` give the control
`aria-invalid`, point `aria-describedby` at the message, and mark the message
`role="alert"` so it is announced when it appears after a submit. After a
rejected submit, focus moves to the first invalid field, which is what
`ContactForm`'s `focusTarget` effect does.

**Colour is never the only signal.** Each `Alert` tone carries its own icon and
its own heading text as well as its own colour, so the meaning survives a
monochrome screen and the roughly 8 % of men with a colour vision deficiency.

**Both themes, always.** Anything you add must be legible in light and dark.
That is free if you use the semantic tokens and expensive if you do not.

**Motion respects `prefers-reduced-motion`.** `index.css` reduces every
animation and transition to 0.01 ms under that query and turns off smooth
scrolling. Programmatic scrolls use `behavior: 'instant'`, because animating a
journey the visitor did not ask for is disorienting. A link to a fragment is
one the visitor did ask for: `ScrollRestoration` brings its element into view
the way the stylesheet says (`scroll-behavior`, `scroll-padding`), which the
reduced-motion query turns off.

**Language is announced correctly.** Every prerendered page carries its
language in `<html lang>`, and `Seo` keeps `document.documentElement.lang` in
step as the visitor navigates. Left at `en` on a Latvian page, the text is read aloud
by an English synthesiser and is close to unintelligible.

---

## File size

| | |
| --- | --- |
| Typical | 200–400 lines |
| Hard ceiling | 800 lines |
| A component file | under ~200 lines |

Split *before* you cross a line, not after. The point is not the number, it is
that a file which does one thing can be read in one sitting and changed without
fear.

The template currently holds one exception:
`components/contact/ContactForm.tsx` is 403 lines, because it carries the form's
state machine plus `StatusMessage` and `ConsentCheckbox`. If you are extending
it, extract those two first.

When a file is heading for the ceiling, the split that usually works is the one
already used elsewhere here: pull the pure part out into `lib/` (as
`lib/seo.ts` is to `components/seo/Seo.tsx`), or pull the class recipe out into
a sibling module (as `button-styles.ts` is to `Button.tsx`). Both leave
something testable without a DOM.
