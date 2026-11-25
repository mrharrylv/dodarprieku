/**
 * Draws the 1200x630 share card, in one of two layouts, and encodes it inside
 * the size budget.
 *
 *   wordmark   the default: logo tile, brand name and headline, centred
 *   photo      when assets-src/share-hero.(png|jpg|webp) exists: that image,
 *              contained and centred with a soft shadow, the brand name beneath
 *
 * Both keep everything that carries meaning inside the central 630px square
 * (see og-layout.mjs). Pure of the file system apart from reading the hero.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { sharePhotoCardSvg, shareCardSvg } from './brand-images.mjs'
import { fontsourceDir, loadStack, measurer, textMarkup, verticalMetrics } from './fonts.mjs'
import { layoutPhotoCard, layoutShareCard } from './og-layout.mjs'

/** Where the owner puts a hero photo, in this order of preference. */
export const HERO_NAMES = Object.freeze(['share-hero.png', 'share-hero.webp', 'share-hero.jpg', 'share-hero.jpeg'])

/**
 * WhatsApp drops a preview image over about 300 KB, so 300 KB is the limit.
 * The card is encoded to land under the target, and the build fails above the
 * limit rather than ship a card WhatsApp would show without its picture.
 */
export const BUDGET = Object.freeze({ target: 200 * 1024, limit: 300 * 1024 })

/** The hero photo's path inside `dir`, or null when there is none. */
export const findShareHero = (dir) => {
  const name = HERO_NAMES.find((candidate) => existsSync(join(dir, candidate)))
  return name === undefined ? null : join(dir, name)
}

const INTER_SUBSETS = ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'vietnamese']

/** The display face for the brand name (Inter behind it for any script Outfit lacks) and Inter for the headline. */
export const loadShareFonts = async () => {
  const inter = fontsourceDir('@fontsource-variable/inter')
  const outfit = fontsourceDir('@fontsource-variable/outfit')
  const interFiles = INTER_SUBSETS.map((subset) => join(inter, `inter-${subset}-wght-normal.woff2`))
  const brand = await loadStack(
    [join(outfit, 'outfit-latin-wght-normal.woff2'), join(outfit, 'outfit-latin-ext-wght-normal.woff2'), ...interFiles],
    700,
  )
  const headline = await loadStack(interFiles, 500)
  return { brand, headline }
}

/**
 * The card as a PNG: full colour when it lands under the target, otherwise the
 * smaller of that and a 256-colour palette PNG (visually the same for flat
 * brand colour and a soft gradient). Throws above the hard limit.
 */
export const encodeCard = async (sharp, svg, ground) => {
  const raster = () =>
    sharp(Buffer.from(svg), { density: 144 }).resize(1200, 630).flatten({ background: ground })
  const full = await raster().png({ compressionLevel: 9 }).toBuffer()
  if (full.length <= BUDGET.target) return { png: full, encoding: 'png' }

  const palette = await raster().png({ compressionLevel: 9, palette: true, quality: 92, effort: 10, dither: 0.6 }).toBuffer()
  const best = palette.length < full.length ? { png: palette, encoding: 'palette' } : { png: full, encoding: 'png' }
  if (best.png.length > BUDGET.limit) {
    throw new Error(
      `The share card is ${(best.png.length / 1024).toFixed(0)} KB; WhatsApp drops previews over ` +
        `${BUDGET.limit / 1024} KB. Use a simpler share-hero image (fewer gradients and fine detail).`,
    )
  }
  return best
}

/** The hero as a PNG data URI sized for its box (at 2x), plus its dimensions after EXIF rotation. */
const prepareHero = async (sharp, file) => {
  const upright = await sharp(file)
    .rotate()
    .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true })
  const size = { width: upright.info.width, height: upright.info.height }
  return {
    size,
    toDataUri: async (box) => {
      const png = await sharp(upright.data)
        .resize({ width: Math.ceil(box.width * 2), height: Math.ceil(box.height * 2), fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer()
      return `data:image/png;base64,${png.toString('base64')}`
    },
  }
}

/**
 * @param {{
 *   sharp: Function,
 *   brand: string,
 *   headline: string,
 *   heroFile: string | null,
 *   colours: { groundFrom: string, groundTo: string, plate: string, text: string, flatten: string },
 *   logo: string,
 *   fonts: { brand: unknown[], headline: unknown[] },
 * }} input
 * @returns {Promise<{ png: Buffer, mode: 'photo' | 'wordmark', encoding: string, layout: object }>}
 */
export const renderShareCard = async ({ sharp, brand, headline, heroFile, colours, logo, fonts }) => {
  const measure = { brand: measurer(fonts.brand), headline: measurer(fonts.headline) }
  const metrics = { brand: verticalMetrics(fonts.brand), headline: verticalMetrics(fonts.headline) }

  if (heroFile !== null) {
    const hero = await prepareHero(sharp, heroFile)
    const layout = layoutPhotoCard({ brand, photo: hero.size, measure, metrics })
    const brandMarkup = textMarkup(fonts.brand, brand, {
      size: layout.brand.size,
      x: layout.centreX,
      y: layout.brand.baseline,
      fill: colours.text,
    })
    const svg = sharePhotoCardSvg({ layout, colours, photo: await hero.toDataUri(layout.photo.box), brandMarkup })
    return { ...(await encodeCard(sharp, svg, colours.flatten)), mode: 'photo', layout }
  }

  const layout = layoutShareCard({ brand, headline, measure, metrics })
  const brandMarkup = textMarkup(fonts.brand, brand, {
    size: layout.brand.size,
    x: layout.centreX,
    y: layout.brand.baseline,
    fill: colours.text,
  })
  const headlineMarkup = layout.headline.lines
    .map((line) =>
      textMarkup(fonts.headline, line.text, {
        size: layout.headline.size,
        x: layout.centreX,
        y: line.baseline,
        fill: colours.text,
        opacity: 0.92,
      }),
    )
    .join('\n  ')
  const svg = shareCardSvg({ layout, colours, logo, brandMarkup, headlineMarkup })
  return { ...(await encodeCard(sharp, svg, colours.flatten)), mode: 'wordmark', layout }
}
