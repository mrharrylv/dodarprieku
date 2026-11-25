# Design tokens

Which token to reach for, and why it exists.

`services/frontend/website/src/index.css` is the source of truth. Everything
below describes what is in that file; if the two disagree, the file is right and
this document needs fixing. Components never write a hex value, a raw pixel font
size, or a bespoke easing curve. They reach for a token.

---

## The brand ramp, and the one number

The whole visual identity hangs off a single custom property:

```css
--brand-hue: 255;
```

Every brand shade is an OKLCH colour that reads the hue from that one variable:

| Token | Definition |
| --- | --- |
| `--color-brand-50` | `oklch(0.971 0.014 var(--brand-hue))` |
| `--color-brand-100` | `oklch(0.943 0.029 var(--brand-hue))` |
| `--color-brand-200` | `oklch(0.894 0.057 var(--brand-hue))` |
| `--color-brand-300` | `oklch(0.823 0.094 var(--brand-hue))` |
| `--color-brand-400` | `oklch(0.731 0.135 var(--brand-hue))` |
| `--color-brand-500` | `oklch(0.646 0.168 var(--brand-hue))` |
| `--color-brand-600` | `oklch(0.573 0.176 var(--brand-hue))` |
| `--color-brand-700` | `oklch(0.497 0.157 var(--brand-hue))` |
| `--color-brand-800` | `oklch(0.421 0.129 var(--brand-hue))` |
| `--color-brand-900` | `oklch(0.363 0.104 var(--brand-hue))` |
| `--color-brand-950` | `oklch(0.256 0.072 var(--brand-hue))` |

**Re-theming a site is changing that one number.** Some hues to start from:

| Hue | Reads as |
| --- | --- |
| `210` | Blue |
| `255` | Indigo (the template default) |
| `265` | Violet |
| `150` | Green |
| `25` | Orange |
| `350` | Rose |

### Why OKLCH makes that safe

In hex or HSL, rotating a hue changes how light the colour *looks*. HSL yellow
at 50 % lightness is far brighter to the eye than HSL blue at 50 % lightness,
so a palette that passed contrast in blue can fail it in yellow, and a ramp that
looked evenly spaced turns lumpy. You then hand-tune eleven shades and the
"one number" promise is gone.

