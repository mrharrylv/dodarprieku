/**
 * OKLCH to sRGB, for scripts that have to write a literal hex.
 *
 * The same maths as src/test/color.ts, which the contrast test uses. That file
 * is TypeScript and this is plain ESM so `node scripts/…` can run it without a
 * loader; src/test/color.test.ts asserts the two agree, so neither can drift.
 *
 * Conversion per CSS Color 4: OKLCH -> OKLab -> LMS -> linear sRGB. An
 * out-of-gamut colour has its chroma reduced until it fits, which is what a
 * browser does and what keeps the hue and lightness intact.
 */

/** OKLCH to LINEAR sRGB. Values outside 0..1 are out of gamut. */
export const oklchToLinearSrgb = (L, C, hDeg) => {
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

const inGamut = ([r, g, b]) => [r, g, b].every((v) => v >= -1e-4 && v <= 1 + 1e-4)

/** Reduce chroma until the colour fits sRGB, the way a browser does. */
export const gamutMap = (L, C, h) => {
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

const clamp01 = (v) => Math.min(1, Math.max(0, v))

const encode = (c) => {
  const v = clamp01(c)
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055
}

/** Linear sRGB triple to a CSS hex. */
export const toHex = (rgb) =>
  `#${rgb.map((v) => Math.round(encode(v) * 255).toString(16).padStart(2, '0')).join('')}`
