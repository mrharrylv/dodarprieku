/**
 * The SVG sources the raster assets are rendered from. Pure string building:
 * the generator supplies the colours, the logo and the laid-out text.
 */

/** The logo as an <image> source, from the SVG text of public/favicon.svg. */
export const svgDataUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

/**
 * What each raster is for, and how much room it leaves around the logo.
 *
 * Every icon is OPAQUE, on the brand ground. A transparent favicon disappears
 * against a dark tab strip or a dark search results page, and Google draws a
 * site's icon inside a circle, where a transparent corner reads as a missing
 * image.
 *
 * `maskable` is the Android adaptive icon: the launcher may cut it to a circle
 * of 80% of its width, so the logo is kept inside 56% of the square, whose
 * diagonal (79%) still fits that circle.
 */
export const ICONS = Object.freeze([
  { file: 'favicon-96x96.png', size: 96, padding: 0.06 },
  { file: 'apple-touch-icon.png', size: 180, padding: 0.12 },
  { file: 'icon-192.png', size: 192, padding: 0.12 },
  { file: 'icon-512.png', size: 512, padding: 0.12 },
  { file: 'icon-maskable-512.png', size: 512, padding: 0.22 },
  /** Organization.logo in the structured data: square, opaque, legible on white and on dark. */
  { file: 'logo.png', size: 512, padding: 0.12 },
])

/** The sizes packed into favicon.ico: what a tab, a taskbar and Google's fetcher ask for. */
export const ICO_SIZES = Object.freeze([16, 32, 48])
export const ICO_PADDING = 0.04

const round = (value) => Math.round(value * 100) / 100

/** The logo, centred on a full-bleed square of the brand colour. */
export const iconSvg = ({ size, padding, ground, logo }) => {
  const inset = round(size * padding)
  const edge = round(size - inset * 2)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${ground}"/>
  <image href="${logo}" x="${inset}" y="${inset}" width="${edge}" height="${edge}"/>
</svg>`
}

/**
 * The 1200x630 share card, from a layout made by `og-layout.mjs`.
 *
 * The logo sits on a light plate, because a real logo is usually drawn for a
 * white page and may vanish on the brand colour. The brand name and headline
 * are already paths (see `fonts.mjs`), so nothing here depends on the fonts
 * installed on the machine that renders it.
 */
export const shareCardSvg = ({ layout, colours, logo, brandMarkup, headlineMarkup }) => {
  const { card, tile, centreX } = layout
  const radius = round(tile.width * 0.22)
  const pad = round(tile.width * 0.13)
  const glowY = round(tile.y + tile.height / 2)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${card.width}" height="${card.height}" viewBox="0 0 ${card.width} ${card.height}">
  <defs>
    <linearGradient id="ground" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${colours.groundFrom}"/>
      <stop offset="1" stop-color="${colours.groundTo}"/>
    </linearGradient>
    <radialGradient id="glow" cx="${round(centreX)}" cy="${glowY}" r="${round(card.height * 0.62)}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${colours.plate}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${colours.plate}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${card.width}" height="${card.height}" fill="url(#ground)"/>
  <rect width="${card.width}" height="${card.height}" fill="url(#glow)"/>
  <rect x="${round(tile.x)}" y="${round(tile.y)}" width="${tile.width}" height="${tile.height}" rx="${radius}" fill="${colours.plate}"/>
  <image href="${logo}" x="${round(tile.x + pad)}" y="${round(tile.y + pad)}" width="${round(tile.width - pad * 2)}" height="${round(tile.height - pad * 2)}"/>
  ${brandMarkup}
  ${headlineMarkup}
</svg>`
}

/** Escapes text for an XML attribute value. */
export const escapeXml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

/**
 * The letter the placeholder favicon draws: the brand name's first letter or
 * digit, capitalised. A bullet when the name has neither, so there is always
 * something to draw.
 */
export const firstLetter = (brand) => {
  const found = Array.from(brand).find((char) => /[\p{L}\p{N}]/u.test(char))
  return found === undefined ? '•' : found.toLocaleUpperCase()
}

/**
 * The PLACEHOLDER favicon.svg: the brand's initial, white, on a rounded square
 * of the brand colour. `data-placeholder="true"` is what lets `npm run images`
 * redraw it when the brand changes, and what `verify-share` warns about; a
 * real logo drops the attribute and is never touched.
 */
export const faviconSvg = ({ brand, ground, letterMarkup }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${escapeXml(brand)}" data-placeholder="true">
  <rect width="64" height="64" rx="14" fill="${ground}"/>
  ${letterMarkup}
</svg>
`

/**
 * The PHOTO share card, from a layout made by `layoutPhotoCard`: the brand
 * ground, the hero image with a soft shadow that follows its alpha (so a
 * cut-out casts the shadow of its outline, not of a rectangle), and the brand
 * name beneath it.
 */
export const sharePhotoCardSvg = ({ layout, colours, photo, brandMarkup }) => {
  const { card, centreX } = layout
  const { box, shadow } = layout.photo
  const glowY = round(box.y + box.height / 2)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${card.width}" height="${card.height}" viewBox="0 0 ${card.width} ${card.height}">
  <defs>
    <linearGradient id="ground" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${colours.groundFrom}"/>
      <stop offset="1" stop-color="${colours.groundTo}"/>
    </linearGradient>
    <radialGradient id="glow" cx="${round(centreX)}" cy="${glowY}" r="${round(card.height * 0.62)}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${colours.plate}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${colours.plate}" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${shadow.blur}"/>
      <feOffset dy="${shadow.dy}" result="blurred"/>
      <feFlood flood-color="#000000" flood-opacity="${shadow.opacity}"/>
      <feComposite in2="blurred" operator="in" result="soft"/>
      <feMerge>
        <feMergeNode in="soft"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="${card.width}" height="${card.height}" fill="url(#ground)"/>
  <rect width="${card.width}" height="${card.height}" fill="url(#glow)"/>
  <image href="${photo}" x="${round(box.x)}" y="${round(box.y)}" width="${round(box.width)}" height="${round(box.height)}" preserveAspectRatio="xMidYMid meet" filter="url(#shadow)"/>
  ${brandMarkup}
</svg>`
}
