# Content

The day-to-day guide: replacing the placeholders, changing the text, adding a
page, and the commands that keep the generated files honest.

Everything here is inside `services/frontend/website/` unless a path says
otherwise. Run `make verify` before you commit; it is exactly what CI runs.

---

## The placeholder checklist

The template ships with values that are deliberately, visibly fake. Every one of
them is on screen for customers, and a plausible-looking fake on a legal page is
a real problem rather than a cosmetic one.

Work through this list before anyone outside the team sees the site.

### `src/config/site.ts`

| Constant | Field | Ships as | Notes |
| --- | --- | --- | --- |
| `SITE` | `name` | `Dod ar prieku` | Replaced by `bin/init-site.sh --brand`. Shown in the header, the footer, the `<title>` suffix, and the Organization structured data. |
| | `shortName` | `Dod ar prieku` | Used where the brand needs qualifying. |
| | `domain` | `example.com` | Display only, shown in the footer's bottom bar. `bin/init-site.sh --domain` sets it. The canonical URL comes from `VITE_SITE_URL`, not from here. |
| | `country` | `LV` | Two-letter code for the structured data's `addressCountry`. |
| `CONTACT` | `email` | `hello@example.com` | Footer, contact page, company page, structured data, and the legal pages' "how to reach us". |
| | `phone` | `+371 20 000 000` | The number a customer dials. **This is the one to fix first:** the contact page shows it, and the fallback banner points people straight at it when the form is unconfigured. |
| | `phoneE164` | `+37120000000` | The `tel:` href. Digits and a leading `+`, no spaces. Must be the same number as `phone`. |
| | `whatsapp` | `37120000000` | Digits only, no `+`. Unused by the shipped pages; wire it up or delete it. |
| | `address.street` | `Example street 1` | Footer `<address>`, contact page, structured data. |
| | `address.city` | `Rīga` | |
| | `address.postalCode` | `LV-1010` | |
| | `address.country` | `Latvia` | |
| | `hours.weekdays` | `09:00–18:00` | Contact page. `null` renders as the translated "closed". |
| | `hours.saturday` | `10:00–15:00` | |
| | `hours.sunday` | `null` | |
| `SOCIAL` | `facebook`, `instagram`, `linkedin` | `''` | Empty means hidden: `activeSocial()` filters them out and the footer's social list disappears entirely. Fill in only the ones that exist. |
| `COMPANY` | `legalName` | `SIA "Example"` | |
| | `registrationNumber` | `40203XXXXXX` | |
| | `vatNumber` | `LV40203XXXXXX` | |
| | `iban` | `LV00XXXX0000000000000` | |
| | `bank` | `''` | |
| | `registeredAddress` | `Example street 1, Rīga, LV-1010, Latvia` | |

**Two safety nets exist, and neither is permission to leave a placeholder in
place.**

One function decides what is still a placeholder: `isPlaceholder()` in
`src/lib/placeholder.ts`. It flags an empty value, a run of three or more
capital `X`, the word "example" (`example.com`, `hello@example.com`,
`Example street 1`, `SIA "Example"`), and six or more zeros at the end of a
number (`+371 20 000 000`).

`src/pages/legal/CompanyPage.tsx` prints the translated "not published" instead
of any value it flags. The structured data (`src/lib/structured-data.ts`) and
`llms.txt` (`src/lib/llms.ts`) leave the field out entirely, because a
placeholder phone number or registration number in machine-readable markup is a
false statement about a real company that search engines and AI assistants will
repeat.

The patterns lean towards hiding: a false positive hides a real value, a false
negative publishes a fake. If a genuine value trips one (a phone number that
really ends in six zeros), the fix is in `placeholder.ts` and its test, not a
second guard somewhere else.

