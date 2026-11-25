# Consent add-on

## Read this before installing it

**The base template needs no consent banner, and adding one is a downgrade.**

A fresh copy of this template sets no cookies, loads no analytics, and makes no
third-party request: fonts are self-hosted, icons are bundled, `index.html`
carries no external tag. Under the ePrivacy Directive Art. 5(3), storing the
visitor's own theme and language choice is "strictly necessary" and needs no
consent at all. A banner on such a site asks permission for nothing, and its
real effect is to train people to click Accept without reading.

So install this **only when you have actually added something that needs it**:

- a Google Maps / YouTube / Vimeo embed,
- analytics of any kind,
- a chat widget, a font service, a CDN-hosted script.

If you are adding one of those, you need this. If you are adding it "because
every site has one", you do not.

## What you get

| File | Goes to | Purpose |
| --- | --- | --- |
| `consent-context.ts` | `src/context/` | Categories, state shape, the context. |
| `ConsentProvider.tsx` | `src/context/` | Stores the decision, expires it, records it server-side. |
| `useConsent.ts` | `src/hooks/` | The hook. |
| `ConsentBanner.tsx` | `src/components/consent/` | The banner. |
| `ConsentGate.tsx` | `src/components/consent/` | Wraps an embed so it does not load without consent. |
| `terraform/consent.tf` | `infrastructure/terraform/` | DynamoDB + Lambda, only if you need an audit trail. |
| `lambda/consent.mjs` | `infrastructure/terraform/lambda/` | Writes the record. |

## Frontend install

```bash
T=services/frontend/website/src
cp optional/consent/frontend/consent-context.ts   $T/context/
cp optional/consent/frontend/ConsentProvider.tsx  $T/context/
cp optional/consent/frontend/useConsent.ts        $T/hooks/
mkdir -p $T/components/consent
cp optional/consent/frontend/ConsentBanner.tsx    $T/components/consent/
cp optional/consent/frontend/ConsentGate.tsx      $T/components/consent/
```

Wrap the app in `ConsentProvider`, inside `ThemeProvider` and inside the
router. The banner links to the cookie policy, so it needs a router above it.

Every page is prerendered at build time and hydrated in the browser, and that
only works while the browser renders the same tree as the build. So the
provider goes into **all three** copies of it, in the same commit:
`src/main.tsx` (inside `BrowserRouter`), `src/entry-server.tsx` (inside
`StaticRouter`) and `src/hydration.test.tsx` (inside `BrowserRouter`):

```tsx
<ThemeProvider>
  <BrowserRouter>
    <ConsentProvider>
      <App />
    </ConsentProvider>
  </BrowserRouter>
</ThemeProvider>
```

Render `<ConsentBanner />` once, in `src/components/layout/SiteChrome.tsx`,
which every style's shell mounts, so it appears whichever style is active.

The banner and the gate both wait for hydration (`useHydrated()`) before they
act on a stored decision: the build knows no visitor's choice, so the
prerendered HTML has no banner and every gate shows its placeholder. Keep that
if you restyle them. Reading the stored consent into the first render instead
makes every returning visitor's page fail hydration.
`make verify-styles` runs the hydration test against every style, so run it
after installing, and give `hydration.test.tsx` one more case: store a
decision under `STORAGE_KEYS.consent` before hydrating, the way its dark-theme
case stores a theme, and expect no recoverable error.

Then add these keys to `common.json` **in all three locales**. The parity test
fails the build if you add them to one:

```json
"consent": {
  "title": "…",
  "body": "…",
  "accept": "…",
  "reject": "…",
  "learnMore": "…",
  "loadContent": "…",
  "gateNote": "…",
  "change": "…"
}
```

### Gating an embed

`children` is a **function**, and that is the whole point:

```tsx
<ConsentGate
  category="embeds"
  title={t('map.title')}
  description={t('map.description')}
>
  {() => <iframe src="https://www.google.com/maps/embed?…" title={t('map.title')} />}
</ConsentGate>
```

Rendering the `<iframe>` behind a hidden overlay instead would be pointless: the
request has already gone, and the visitor's IP, User-Agent and Referer have
already reached Google. Because the child is a function, the element is never
constructed until consent exists.

## Backend install (optional)

Only needed if you must be able to **demonstrate** consent (Art. 7(1)). A value
in the visitor's browser demonstrates nothing: they can edit it, and it is gone
when they clear site data.

```bash
cp optional/consent/terraform/consent.tf infrastructure/terraform/
mkdir -p infrastructure/terraform/lambda
cp optional/consent/lambda/consent.mjs   infrastructure/terraform/lambda/
FEATURES=contact,consent PROJECT=<slug> REPO=<repo> ./infrastructure/aws/setup.sh
```

It reuses `contact_allowed_origins`, so install the contact add-on's variables
too even if you are not using the form itself. Apply, then set the
`consent_endpoint` output as the `VITE_CONSENT_ENDPOINT` variable on the GitHub
Environment.

The record stores a pseudonymous id, the timestamp, the categories agreed to,
and the policy version. It does not store the raw IP, which is personal data in
its own right (Breyer, C-582/14), and it stores no name or email. It is evidence
that a decision was made, not a profile of who made it.

## The four things that make a banner lawful

The shipped component does all four. If you restyle it, do not lose them.

1. **Reject is as easy as Accept:** same prominence, same click count, side by
   side. Rejection hidden behind "Manage preferences" is the dark pattern
   regulators have been issuing fines over.
2. **Nothing is pre-ticked, and nothing loads first.** Implied consent from
   "continuing to browse" is not consent (Planet49, C-673/17).
3. **No X, and no page-blocking modal.** Dismissing must not count as agreeing,
   and consent extracted by trapping someone is not freely given (Art. 7(4)).
4. **It can be withdrawn as easily as it was given** (Art. 7(3)), hence
   `reopen()`, which the footer should call from a "Cookie settings" link.

## Keep three numbers in step

`CONSENT_TTL_DAYS` in `config/constants.ts`, `consent_ttl_days` in the tfvars,
and the retention period written in the privacy policy are the same fact stated
three times. When one changes, change all three in the same commit. Otherwise
the published policy is simply false.

Same rule for `CONSENT_VERSION`: bump it whenever the categories or the policy
change materially. A stored decision from an older version is then treated as no
decision, because the visitor agreed to something else.
