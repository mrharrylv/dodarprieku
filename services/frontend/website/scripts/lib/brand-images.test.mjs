import { describe, it, expect } from 'vitest'

import { ICONS, ICO_SIZES, escapeXml, faviconSvg, firstLetter, iconSvg, shareCardSvg, sharePhotoCardSvg, svgDataUri } from './brand-images.mjs'

describe('iconSvg', () => {
  it('lays a full-bleed ground under the logo, so the icon is opaque', () => {
    const svg = iconSvg({ size: 96, padding: 0.1, ground: '#123456', logo: 'data:x' })
    expect(svg).toContain('<rect width="96" height="96" fill="#123456"/>')
    expect(svg).toMatch(/<image href="data:x" x="9.6" y="9.6" width="76.8" height="76.8"\/>/)
  })
})

describe('ICONS', () => {
  it('keeps the maskable logo inside the circle an Android launcher may cut', () => {
    // The safe zone is a centred circle of 80% of the width. A centred square
    // of side s fits it when its diagonal s * sqrt(2) is at most 0.8.
    const maskable = ICONS.find((icon) => icon.file.includes('maskable'))
    const side = 1 - (maskable?.padding ?? 0) * 2
    expect(side * Math.SQRT2).toBeLessThanOrEqual(0.8)
  })

  it('includes the files index.html, the manifest and the structured data point at', () => {
    const files = ICONS.map((icon) => icon.file)
    for (const name of ['favicon-96x96.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'logo.png']) {
      expect(files).toContain(name)
    }
  })

  it('packs the three sizes browsers and crawlers ask favicon.ico for', () => {
    expect([...ICO_SIZES]).toEqual([16, 32, 48])
  })
})

describe('shareCardSvg', () => {
  const layout = {
    card: { width: 1200, height: 630 },
    centreX: 600,
    tile: { x: 516, y: 100, width: 168, height: 168 },
  }

  it('puts the plate and the logo in the tile the layout chose', () => {
    const svg = shareCardSvg({
      layout,
      colours: { groundFrom: '#111111', groundTo: '#222222', plate: '#fafafa' },
      logo: 'data:logo',
      brandMarkup: '<g id="brand"/>',
      headlineMarkup: '<g id="headline"/>',
    })
    expect(svg).toContain('width="1200" height="630"')
    expect(svg).toMatch(/<rect x="516" y="100" width="168" height="168" rx="[\d.]+" fill="#fafafa"\/>/)
    expect(svg).toContain('<image href="data:logo"')
    expect(svg).toContain('<g id="brand"/>')
    expect(svg).toContain('<g id="headline"/>')
    expect(svg).not.toContain('<text')
  })
})

describe('svgDataUri', () => {
  it('base64-encodes the SVG', () => {
    expect(svgDataUri('<svg/>')).toBe(`data:image/svg+xml;base64,${Buffer.from('<svg/>').toString('base64')}`)
  })
})

describe('firstLetter', () => {
  it("is the brand name's first letter, capitalised, skipping anything that is not one", () => {
    expect(firstLetter('Dod ar prieku')).toBe('D')
    expect(firstLetter('  brightwater')).toBe('B')
    expect(firstLetter('"Rīgas" Būve')).toBe('R')
    expect(firstLetter('Облако')).toBe('О')
    expect(firstLetter('42 Degrees')).toBe('4')
  })

  it('falls back to a bullet for a name with no letter or digit', () => {
    expect(firstLetter('  ')).toBe('•')
    expect(firstLetter('***')).toBe('•')
  })
})

describe('faviconSvg', () => {
  it('keeps the placeholder marker, names the brand and draws the supplied letter', () => {
    const svg = faviconSvg({ brand: 'Fish & "Chips"', ground: '#123456', letterMarkup: '<g id="letter"/>' })
    expect(svg).toContain('data-placeholder="true"')
    expect(svg).toContain('aria-label="Fish &amp; &quot;Chips&quot;"')
    expect(svg).toMatch(/<rect width="64" height="64" rx="14" fill="#123456"\/>/)
    expect(svg).toContain('<g id="letter"/>')
    expect(svg).toContain('viewBox="0 0 64 64"')
  })
})

describe('escapeXml', () => {
  it('escapes what an attribute cannot hold', () => {
    expect(escapeXml(`a&b<c>"d"'e'`)).toBe('a&amp;b&lt;c&gt;&quot;d&quot;&apos;e&apos;')
  })
})

describe('sharePhotoCardSvg', () => {
  const layout = {
    card: { width: 1200, height: 630 },
    centreX: 600,
    photo: {
      box: { x: 300, y: 70, width: 600, height: 400 },
      shadowBox: { x: 270, y: 60, width: 660, height: 450 },
      shadow: { blur: 14, dy: 16, opacity: 0.35 },
    },
  }

  it('lays the photo in the box the layout chose, under a shadow that follows its alpha', () => {
    const svg = sharePhotoCardSvg({
      layout,
      colours: { groundFrom: '#111111', groundTo: '#222222', plate: '#fafafa' },
      photo: 'data:photo',
      brandMarkup: '<g id="brand"/>',
    })
    expect(svg).toContain('width="1200" height="630"')
    expect(svg).toMatch(/<image href="data:photo" x="300" y="70" width="600" height="400"[^>]*filter="url\(#shadow\)"/)
    expect(svg).toContain('in="SourceAlpha"')
    expect(svg).toContain('<g id="brand"/>')
    expect(svg).not.toContain('<text')
  })
})