The locale files ship with **instructions** where the copy goes, not copy:
the home page's `meta.description` is "Replace this with one sentence
describing what the business does...", each service's `body` is "Describe the
service in three or four sentences...", in all three languages.
`isPlaceholderCopy()` in the same file recognises them by their opening words
(`TEMPLATE_INSTRUCTIONS`), and only by those, so real prose that says "for
example" or "Describe the problem" is never taken for one. Until they are
replaced, the Organization's `description`, each Service's `description` and
the `llms.txt` summary and page notes leave them out: a service is described
by its `summary` alone, and a page is linked with no note. The page itself,
its meta description and the share card still show them, which is the
reminder to write the copy. Adding or rewording an instruction in the
template's locale files means updating `TEMPLATE_INSTRUCTIONS` and the verbatim
list in `placeholder.test.ts`.

### `index.html`

`index.html` is the template for every page the build writes. `npm run build`
prerenders each route in each language into its own HTML file with its own
title, description, canonical, share card and structured data, taken from the
locale files, so a shared link to `/lv/about` renders with the Latvian about
page's title. The static tags here are the dev server's default and the home
page's; keep them right anyway. Replace:

- `<title>` and `<meta name="description">`
- `og:site_name`, `og:title`, `og:description`, `og:image:alt`, and the two
  `twitter:` copies

They must match the home page in the default locale: `<title>` and the two card
titles are `"<home meta.title> · <SITE.name>"`, the descriptions are its
`meta.description`. `src/components/seo/static-head.test.ts` fails the build
when they drift. Every tag `<Seo>` also writes carries `data-seo`, so the app
replaces it on the first render instead of adding a second description beside
it; keep the attribute on anything you add to that block.
They cannot be translated, so write them in the language most of your inbound
links will be shared in.

### `public/`

