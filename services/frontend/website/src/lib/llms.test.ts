import { describe, it, expect } from 'vitest'

import { llmsTxt, pageText, siteFacts } from './llms'

const TEMPLATE = {
  brand: 'Dodar prieku',
  country: 'Latvia',
  languages: ['English', 'Latviešu', 'Русский'],
  legalName: 'SIA "Example"',
  registrationNumber: '40203XXXXXX',
  vatNumber: 'LV40203XXXXXX',
  registeredAddress: 'Example street 1, Rīga, LV-1010, Latvia',
  email: 'hello@example.com',
  phone: '+371 20 000 000',
  profiles: [''],
}

const REAL = {
  ...TEMPLATE,
  brand: 'HA Group',
  legalName: 'SIA "HA Group"',
  registrationNumber: '40203123456',
  vatNumber: 'LV40203123456',
  registeredAddress: 'Brīvības iela 21, Rīga, LV-1050, Latvia',
  email: 'info@hagroup.lv',
  phone: '+371 26 123 456',
  profiles: ['https://www.linkedin.com/company/hagroup'],
}

describe('siteFacts', () => {
  it('states only what is real: with the template values, the brand, the country and the languages', () => {
    expect(siteFacts(TEMPLATE)).toEqual([
      'Dodar prieku operates in Latvia.',
      'The site is published in English, Latviešu and Русский.',
    ])
  })

  it('never repeats a placeholder', () => {
    expect(siteFacts(TEMPLATE).join(' ')).not.toMatch(/example|X{3,}|000 000/i)
  })

  it('states every real detail', () => {
    expect(siteFacts(REAL)).toEqual([
      'HA Group operates in Latvia.',
      'The site is published in English, Latviešu and Русский.',
      'The business is SIA "HA Group", registration number 40203123456, VAT number LV40203123456.',
      'Registered address: Brīvības iela 21, Rīga, LV-1050, Latvia.',
      'Contact: email info@hagroup.lv, telephone +371 26 123 456.',
      'Profiles: https://www.linkedin.com/company/hagroup.',
    ])
  })

  it('names the business without identifiers when only the name is real', () => {
    const facts = siteFacts({ ...TEMPLATE, legalName: 'SIA "HA Group"' })
    expect(facts).toContain('The business is SIA "HA Group".')
  })

  it('handles one language, and none', () => {
    expect(siteFacts({ ...TEMPLATE, languages: ['English'] })).toContain('The site is published in English.')
    expect(siteFacts({ brand: 'X Co', country: 'LV', languages: [] })).toEqual(['X Co operates in LV.'])
  })
})

describe('pageText', () => {
  it('reads a title and description at a dotted key', () => {
    const ns = { privacy: { meta: { title: 'Privacy', description: 'What we keep.' } } }
    expect(pageText(ns, 'privacy.meta', 'en/legal.json')).toEqual({ title: 'Privacy', description: 'What we keep.' })
  })

  it('names the file and key when either is missing', () => {
    expect(() => pageText({ meta: { title: 'x' } }, 'meta', 'lv/home.json')).toThrow(/lv\/home\.json.*"meta"/)
    expect(() => pageText(null, 'meta', 'ru/about.json')).toThrow(/ru\/about\.json/)
  })
})

describe('llmsTxt', () => {
  const text = llmsTxt({
    brand: 'HA Group',
    summary: 'DevOps consulting and cloud engineering\nfor growing companies.',
    facts: ['HA Group operates in Latvia.', 'The site is published in English.'],
    pages: [{ title: 'Services', description: 'What we do.', url: 'https://hagroup.lv/en/services' }],
    optional: [{ title: 'Privacy policy', description: 'What we keep.', url: 'https://hagroup.lv/en/legal/privacy' }],
  })

  it('has the llmstxt.org shape: H1, blockquote, text, then link sections', () => {
    const lines = text.split('\n')
    expect(lines[0]).toBe('# HA Group')
    expect(lines[2]).toBe('> DevOps consulting and cloud engineering for growing companies.')
    expect(lines[4]).toBe('HA Group operates in Latvia. The site is published in English.')
    expect(text).toContain('## Pages\n\n- [Services](https://hagroup.lv/en/services): What we do.')
    expect(text).toContain('## Optional\n\n- [Privacy policy](https://hagroup.lv/en/legal/privacy): What we keep.')
    expect(text.endsWith('\n')).toBe(true)
  })

  it('has exactly one H1', () => {
    expect(text.match(/^# /gm)).toHaveLength(1)
  })

  it('leaves out empty sections', () => {
    const bare = llmsTxt({ brand: 'X', summary: 'Y', facts: [], pages: [], optional: [] })
    expect(bare).toBe('# X\n\n> Y\n')
  })

  it("repeats none of the template's instructions: no summary, and a link with no note", () => {
    const drafted = llmsTxt({
      brand: 'X',
      summary: 'Replace this with one sentence describing what the business does.',
      facts: [],
      pages: [
        { title: 'About', description: 'Replace with a sentence about who runs the business.', url: 'https://x.lv/en/about' },
        { title: 'Contact', description: 'Get in touch by email.', url: 'https://x.lv/en/contact' },
      ],
      optional: [],
    })
    expect(drafted).toBe(
      '# X\n\n## Pages\n\n- [About](https://x.lv/en/about)\n- [Contact](https://x.lv/en/contact): Get in touch by email.\n',
    )
  })
})
