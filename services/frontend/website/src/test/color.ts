/**
 * OKLCH to sRGB, and WCAG 2.x contrast ratios.
 *
 * Test-only. It exists so `contrast.test.ts` can compute what the palette
 * actually renders as, rather than trusting a comment that says it is fine.
 * The original version of this design system asserted "clears 4.5:1" in three
 * documents and was wrong about it at four of six brand hues, which is exactly
 * the kind of claim a machine should be checking.
 *
 * Verified against known anchors in the test: white, and the sRGB primaries.
 */

export type Rgb = readonly [number, number, number]

/** OKLCH to LINEAR sRGB. Values outside 0..1 are out of gamut. */
export const oklchToLinearSrgb = (L: number, C: number, hDeg: number): Rgb => {
  const h = (hDeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const inGamut = ([r, g, b]: Rgb): boolean =>
  [r, g, b].every((v) => v >= -1e-4 && v <= 1 + 1e-4)

/**
 * Reduce chroma until the colour fits sRGB, the way a browser does.
 *
 * Clipping each channel instead would shift the hue and report a contrast the
 * screen never shows.
 */
export const gamutMap = (L: number, C: number, h: number): Rgb => {
  const direct = oklchToLinearSrgb(L, C, h)
  if (inGamut(direct)) return direct

  let lo = 0
  let hi = C
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (inGamut(oklchToLinearSrgb(L, mid, h))) lo = mid
    else hi = mid
  }
  return oklchToLinearSrgb(L, lo, h)
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

const encode = (c: number): number => {
  const v = clamp01(c)
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
}

export const toHex = (rgb: Rgb): string =>
  `#${rgb.map((v) => Math.round(encode(v) * 255).toString(16).padStart(2, '0')).join('')}`

/** WCAG relative luminance. Takes LINEAR sRGB, which is what gamutMap returns. */
export const luminance = ([r, g, b]: Rgb): number =>
  0.2126 * clamp01(r) + 0.7152 * clamp01(g) + 0.0722 * clamp01(b)

/** WCAG 2.x contrast ratio, 1 to 21. */
export const contrast = (a: Rgb, b: Rgb): number => {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

export const WHITE: Rgb = [1, 1, 1]