OKLCH is perceptually uniform: the first component *is* perceived lightness.
Rotating the hue while holding lightness and chroma fixed moves every shade to
the same visual brightness it had before, so a ramp that looked evenly spaced
still does, and contrast ratios move by a fraction of a point rather than by
half the scale. They do still move: relative luminance tracks OKLCH lightness
closely but not exactly, and a shade that falls outside the sRGB gamut gets its
chroma reduced, which shifts it further. Measured across the suggested hues,
brand-600 on white spans 4.11 to 4.86, a narrow band that nonetheless straddles
4.5:1. That is precisely why the accent tokens do not use it. See [the measured
ratios](#the-measured-ratios) below.

Chroma is deliberately lower at both ends of the ramp. High chroma near white
looks washed out and high chroma near black reads as neon; the values above are
tuned so the extremes stay believable as a tint and a shade of the same colour.

The neutrals carry a trace of the same hue (`--color-ink-*`, chroma 0.002 to
0.014), which is why the greys sit comfortably beside the accent instead of
looking muddy. They shift with the brand hue automatically for the same reason
the brand shades do.

Status colours are pinned **off** the brand hue on purpose:

| Token | Value |
| --- | --- |
| `--color-success-500` / `-600` | `oklch(0.65 0.16 150)` / `oklch(0.56 0.15 150)` |
| `--color-warning-500` / `-600` | `oklch(0.75 0.16 75)` / `oklch(0.64 0.15 75)` |
| `--color-danger-500` / `-600` | `oklch(0.62 0.21 25)` / `oklch(0.55 0.20 25)` |

A success message must not be mistakable for an accent, and an error must never
be brand-coloured. If the brand hue is rotated to 25, the danger red and the
brand red will sit close together, and that is the one case where the palette
needs a look before launch.

---

## A style may override this layer

The tokens below are the base. A design style in `src/styles/<id>/tokens.css`
may repoint any of them, plus the fonts, radii, shadows, easings and container
widths. It may not touch `--brand-hue` or the ramps themselves.

Whatever it writes is measured: `index.contrast.test.ts` overlays each style's
overrides on the base and asserts the same ratios at all six hues, in both
themes. A style can look like anything; it cannot make the site unreadable.
The permitted value forms are in [`styles.md`](styles.md).

## The semantic layer

The ramps above are raw material. Components do not use them. They use the
**semantic tokens**, defined for both themes in the `@layer base` block:

| Token | Light | Dark |
| --- | --- | --- |
| `--surface-page` | `ink-50` | `ink-950` |
| `--surface-raised` | `#fff` | `ink-900` |
| `--surface-sunken` | `ink-100` | `oklch(0.115 0.006 var(--brand-hue))` |
| `--surface-inverted` | `ink-900` | `ink-50` |
| `--border-subtle` | `ink-200` | `oklch(0.28 0.009 var(--brand-hue))` |
| `--border-strong` | `oklch(0.63 0.013 …)` | `oklch(0.53 0.011 var(--brand-hue))` |
| `--text-primary` | `ink-900` | `ink-100` |
| `--text-secondary` | `ink-600` | `ink-300` |
| `--text-muted` | `ink-500` | `ink-400` |
| `--text-inverted` | `ink-50` | `ink-950` |
| `--text-accent` | `brand-700` | `brand-400` |
| `--fill-accent` | `brand-700` | `brand-400` |
| `--fill-accent-hover` | `brand-800` | `brand-300` |
| `--text-on-accent` | `#fff` | `ink-950` |
| `--ring-accent` | `brand-600` | `brand-400` |
| `--surface-accent-soft` | `brand-50` | `oklch(0.23 0.045 var(--brand-hue))` |
| `--border-accent-soft` | `brand-200` | `oklch(0.34 0.06 var(--brand-hue))` |

The two border tokens are not a light and a dark version of one idea.
`--border-subtle` is **decoration**: a divider, the edge of a card. Nothing
depends on seeing it. `--border-strong` is the boundary of a **control**: a
text input, a checkbox, a secondary button. That edge is what tells a visitor
where the input is, so WCAG 1.4.11 wants 3:1 against the surface behind it. It
was `ink-300` and measured 1.49:1, which meant every text input on the site had
a border nobody could see. It is now 3.16-3.48:1 light and 3.36-3.84:1 dark,
across all six hues, and the contrast test holds it there.

That indirection is the entire point. Write

```tsx
<div className="bg-(--surface-raised) text-(--text-primary) border border-(--border-subtle)">
```

and the component is correct in both themes with no `dark:` class anywhere in
its markup. Write `bg-white text-slate-900` and you have just shipped a white
card on a dark page, and you will now sprinkle `dark:` variants through every
element to undo it. Multiply that by fifty components and the theme becomes
untestable, because the dark version of any given screen only exists in the
markup of that screen.

There is one legitimate reason to reach past the semantic layer to a raw ramp
shade: a decorative fill or wash where you have handled both themes explicitly.
The home page hero does it:

```tsx
className="bg-gradient-to-b from-(--color-brand-50) to-transparent
           opacity-70 dark:from-(--color-brand-950) dark:opacity-40"
```

Text is never that case.

---

## The contrast rule that catches people out

**`brand-500` is neither accent text nor a fill behind white text.**

Measured on white it lands between 3.06:1 and 3.58:1 depending on hue. That
clears 3:1, the bar for non-text UI components, and it fails 4.5:1 for body
copy. It fails in the way nobody catches at design review, because it looks
perfectly nice. An earlier version of this template used it as the button fill
and shipped a 3.31:1 button label on that basis.

- Accent **text** → `--text-accent`: brand-700 on light, brand-400 on dark.
- Accent **fill** → `--fill-accent`, with the label in `--text-on-accent`.
- Focus ring and hover border → `--ring-accent`: brand-600 on light.

Both accent tokens flip between themes, and the button flips in an unobvious
way. Light mode is a dark fill with a white label. Dark mode is a **light** fill
with a dark label, because keeping a dark fill on a dark page would leave the
button itself at about 3.0:1 against the background: readable text on an
invisible control. That is why the label colour is a token rather than a
hardcoded `text-white`.

### The measured ratios

Computed from the OKLCH definitions in `index.css`, with out-of-gamut shades
chroma-reduced the way a browser reduces them. "Dark" is `--surface-page` in the
dark theme (`ink-950`); "white" is `--surface-raised` in the light theme.

| Hue | brand-500 on white | brand-600 on white | brand-700 on white | brand-400 on dark |
| --- | --- | --- | --- | --- |
| 25 (orange/red) | 3.55 | 4.81 | 6.59 | 7.85 |
| 150 (green) | 3.06 | 4.11 | 5.70 | 8.76 |
| 210 (blue) | 3.15 | 4.24 | 5.86 | 8.68 |
| 255 (default) | 3.31 | **4.47** | 6.16 | 8.30 |
| 265 (violet) | 3.36 | 4.55 | 6.26 | 8.20 |
| 350 (rose) | 3.58 | 4.86 | 6.64 | 7.80 |

That table is why the accent tokens point where they do. brand-600 straddles
4.5:1: it passes at hues 25, 265 and 350 and fails at 150, 210 and the 255
default. A token that is correct at three hues and wrong at three others is a
trap for whoever re-themes next, so light-theme accent text and the light fill
both use **brand-700**, which clears 5.47:1 at every hue in the table.

Neutral text has room to spare: `--text-primary` is 17.8:1 on white and
`--text-secondary` is 7.6:1. `--text-muted` is the tightest at 4.79:1 on
`--surface-sunken`, which is why `--color-ink-500` sits at lightness 0.530
rather than the 0.554 an evenly spaced ramp would put there. Keep it for
genuinely secondary labels rather than body copy.

### None of this is checked by eye

`src/index.contrast.test.ts` parses these token definitions straight out of
`index.css`, converts them the way a browser does, and asserts every ratio above
at all six hues. It fails the build if a token is repointed at a step that
misses the bar, and it is how the focus ring was caught: brand-500 measured
2.93:1 against the light page at hue 150, just under the 3:1 that WCAG 1.4.11
requires of a focus indicator, so `--ring-accent` moved to brand-600.

Re-theming to a hue not in the table? Add it to `HUES` in that test and run it.
That is the whole check.

---

## Type

Two families, both self-hosted:

| Token | Stack | Used for |
| --- | --- | --- |
| `--font-sans` | `'Inter Variable'`, then `ui-sans-serif`, `system-ui`, `-apple-system`, `'Segoe UI'`, `Roboto`, `sans-serif` | Body copy. Applied to `body`. |
| `--font-display` | `'Outfit Variable'`, then `'Inter Variable'` and the same system fallbacks | `h1`–`h4`, applied in the base layer, plus anything explicitly asking for it with `font-(family-name:--font-display)` |

They are imported at the top of `index.css` from `@fontsource-variable/inter`
and `@fontsource-variable/outfit`, which means the font files are bundled and
served from the site's own origin.

**Never add a `fonts.googleapis.com` link.** A webfont request carries the
visitor's IP address, User-Agent and Referer to Google on the first paint,
before the page has asked anyone's permission. A German court has held that this
alone is an actionable privacy violation (LG München I, 3 O 17493/20), and the
cookie policy this template ships promises, in all three languages, that the
site makes no third-party request. Self-hosting is what makes that promise true
rather than aspirational.

### The fluid scale

Every step is a `clamp()` that interpolates between a phone-width size and a
desktop size:

| Token | Definition | Roughly (360 px → 1280 px) |
| --- | --- | --- |
| `--text-xs` | `clamp(0.75rem, 0.73rem + 0.1vw, 0.8rem)` | 12 → 12.8 px |
| `--text-sm` | `clamp(0.875rem, 0.85rem + 0.12vw, 0.925rem)` | 14 → 14.8 px |
| `--text-base` | `clamp(1rem, 0.97rem + 0.15vw, 1.0625rem)` | 16 → 17 px |
| `--text-lg` | `clamp(1.125rem, 1.08rem + 0.22vw, 1.25rem)` | 18 → 20 px |
| `--text-xl` | `clamp(1.25rem, 1.18rem + 0.35vw, 1.5rem)` | 20 → 24 px |
| `--text-2xl` | `clamp(1.5rem, 1.38rem + 0.6vw, 1.875rem)` | 24 → 30 px |
| `--text-3xl` | `clamp(1.875rem, 1.65rem + 1.1vw, 2.5rem)` | 30 → 40 px |
| `--text-4xl` | `clamp(2.25rem, 1.9rem + 1.75vw, 3.25rem)` | 36 → 52 px |
| `--text-5xl` | `clamp(2.75rem, 2.1rem + 3.2vw, 4.5rem)` | 44 → 72 px |

Reach for them as `text-(length:--text-3xl)`. The `length:` hint is required:
without it Tailwind cannot tell whether an arbitrary custom property is a size
or a colour.

The reason for a fluid scale rather than breakpoint steps is that a stepped
headline *jumps*. Drag a browser window across 1024 px with `text-3xl md:text-5xl`
and the hero snaps between two sizes; a visitor on a 1020 px tablet in landscape
gets the small one for no reason a human could articulate. `clamp()` removes the
question. There is no breakpoint at which type changes size, so there is no
breakpoint at which the layout has to be re-checked for a headline that suddenly
wraps to three lines.

Two related base rules live in the same file. Form controls are set to
`max(1rem, var(--text-base))`, because iOS zooms the whole page in when a
focused input's font size is under 16 px. Headings get `text-wrap: balance` and
paragraphs `text-wrap: pretty`, which kills orphaned last words without any
manual `<br>`.

---

## Space, radius, shadow, motion

| Group | Tokens |
| --- | --- |
| Radius | `--radius-sm` 0.375rem · `--radius-md` 0.625rem · `--radius-lg` 1rem · `--radius-xl` 1.5rem · `--radius-2xl` 2rem |
| Shadow | `--shadow-subtle` · `--shadow-card` · `--shadow-lifted` |
| Easing | `--ease-out-soft` `cubic-bezier(0.22, 1, 0.36, 1)` · `--ease-in-out-soft` `cubic-bezier(0.65, 0, 0.35, 1)` |
| Width | `--container-content` 72rem · `--container-prose` 44rem |

Radius by role, not by taste: `sm` for the focus ring and small chips, `md` for
controls (buttons, inputs, icon buttons), `lg` for cards and panels, `xl`/`2xl`
for large decorative surfaces.

The shadows are built from `oklch(0.145 0.006 var(--brand-hue) / …)` rather than
neutral black, so the shadow under a card is very slightly tinted towards the
brand and does not read as grey sludge. `subtle` is a 1 px hairline for resting
state, `card` adds a soft ambient spread for hover, `lifted` is for anything
genuinely floating above the page (the skip link uses it).

`--ease-out-soft` is the default for anything entering or responding to a
pointer; it decelerates hard at the end, which reads as "settled" rather than
"stopped". `--ease-in-out-soft` is for a movement with a start and an end that
both matter. Use `duration-150` for a colour change and `duration-200` for
anything that moves. Longer than that on a marketing site starts to feel slow.

Spacing itself is Tailwind's default scale (`p-6`, `gap-5`, `py-16 sm:py-24`).
There is no bespoke spacing token, on purpose: one arbitrary scale is enough,
and `Section` already owns the vertical rhythm so pages rarely choose it.

`--container-prose` at 44rem is not arbitrary either. It puts long-form copy at
roughly 70 characters a line; beyond about 75 the reader loses their place on
the return sweep. `Container width="prose"` and the `.prose-page` utility both
use it.

---

## Dark mode

Three pieces have to agree, and they are in three files.

**1. The variant.** `index.css` defines dark as an attribute, not a media query:

```css
@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));
```

Keying off `prefers-color-scheme` alone would make the OS setting the final
word, and a visitor who explicitly chose light on a dark machine would be
overruled by their own laptop.

**2. The provider.** `context/ThemeProvider.tsx` stores the visitor's preference
(`light`, `dark`, or `system`), resolves `system` against `matchMedia`, and
writes both `data-theme` and `style.colorScheme` onto `<html>`. `colorScheme`
matters as well as the attribute: it is what tells the browser to render its own
chrome, scrollbars, form controls, the mobile address bar, to match. It keeps
listening to the media query while the preference is `system`, so a machine that
switches at sunset takes the site with it.

**3. `public/theme-init.js`.** Every page is prerendered, so the browser paints
it before React starts at all. Without a pre-paint script, every visitor whose
choice differs from the default sees a full-screen flash of the wrong colour
on every single page load. `index.html` loads it synchronously from the head,
so it runs before the body is painted. It is a same-origin file rather than an
inline script because production's CSP is `script-src 'self'`, which blocks
inline scripts: the inline version this replaced never ran in production. It
reads the same storage key, writes the same attribute and applies the same rule
as the provider (`resolveTheme` in `context/theme-context.ts`: a stored `light`
or `dark` wins; nothing stored, a value the site never wrote and storage that
cannot be read all follow the OS). The provider starts from the attribute it
wrote, so the two agree on the first frame, and because the rule is the same
the provider has nothing to correct afterwards either. (The same file also
sends the bare `/` to the visitor's language before the first paint, and
keeps the prerendered 404 page hidden at an address in another language until
React has rendered it in that one, or for 3 s at most; see "Prerendering and
hydration" in `architecture.md`.)

**Those three must stay in step. If you change the storage key, the attribute
name or the rule, change all three in the same commit.**
`context/theme-init.test.ts` runs every combination through the script and the
provider's rule. The failure mode is a flash on
first paint, which is invisible on a fast local machine and obvious to everyone
else.

### Never define a colour only inside a dark block

Both themes are written out explicitly in `index.css`, `:root` first and
`[data-theme='dark']` after. A token that exists only under the dark selector
renders as an inherited or transparent value in light mode, and the bug looks
like "that panel has no background on some machines" rather than "a token is
missing". Add a token to both blocks or to neither.

The corollary for components: if you find yourself writing a `dark:` class for
a colour, you have probably reached past the semantic layer. Go back and use the
semantic token instead. The `dark:` variant is for the rare decorative case, not
for routine surfaces and text.

---

## Reduced motion

`index.css` honours `prefers-reduced-motion: reduce` globally:

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Animation that cannot be turned off is a WCAG 2.3.3 failure and, for some
people, a genuine physical problem: vestibular disorders make large parallax and
sliding transitions nauseating rather than merely annoying.

The global rule covers CSS. It does not cover JavaScript, so any programmatic
scroll must use `behavior: 'instant'` rather than `'smooth'`. `Layout`'s scroll
restoration and `useScrollLock`'s release both do. The visitor never chose to
travel, so animating them back to where they already were reads as a glitch.

---

## Re-theming a site in five minutes

1. **Pick a hue.** Open `src/index.css` and change `--brand-hue`. That is the
   whole palette, both themes, every shade, and the tinted neutrals and shadows
   with it.

2. **Update the four places that carry a literal hex**, which cannot read a CSS
   variable:

   | File | What | Ships as (hue 255) |
   | --- | --- | --- |
   | `public/favicon.svg` | `fill` on the rounded square | `#3c8ef1` |
   | `public/site.webmanifest` | `theme_color`, and `background_color` if the page ground changes | `#3c8ef1` / `#f9fafb` |
   | `index.html` | the two `<meta name="theme-color">` tags, light and dark | `#f9fafb` / `#090a0d` |
   | the generated PNGs | the ground behind the logo | brand 500 |

   A browser reading `theme_color` paints the mobile address bar with it before
   any CSS has loaded, so a stale value here is visible on every phone.

   Those defaults are the true sRGB renderings of `brand-500`, `ink-50` and
   `ink-950` at hue 255, so they agree with the CSS as shipped. They will not
   agree after a hue change, because none of these files can read a CSS
   variable. **Do not edit them by hand:**

   ```bash
   npm run images
   ```

   reads `--brand-hue` out of `index.css`, converts it with the same OKLCH code
   the contrast test uses, rewrites all three files, and regenerates the icons
   and the share card from `public/favicon.svg`. It only recolours
   `favicon.svg` while that file still carries `data-placeholder="true"`, so a
   real logo is never touched.

   An earlier version of this template shipped a violet `#6659e8` in all four
   files while the CSS rendered a blue, which is what happens when a literal is
   set by eye.

3. **Look at the type.** Change `--font-sans` and `--font-display` if the brand
   calls for it, and swap the two `@import '@fontsource-variable/…'` lines and
   the matching `package.json` dependencies to match. Fontsource has most of
   Google's catalogue; keep it self-hosted.

   The share card does not follow the tokens. `npm run images` draws the brand
   name in Outfit and the headline in Inter, read from
   `@fontsource-variable/outfit` and `@fontsource-variable/inter` in
   `node_modules` (`scripts/generate-images.mjs`). Keep both packages installed
   when the site's fonts change, or the script fails; to put the new face on
   the card as well, change the two font stacks in that script and re-run it.

4. **Check the danger colour and the accent contrast.** If the new hue is near
   25, the brand and the error red will be close; nudge
   `--color-danger-500`/`-600` towards 15 or 30, or shift the brand. Then check
   `--text-accent` against [the measured ratios](#the-measured-ratios) and move
   the light-theme value to brand-700 if the hue you picked falls short of
   4.5:1.

5. **Look at the site in both themes.** `make dev`, then use the theme toggle in
   the header. Look at the home page hero, a card grid, the contact form with an
   error showing, and a legal page. If anything reads badly, the fix is almost
   always a component that reached past the semantic layer.

What you should *not* need to touch: any component file. If a hue change forces
you to edit a component, that component has a hardcoded colour and the real fix
is to give it a token.