| File | Ships as | Replace with |
| --- | --- | --- |
| `public/favicon.svg` | A generated placeholder: the brand name's first letter, white, on a rounded square of brand-500 (carries `data-placeholder="true"`) | The real logo mark. Keep it an SVG, keep it square, keep it legible at 16 px. Every raster below is drawn from it. |
| `public/favicon.ico` | 16, 32 and 48 px, generated | Regenerate. Crawlers request `/favicon.ico` by name whatever the HTML says. |
| `public/favicon-96x96.png` | 96×96 generated | Regenerate. The favicon Google Search uses. |
| `public/og-image.png` | 1200×630 generated card: logo, brand name, headline, all inside the central square, under 200 KB | Regenerate after the logo, brand name or `hero.title` changes. For a photo card, drop `assets-src/share-hero.png` in place first (see [Setting the real logo, hero photo and share card](#setting-the-real-logo-hero-photo-and-share-card)). |
| `public/logo.png` | 512×512 generated | Regenerate. `Organization.logo` in the structured data. |
| `public/icon-192.png` | 192×192 generated | App icon, from `site.webmanifest`. |
| `public/icon-512.png` | 512×512 generated | App icon. |
| `public/icon-maskable-512.png` | 512×512 generated, logo inside the central 56% | Android adaptive icon. |
| `public/apple-touch-icon.png` | 180×180 generated | iOS home-screen icon. |
| `public/site.webmanifest` | `name`, `short_name`, `description`, `theme_color`, `background_color` | The real brand values. `theme_color` paints the mobile address bar before any CSS loads. |
| `public/robots.txt` | Allows every crawler, names no sitemap | Nothing. It is the fallback for a build without `VITE_SITE_URL`; a build with one writes its own (see [Crawler files](#crawler-files-robotstxt-sitemapxml-llmstxt)). A test holds it equal to `robotsTxt({ siteUrl: '' })`. |

The PNGs and the ICO are generated by `npm run images` (see [Images](#images)
below). They exist so that nothing 404s before real artwork does: a manifest
icon that 404s makes "add to home screen" fail silently, and a missing
`og:image` makes every shared link render as a bare grey box.

---

## Changing text

**Every visible string is in a locale file.** If you find yourself typing an
English sentence into a `.tsx` file, stop; it belongs in JSON.

Locale files live in `src/i18n/locales/<code>/<namespace>.json`, three languages
by default:

```
src/i18n/locales/
├── lv/  ← the default and reference locale (DEFAULT_LOCALE)
├── en/
└── ru/
```

### The namespaces

Namespaces are one per page, plus `common` for the chrome. The list is
`NAMESPACES` in `src/i18n/index.ts`.

| Namespace | Holds |
| --- | --- |
| `common` | Navigation labels, legal link labels, calls to action, the footer, theme and language switcher labels, the accessibility strings (`a11y.*`), the 404 page, and the contact-detail labels used on the contact page and in the footer. |
| `home` | The home page: hero, the three highlight cards, the services teaser, the about teaser, the closing call to action, and its `meta.title` / `meta.description`. |
| `services` | The services page: hero, one block per entry under `items.<key>`, the three process steps, the closing call to action, and its meta. |
| `about` | The about page: hero, the story block, the values under `values.items.<key>`, the closing call to action, and its meta. |
| `contact` | The contact page and the whole form: labels, placeholders, the consent sentence, every status message (`status.*`), and every validation error (`errors.*`). |
| `legal` | All four policy pages: privacy, cookies, terms, company details. |

Finding the right file is usually one grep for the visible sentence. Finding the
right *key* from a component is the reverse: the component calls
`useTranslation('<ns>')` and then `t('some.key')`, so the namespace is at the
top of the file and the key is at the call site.

### The key-parity rule

**The three locales of a namespace must hold exactly the same keys.**

`src/i18n/parity.test.ts` enforces it and fails the build otherwise. It checks
four things for every namespace, against the default locale as reference:

1. Every configured locale is present in `resources`.
2. No locale is missing a key the reference has, and no locale has a key the
   reference does not.
3. Every `{{placeholder}}` in a reference string appears in the translated one.
4. No value is an empty string.

That test exists because of the single most common i18n failure: a key added to
one language, which renders in that language for the rest of the audience and is
noticed months later by a customer rather than by the team. Now it fails at
`make verify` instead.

Checks 3 and 4 are about the same class of mistake. A translator who drops
`{{email}}` produces a sentence that silently omits the address it was supposed
to give, and an empty string renders as nothing at all, which looks like a
layout bug rather than a missing translation.

There is also a specific test for the consent checkbox: the string
`contact.form.consent` must keep its `<1>` and `</1>` tags in every language,
because those mark the privacy-policy link. Lose them and the checkbox stops
linking to the policy it references, in that language only.

### Adding a key

Add it to **all three files at once**, or the build fails:

```
src/i18n/locales/en/about.json
src/i18n/locales/lv/about.json
src/i18n/locales/ru/about.json
```

Then use it with a plain key and no namespace prefix:

```tsx
const { t } = useTranslation('about')
<p>{t('story.body')}</p>
```

Never write `t('about:story.body')` inside a component. It works at runtime and
is still wrong: it makes the key impossible to find from its namespace and it
routes around the discipline the parity test relies on. A component that needs
two namespaces takes two `t` functions:

```tsx
const { t } = useTranslation('home')
const { t: tc } = useTranslation('common')
```

Interpolation uses double braces, and the values are passed at the call site:

```json
{ "controller": { "body": "The controller is {{legalName}}, {{address}}." } }
```

The legal pages get their values from `legalValues()` in
`src/components/legal/legal-values.ts`, so the company name and registration
number appear in `config/site.ts` once instead of twelve times across three
languages, where they would inevitably drift.

---

## Writing the copy well

**Write each primary market language natively.** For a Latvian business, the
Latvian copy is not a translation of the English; it is the copy, and the English
is the one derived from it. Copy that has been translated word by word from
English reads as translated, and a customer who can tell is a customer who
trusts you slightly less. Write the sentence a Latvian speaker would write, then
make the other languages say the same thing in their own idiom, not in the same
word order.

The default locale (`lv` as shipped, Harry 2026-11-06: every HA Group site is
Latvian first) is also the *reference for key parity*. Write it first, natively,
and the other languages after it, each natively too.

Practical rules that hold in every language:

- **Proper nouns stay untranslated.** Product and model names, people's names,
  place names as the business writes them, and the brand itself. A car described
  as a "Volkswagen Golf" is a Volkswagen Golf in all three files. These belong in
  the data files (`src/data/services.ts`, or a JSON data file) rather than in
  the locale files, precisely so nobody translates them by accident.
- **Match the register the business actually uses.** Latvian and Russian both
  have a formal/informal distinction that English does not; pick one per language
  and hold it across every page, including the error messages.
- **Keep meta descriptions under about 155 characters.** `truncateDescription()`
  in `lib/seo.ts` trims at a word boundary beyond that, but a sentence written to
  fit reads better than one that was cut.
- **Error messages say what to do**, not what went wrong. "Enter an email address
  like name@example.com" beats "Invalid email".
- **The legal pages are not marketing copy.** Plain, specific, and accurate. If a
  claim in them is not true of the deployed site, the fix is in the code.
- **Do not put the legal entity in marketing copy.** It belongs on the company
  page, in the footer's bottom bar, and inside the body of the legal pages.

---

## Adding a page

The full checklist. Miss step 4 and the page exists but is unreachable; miss
step 5 and it renders raw translation keys.

1. **The component.** `src/pages/MyPage.tsx`, exporting a named component. It
   renders exactly one `<h1>`, and a `<Seo>` with its own title, description,
   path and locale:

   ```tsx
   export const MyPage = () => {
     const { t } = useTranslation('my')
     const { locale } = useLocale()

     return (
       <>
         <Seo
           title={t('meta.title')}
           description={t('meta.description')}
           path={ROUTES.my}
           locale={locale}
         />
         <Container className="py-16 sm:py-24">
           <h1 className="text-(length:--text-4xl) text-(--text-primary)">
             {t('hero.title')}
           </h1>
         </Container>
       </>
     )
   }
   ```

2. **The route.** Add it to `ROUTES` in `src/config/site.ts`. Never write the
   path as a string literal anywhere else.

3. **Navigation, if it belongs there.** Add `{ to: ROUTES.my, labelKey: 'nav.my' }`
   to `NAV_LINKS` (or `LEGAL_LINKS` for a policy page), then add `nav.my` to
   `common.json` in **all three** languages. `NAV_LINKS` drives the desktop nav,
   the mobile menu and the footer's site column at once.

4. **The route table.** Add an entry to `pageRoutes` in `src/App.tsx`:

   ```tsx
   { path: relative(ROUTES.my), element: <MyPage /> },
   ```

   Keep it above the `{ path: '*' }` catch-all. `relative()` strips the leading
   slash, because these paths are relative to the layout. A rarely-read page can
   be `lazy` + `withSuspense(...)` the way the legal pages are.

5. **The copy.** Either add keys to an existing namespace, or create a new one:
   add `'my'` to `NAMESPACES` in `src/i18n/index.ts`, create
   `src/i18n/locales/{en,lv,ru}/my.json`, and add the three imports and the three
   `resources` entries. All three locales, or the parity test fails.

6. **The crawler files.** Add the route's key to `PAGE_META` in
   `src/lib/llms.ts`, pointing at its `meta.title` and `meta.description`. A
   route in `ROUTES` without an entry there is a type error. The build then
   lists the page in `sitemap.xml` and `llms.txt` on its own, because both are
   built from the pages it prerenders, as long as the page's `<Seo>` names its
   own path as canonical. It also prerenders it, into
   `<locale>/my/index.html` for every locale, and fails if the page throws,
   renders anything but one `h1`, or leaves out `<Seo>`. Whatever the page
   shows on its first render must not depend on local storage, the date or the
   window: the browser has to produce the same markup to hydrate it.

7. **A test.** Add the route to the `it.each` table in `src/App.test.tsx` so the
   page is proved to render its `h1` at its real URL. That single line catches a
   page that throws on mount and a locale prefix that never reaches i18next.

Then `make verify`.

---

## Adding a service, highlight, or value

These four lists are structure only; the words are in the locale files. Adding
an entry is always the same two steps, and the parity test fails the build if
you do the first without the second.

| What | Add to | Then add, in `en`, `lv` and `ru` |
| --- | --- | --- |
| A service | `SERVICES` in `src/data/services.ts`, as `{ key, slug }` | `items.<key>.title`, `items.<key>.summary`, `items.<key>.body` in `services.json` |
| A process step | `PROCESS_STEPS` in the same file | `process.steps.<key>.title`, `process.steps.<key>.body` in `services.json` |
| A home-page highlight | `HIGHLIGHTS` | `highlights.items.<key>.title`, `highlights.items.<key>.body` in `home.json` |
| An about-page value | `VALUES` | `values.items.<key>.title`, `values.items.<key>.body` in `about.json` |

A service's `key` is what the translation lookup uses; its `slug` is the anchor
id, so the home page can link to `/en/services#consulting` and land on that
block. They are usually the same word, and they do not have to be.

The order of each array is the order on the page. Removing an entry means
removing its keys from all three locale files as well, or the parity test will
pass (the keys are still identical across languages) while the site carries dead
copy nobody sees.

The home page renders `SERVICES` as a grid of two, and the services page as a
grid of two on large screens; the highlights and values render as three across.
An odd count leaves a gap, which is a design decision rather than a bug, but
worth looking at.

---

## Images

Two caching regimes, decided by where the file ends up in the build. Understanding
which one applies is the difference between "the new logo is live" and "the new
logo is live for anyone with an empty cache".

| Location | Cache-Control | Meaning |
| --- | --- | --- |
| `dist/assets/*` (content-hashed by Vite) | `public, max-age=31536000, immutable` | A URL names one exact build forever. Safe to cache for a year, because a change produces a new filename. |
| Everything else in `dist/` (copied from `public/`, or written by the build) | `public, max-age=3600, must-revalidate` | Fixed names: `favicon.ico`, `favicon.svg`, `og-image.png`, `logo.png`, `site.webmanifest`, `theme-init.js`, and the build's `robots.txt`, `sitemap.xml`, `llms.txt`. Revalidated hourly. |
| Every prerendered page: `dist/index.html`, `dist/404.html`, `dist/<locale>/<route>/index.html` | `public, max-age=60, s-maxage=300` | Uploaded after every asset, root `index.html` last; they are the only files naming the new hashes. |

So: **anything imported from `src/` is hashed and instantly safe to change.
Anything in `public/` keeps its name, and a replacement takes up to an hour to
reach a returning visitor** even after the CloudFront invalidation the deploy
runs. That is the trade-off for having a stable `/og-image.png` file that social
platforms can cache; marking it immutable would keep a replaced image off
people's screens for a year. The head does not name the bare file: it names
`/og-image.png?v=<8 hex digits of its content>` (`shareImagePath` in
`src/lib/seo.ts`, hash from `vite.config.ts`), because WhatsApp, iMessage and
Telegram cache a link's card for days keyed on the image URL. Redraw the card,
deploy, and the next build names a new URL, so the next share fetches the new
card. A link that was already shared keeps what the chat app cached.

An image that belongs to a component (a hero photograph, an illustration) should
be imported from somewhere under `src/` so that Vite hashes it. There is no
`src/assets/` directory in the template; create one when you need it. Only files
that need a fixed, externally-referenced URL belong in `public/`.

### Setting the real logo, hero photo and share card

Three inputs, one command. Everything else in `public/` is drawn from them.

1. **The logo.** Replace `public/favicon.svg` with the real mark: square, an SVG,
   legible at 16 px, with its own contrasting ground (the icons put it on the
   brand colour, the card on a light plate). Without the
   `data-placeholder="true"` attribute the script never touches the file again.
   While the attribute is there, the script redraws the placeholder as the brand
   name's first letter, so a new `SITE.name` gives a new letter.
2. **A hero photo (optional).** Put `share-hero.png`, `share-hero.webp` or
   `share-hero.jpg` in `services/frontend/website/assets-src/` (create the
   folder). The share card then uses the PHOTO layout: the image, contained and
   centred (never cropped or stretched) with a soft shadow, and the brand name
   beneath it, all inside the middle 630 px square. A transparent cut-out works
   and its shadow follows the outline. Use at least 1000 px on the long side, a
   product shot or a portrait rather than a wide landscape (a 3:1 image comes
   out small in a square), and keep it simple: the card must stay under
   200 KB, and the script fails above 300 KB. Delete the file to go back to the
   wordmark layout (logo, brand name, headline).
3. **The words.** `SITE.name` in `src/config/site.ts`, the brand hue in
   `src/index.css`, and `hero.title` in the default locale's `home.json` (the
   wordmark layout's headline; the photo layout does not draw it).

Then:

```bash
npm run images        # or: make images
```

and open `public/og-image.png`, `public/icon-512.png` and `public/favicon-96x96.png`
and look at them. Commit the regenerated files with the change. The script
prints the card's size; `npm run build` fails if it is over 300 KB or any other
share rule is broken (see [the share guard](#the-share-guard)).

### The share guard

`npm run build` ends with `scripts/verify-share.mjs`, which reads the finished
`dist/` and fails on anything that would give a bad tab or a bad link preview:
every page's title (60 characters at most), description (50 to 160), Open Graph
and Twitter tags, `og:locale` and its alternates, an absolute https `og:image`
with its dimensions, alt text and type; the card itself (exists, exactly
1200×630, PNG or JPEG, opaque, at most 300 KB); the apple touch icon, the
favicon set, every manifest icon at its declared size, and the manifest's name
matching the site. Its own tests are `scripts/verify-share.test.mjs`.

The template's placeholders (the "Replace this..." copy, the placeholder
favicon) are a **warning** by default, so the template and every new site can
be deployed for review. A site that has real copy and a real logo turns them
into failures: set the repository variable `SHARE_STRICT` to `1` (GitHub:
Settings, Secrets and variables, Actions, Variables), or run
`SHARE_STRICT=1 npm run build` locally. A relative `og:image` (a build without
`VITE_SITE_URL`) is a warning locally and a failure whenever `VITE_SITE_URL` is
set, which every deploy does.

The script draws every raster in `public/` from `favicon.svg`: `favicon.ico` (16, 32,
48 px), `favicon-96x96.png`, `apple-touch-icon.png`, `icon-192.png`,
`icon-512.png`, `icon-maskable-512.png`, `logo.png` and `og-image.png`. Every
icon is opaque, on the brand colour, because a transparent one disappears on a
dark tab strip and reads as a missing image in Google's round favicon slot.

The wordmark share card centres the logo, the brand name and the default locale's
`hero.title` inside the middle 630 px square. Google's result thumbnail and
several chat apps crop a 1200×630 card to that square, and a card laid out left
to right survives the crop as a few letters of the headline. The layout is
`scripts/lib/og-layout.mjs`; it shrinks and wraps the text to fit and **fails
the script** rather than clip it, so a headline too long for three lines is a
copy change. The text is drawn as outlines from the self-hosted
`@fontsource-variable` files (`scripts/lib/fonts.mjs`), not with the machine's
fonts, so the card is the same on every computer: Outfit for the name, Inter for
the headline, whatever the site's own font tokens say.

The icons put the logo on a full-bleed square of the brand colour; the card
puts it on a light plate. So a logo drawn in the brand colour on a transparent
background vanishes from every icon. Give `favicon.svg` its own contrasting
ground, as the placeholder's rounded square does, and look at the PNGs after
every run.

The colours come from `src/index.css`: the script reads `--brand-hue` and the
ramp, so re-run it after changing the hue. `favicon.svg` is only redrawn while
it still carries `data-placeholder="true"`. Needs `sharp`,
`fontkit` and `wawoff2`, all devDependencies that never reach the bundle.

---

## The map, the WhatsApp button, sparks and galleries

The map and the WhatsApp button are **on by default** (Harry, 2026-11-06);
sparks and galleries are pieces a site uses when they suit it.

**The map**: shown straight away, no click, under the contact form, and the
target of a "Show on the map" button under every footer address (`MapLink`).

1. `src/config/site.ts` builds `MAP` from `CONTACT.address` with `googleMap()`
   as soon as the street is real; while it is the template's placeholder
   there is no map. Nothing to switch on.
2. The CSP allows the frame by default: `frame_origins` defaults to
   `["https://www.google.com"]` in `infrastructure/terraform/variables.tf`.
3. The cookie policy (`legal:cookies.thirdParty.bodyWithMap` and `.map`) and
   the privacy policy (`legal:privacy.sharing.map`) name the Google map in
   every language, and are shown only while `MAP` is set.
4. `contact:map.title` ("Find us") can name the town: "Find us in Liepāja".

To turn it off: `export const MAP: MapConfig | null = null` and
`frame_origins = []` in the tfvars.

**WhatsApp button**: on whenever `CONTACT.whatsapp` holds a number (digits
only, with the country code), which by default is the site's mobile number.
Set it to `''` only when the owner does not use WhatsApp.

**Sparks**: `<Sparks />` inside a dark, `relative overflow-hidden` hero band,
behind the text. Decoration only; suits trades (welding, metal, fire,
workshops), not most other businesses.

**Photos and galleries**: every picture is a `<Photo src alt />`. A project
or gallery with several photos opens in a `<Lightbox>` pop-up, not a separate
page. Photos hotlinked from a client's existing site need that origin in
`image_origins` in the tfvars (production's CSP `img-src`) and a line in the
cookie and privacy copy.

## Changing the languages

Locales are configured in one place and consumed in three, and **a partial edit
fails the build** rather than degrading quietly. That is deliberate. Do all of
it, then run `make verify`.

### The files to touch

1. **`src/config/site.ts`**: the `LOCALES` array. Each entry is
   `{ code, label, short, htmlLang }`: the code is the URL segment and the
   folder name, `label` is the full name shown in the language switcher's
   accessible label, `short` is the two letters on the button, and `htmlLang` is
   what goes into `<html lang>` and `hreflang`.

   The array's order is the switcher's order, and nothing else. The default
   language is `DEFAULT_LOCALE`, which alone decides the page written as the
   bare `/`, the 404 page's language, where an unprefixed or unpublished
   language URL is sent, the i18n fallback and every `hreflang="x-default"`.
   Set it to the code you want as the fallback; it need not be the first entry
   (`src/lib/default-locale.test.ts` holds everything to it when it is not).

2. **`src/i18n/index.ts`**: the import block at the top and the `resources`
   object. Both list every locale explicitly. Adding a language means six new
   imports (one per namespace) and a new key in `resources`; removing one means
   deleting the same.

3. **`src/i18n/locales/<code>/`**: the folder itself, with one JSON file per
   namespace. Copy the reference locale's folder and translate.

Miss any one of them and it stops at `make verify`: a code in `LOCALES` with no
`resources` entry is a type error, and a folder whose keys do not match is a
parity-test failure.

### Two copies of the list outside `src/`

Two files run before the app exists, so they cannot import `LOCALES` and
carry their own `var LOCALES = [...]`, the default language first:

- **`public/theme-init.js`**, which sends the bare `/` to the visitor's
  language and hides a page served in another language than its address. It
  also lists each language's `htmlLang`, in the same order, as
  `var HTML_LANGS = [...]`.
- **`infrastructure/terraform/functions/viewer-request.js`**, the CloudFront
  Function, which sends an address with no published language to the
  default language's page with a 301.

`src/context/theme-init.test.ts` and `scripts/viewer-request.test.mjs` fail
until each matches `site.ts`.

**Adding or removing a language needs the Terraform Infrastructure workflow
run for each environment, right after the deploy that ships the change
there**: dev after the push to `main`, prod after its deploy. `theme-init.js`
ships with the site, but the CloudFront Function ships only with the
infrastructure, never with a deploy. Until that run the old function answers:

- a new language's addresses are sent to the default language's pages with
  a 301, so its pages cannot be reached;
- a removed language's addresses are still served from its old files, which
  a deploy never deletes from the bucket;
- after switching to a single language, the old redirects still send
  unprefixed addresses to the old prefixed files.

Browsers keep each of those 301s for an hour (`Cache-Control: public,
max-age=3600`), so a visitor who met one sees the right answer within the
hour after the run.

### Two things that also assume the locale list

`src/test/render.tsx` defaults its route to `/en`, and `src/test/setup.ts`
resets the language to `en` before every test so assertions run against a known
language. `src/App.test.tsx` navigates to `/en/...` paths. If you drop or rename
`en`, update those three files too.

### Dropping to a single locale

Everything keys off `LOCALES.length`, so a one-locale site reshapes itself:

- `isPrefixed()` becomes false, so `localePath()` returns paths unchanged and the
  URL loses its `/lang` segment. `/about` stays `/about`, because `/en/about` on
  a monolingual site is noise in every URL for no benefit.
- `App.tsx` drops the `RootRedirect` and the `/:lang` layout, and mounts the
  pages directly under `/`.
- `LanguageSwitcher` returns `null` and disappears from the header and the mobile
  menu.
- The sitemap lists one URL per route, with the `hreflang` its page declares
  (itself and `x-default`).

None of that needs a code change. Delete the other locales' folders, and trim
`LOCALES`, `resources`, the imports and the two copies of the list above; the
CloudFront Function then stops adding a language to any address, once the
Terraform Infrastructure run above has published it for each environment.

`bin/init-site.sh --locales lv,en,ru` deliberately does **not** do this for you.
It prints a warning and points here, because the edit spans five files and a
half-done automated attempt leaves a project that does not build.

---

## Crawler files: robots.txt, sitemap.xml, llms.txt

The build writes all three into `dist/` whenever `VITE_SITE_URL` is set, which
the deploy workflow always does (the configured domain, or the CloudFront one).
Nothing is committed, so nothing can go stale:

| File | What it holds | Built by |
| --- | --- | --- |
| `robots.txt` | Search engines, AI assistants and AI training crawlers, each named and allowed, then `*`, then the `Sitemap:` line | `robotsTxt()` in `src/lib/crawlers.ts` |
| `sitemap.xml` | Every prerendered page that is its own canonical, in every locale, with exactly the `hreflang` alternates (and `x-default`) its head declares; legal pages at a lower priority; no `<lastmod>`, because a build date is not a modification date | `sitemapXml()` in `src/lib/crawlers.ts` |
| `llms.txt` | The llmstxt.org summary an AI assistant reads: the brand, the home page's description, the facts that are real (no placeholders), and the same pages as the sitemap, each with its own title and description; the legal pages under `## Optional`. The summary and a page's note are left out while they are still the template's instructions | `llmsTxt()` in `src/lib/llms.ts` |

The prerender writes them (`scripts/prerender.mjs`, through `crawlerFilesFor`
in `src/entry-server.tsx` and `src/lib/crawler-files.ts`), after it has
rendered every page, from `config/site.ts`, the locale strings, and what each
page's head declares. So the sitemap names only URLs whose pages call
themselves canonical: a style that renders one document at several routes
(`long-scroll`) lists its home page, not the routes that point their canonical
at it. A page that names a canonical no page claims fails the build, and
`src/entry-server.test.tsx` holds the files to the pages for every style.

Be honest about `llms.txt` when an owner asks what it does. It is cheap
hygiene, not a ranking factor: a plain summary an AI assistant may read if it
fetches the site, and nothing more. No search engine ranks a site by it. Whether
an assistant names the business when asked for a recommendation depends far
more on what is written about it elsewhere (directory and review listings, a
Google Business Profile, genuine reviews) and on the pages saying plainly what
the business does, which the prerendered HTML lets every crawler read. Hidden
text or copy written to instruct an AI is not a shortcut: it is the spam that
search engines penalise.

To see them before a deploy:

```bash
make sitemap SITE_URL=https://your-domain.com     # builds, then lists the three files in dist/
```

Without `VITE_SITE_URL` the build says so (the `[crawler-files]` line), writes no sitemap and no llms.txt,
and ships the committed `public/robots.txt`, which allows everything and names
no sitemap. A sitemap full of URLs on a domain the site does not own is worse
than none: it sends crawlers to index someone else's site.

To keep AI crawlers out of model training while still letting AI assistants
find and cite the site, set `allow: false` on the training group of
`CRAWLER_GROUPS` in `src/lib/crawlers.ts`, then run
`node --input-type=module -e "import('./src/lib/crawlers.ts').then((m) => process.stdout.write(m.robotsTxt({ siteUrl: '' })))" > public/robots.txt`
(Node 22.18 or later) so the committed fallback matches. `crawlers.test.ts`
fails until it does.
