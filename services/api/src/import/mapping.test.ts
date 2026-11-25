import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CATEGORY_IDS } from '../../../shared/src/catalog'
import { LIMITS } from '../../../shared/src/contracts'
import { isImportedCharity } from '../domain/imported'
import { CATEGORY_MAP, CSV_CATEGORIES, isCsvCategory, legalFormFromName, legalFormOf } from './categories'
import { assignSlugs, convertCsv, sourceOf, toJsonLines } from './convert'
import { parseCsv, toRecords } from './csv'
import {
  cleanName, cutWords, descriptionOf, firstEmail, isApproximate, legalFormOfRow, phoneOf, postalCodeOf, rowToProfile,
  streetOf, websiteOf, type CsvRow,
} from './mapping'

const CSV = fileURLToPath(new URL('../../../../charity-map-2026-11-25.csv', import.meta.url))

const row = (over: Record<string, string> = {}): CsvRow => ({
  location_id: 'L0005',
  organization_name: 'Latvijas Sarkanais Krusts',
  organization_regcode: '40008002279',
  name: 'Biedrības "Latvijas Sarkanais Krusts" Vidzemes komiteja (Rūjienas iela 3E, Valka, Valkas nov.)',
  category: 'elderly_care',
  category_lv: 'Pansionāts / sociālās aprūpes centrs',
  email: 'LSK.Vidzeme@redcross.lv',
  other_emails: 'secretariat@redcross.lv; sac.valka@redcross.lv',
  phone: '+371 25668251',
  website: 'https://www.redcross.lv',
  address: 'Rūjienas iela 3E, Valka, Valkas nov., LV-4701',
  address_std: 'Rūjienas iela 3E, Valka, Valkas nov., LV-4701',
  city: 'Valka, Valkas nov.',
  lat: '57.784920',
  lon: '26.010520',
  regcode: '40008002279',
  legal_name: 'Latvijas Sarkanais Krusts',
  legal_form: 'Biedrība',
  legal_status: 'active',
  ...over,
})

describe('category map', () => {
  it('maps every CSV category onto a catalog category', () => {
    expect(Object.keys(CATEGORY_MAP).sort()).toEqual([...CSV_CATEGORIES].sort())
    for (const target of Object.values(CATEGORY_MAP)) expect(CATEGORY_IDS).toContain(target)
    expect(isCsvCategory('elderly_care')).toBe(true)
    expect(isCsvCategory('casino')).toBe(false)
  })

  it.skipIf(!existsSync(CSV))('covers every category in the real CSV', () => {
    const records = toRecords(parseCsv(readFileSync(CSV, 'utf8')))
    const unknown = [...new Set(records.map((r) => r.category ?? ''))].filter((c) => !isCsvCategory(c))
    expect(unknown).toEqual([])
  })

  it('maps legal forms by their first words', () => {
    expect(legalFormOf('Biedrība')).toBe('biedriba')
    expect(legalFormOf('Nodibinājums')).toBe('nodibinajums')
    expect(legalFormOf('Pašvaldības iestādes struktūrvienība')).toBe('pasvaldibas-iestade')
    expect(legalFormOf('Pašvaldības aģentūra')).toBe('pasvaldibas-iestade')
    expect(legalFormOf('Valsts pārvaldes iestāde')).toBe('valsts-iestade')
    expect(legalFormOf('Draudze')).toBe('religiska-organizacija')
    expect(legalFormOf('Reliģiskas organizācijas struktūrvienība')).toBe('religiska-organizacija')
    expect(legalFormOf('Katoļu baznīcas publisko tiesību juridiskā persona')).toBe('religiska-organizacija')
    expect(legalFormOf('Sabiedrība ar ierobežotu atbildību')).toBe('komersants')
    expect(legalFormOf('Akciju sabiedrība')).toBe('komersants')
    expect(legalFormOf('AS')).toBe('komersants')
    expect(legalFormOf('Struktūrvienība ')).toBe('cits')
  })

  it('reads the legal form from the name only when the register gave none', () => {
    expect(legalFormFromName('Biedrība "Sadzirdēt"')).toBe('biedriba')
    expect(legalFormFromName('Biedrības "Latvijas Sarkanais Krusts" Vidzemes komiteja')).toBe('biedriba')
    expect(legalFormFromName('Nodibinājums "CARITAS LATVIJA"')).toBe('nodibinajums')
    expect(legalFormFromName('Rīgas Svētā Pētera ev. lut. draudze')).toBe('religiska-organizacija')
    expect(legalFormFromName('Draudzes "Prieka vēsts" centrs')).toBe('religiska-organizacija')
    expect(legalFormFromName('Rīgas sociālais dienests', 'Biedrība "X"')).toBe('biedriba')
    expect(legalFormFromName('Biedrībnieku klubs', 'Draudzīgā aicinājuma centrs')).toBe('cits')
    expect(legalFormOfRow('', 'Nodibinājums "CARITAS LATVIJA"', 'Caritas grupa')).toBe('nodibinajums')
    expect(legalFormOfRow('Sabiedrība ar ierobežotu atbildību', 'Biedrība "X"')).toBe('komersants')
    expect(legalFormOf('')).toBe('cits')
  })
})

describe('field helpers', () => {
  it('strips a bracketed address that repeats the address, and keeps other brackets', () => {
    const addr = 'Rūjienas iela 3E, Valka, Valkas nov., LV-4701'
    expect(cleanName('Centrs (Rūjienas iela 3E, Valka)', addr, 'Valka, Valkas nov.')).toBe('Centrs')
    expect(cleanName('Centrs (Biešu iela 6 - 1, Rīga)', 'Biešu iela 6, Rīga, LV-1004', 'Rīga')).toBe('Centrs')
    expect(cleanName('Centrs (Biešu iela 7, Rīga)', 'Biešu iela 6, Rīga, LV-1004', 'Rīga')).toBe('Centrs (Biešu iela 7, Rīga)')
    expect(cleanName('Patversme (Mini zoo "Ķekaviņas līči")', addr, 'Valka')).toBe('Patversme (Mini zoo "Ķekaviņas līči")')
    expect(cleanName('Centrs ()', addr, 'Valka')).toBe('Centrs ()')
    expect(cleanName('  Two   spaces ', addr, 'Valka')).toBe('Two spaces')
  })

  it('cuts long text on a word boundary within the limit', () => {
    expect(cutWords('short', 10)).toBe('short')
    const cut = cutWords('alpha beta gamma delta epsilon', 16)
    expect(cut).toBe('alpha beta…')
    expect(cut.length).toBeLessThanOrEqual(16)
    expect(cutWords('abcdefghijklmnopqrstuvwxyz', 10)).toBe('abcdefghi…')
    expect(cutWords('Teen Challenge Latvija (rehabilitācijas centrs "Jaunsēļas")', 50)).toBe('Teen Challenge Latvija')
    const long = 'x'.repeat(LIMITS.orgName + 30)
    expect(cleanName(long, '', '').length).toBeLessThanOrEqual(LIMITS.orgName)
  })

  it('finds the postal code and the street', () => {
    expect(postalCodeOf('Iela 1, Rīga, LV-1013')).toBe('LV-1013')
    expect(postalCodeOf('Iela 1, Rīga, lv 1013')).toBe('')
    expect(postalCodeOf('Iela 1, Rīga, LV1013')).toBe('LV-1013')
    expect(streetOf('Parka iela 6, Madona, Madonas nov., LV-4801', 'Madona, Madonas novads')).toBe('Parka iela 6')
    expect(streetOf('Imantas 8. līnija 1, Rīga, LV-1083', 'Rīga')).toBe('Imantas 8. līnija 1')
    expect(streetOf('"Adamovas muiža", Adamova, Vērēmu pag., Rēzeknes nov., LV-4647', 'Vērēmu pag., Rēzeknes nov.')).toBe(
      '"Adamovas muiža", Adamova',
    )
    expect(streetOf('Klusā iela 2, Rīga, LV-1013', 'Cēsu prāvesta iecirknis (Vidzeme)')).toBe('Klusā iela 2, Rīga')
    expect(streetOf('Rīga', 'Rīga')).toBe('Rīga')
    expect(streetOf('', 'Rīga')).toBe('')
  })

  it('takes the first valid email, the first phone and only http(s) websites', () => {
    expect(firstEmail('', 'nope; B@x.lv, c@y.lv')).toBe('b@x.lv')
    expect(firstEmail('A@B.lv', 'c@d.lv')).toBe('a@b.lv')
    expect(firstEmail('', '')).toBe('')
    expect(phoneOf('+371 22429754; +371 67336653')).toBe('+371 22429754')
    expect(phoneOf('8898')).toBe('8898')
    expect(phoneOf('64222475 (lietvede); 28388112 (direktore)')).toBe('64222475')
    expect(phoneOf('26582019 (SMS only)')).toBe('26582019')
    expect(phoneOf('(+371) 20045442')).toBe('(+371) 20045442')
    expect(phoneOf('25472888 (lietvede), 22027832')).toBe('25472888')
    expect(phoneOf('1'.repeat(LIMITS.phone + 1))).toBe('')
    expect(websiteOf('https://www.redcross.lv')).toBe('https://www.redcross.lv')
    expect(websiteOf('http://a.lv')).toBe('http://a.lv')
    expect(websiteOf('www.a.lv')).toBeUndefined()
    expect(websiteOf('ftp://a.lv')).toBeUndefined()
    expect(websiteOf('')).toBeUndefined()
  })

  it('says so when the pin is only a settlement or municipality centre', () => {
    expect(isApproximate('building')).toBe(false)
    expect(isApproximate('')).toBe(false)
    expect(isApproximate('settlement')).toBe(true)
    expect(isApproximate('Municipality')).toBe(true)
    expect(isApproximate('street')).toBe(true)
    expect(descriptionOf('Zupas virtuve', 'Rīga', 'building')).not.toContain('Kartē')
    expect(descriptionOf('Zupas virtuve', 'Ape', 'settlement')).toContain('apdzīvotās vietas centrs, nevis precīza adrese.')
    expect(descriptionOf('Zupas virtuve', 'Ape', 'municipality')).toContain('novada centrs, nevis precīza adrese.')
    expect(descriptionOf('Zupas virtuve', 'Ape', 'street')).toContain('aptuvena')
    expect(rowToProfile(row({ coord_precision: 'settlement' }))).toMatchObject({ ok: true, approximate: true })
    expect(rowToProfile(row({ coord_precision: 'building' }))).toMatchObject({ ok: true, approximate: false })
    expect(rowToProfile(row({ legal_form: '', legal_name: '', organization_name: 'Biedrība "X"' }))).toMatchObject({
      ok: true,
      profile: { organization: { legalForm: 'biedriba' } },
    })
  })

  it('writes one neutral sentence from the data, without a double full stop', () => {
    expect(descriptionOf('Zupas virtuve', 'Rīga')).toBe(
      'Zupas virtuve, Rīga. Dati no publiskajiem reģistriem; iestāde savu profilu vēl nav papildinājusi.',
    )
    expect(descriptionOf('Cits', 'Valka, Valkas nov.')).toMatch(/^Organizācija, Valka, Valkas nov\. Dati/)
    expect(descriptionOf('', '')).toMatch(/^Organizācija\. Dati/)
    expect(descriptionOf('Ģimeņu atbalsts', '')).toMatch(/^Ģimeņu atbalsts\. Dati/)
  })
})

describe('rowToProfile', () => {
  it('maps a register row to an approved-looking profile without needs or contact person', () => {
    const r = rowToProfile(row())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.id).toBe('imp-L0005')
    expect(r.profile).toEqual({
      organization: {
        name: 'Biedrības "Latvijas Sarkanais Krusts" Vidzemes komiteja',
        legalName: 'Latvijas Sarkanais Krusts',
        regNumber: '40008002279',
        legalForm: 'biedriba',
        publicBenefit: false,
        email: 'lsk.vidzeme@redcross.lv',
        phone: '+371 25668251',
        website: 'https://www.redcross.lv',
      },
      contactPerson: { firstName: 'Nav norādīts', lastName: '', email: '', phone: '' },
      address: { street: 'Rūjienas iela 3E', city: 'Valka, Valkas nov.', postalCode: 'LV-4701' },
      location: { lat: 57.78492, lng: 26.01052 },
      category: 'pansionats',
      description: 'Pansionāts / sociālās aprūpes centrs, Valka, Valkas nov. Dati no publiskajiem reģistriem; iestāde savu profilu vēl nav papildinājusi.',
      photos: [],
      needs: [],
      delivery: { parcelLockers: [], inPerson: { address: 'Rūjienas iela 3E, Valka, Valkas nov., LV-4701' } },
      sponsors: [],
    })
  })

  it('falls back to the organisation fields and tolerates an empty reg. number', () => {
    const r = rowToProfile(row({ regcode: '', organization_regcode: '', legal_name: '', website: 'n/a', legal_form: '', email: '', other_emails: '' }))
    expect(r).toMatchObject({
      ok: true,
      // No legal_form: the name ('Biedrības "Latvijas Sarkanais Krusts" ...') states it.
      profile: { organization: { regNumber: '', legalName: 'Latvijas Sarkanais Krusts', legalForm: 'biedriba', email: '' } },
    })
    if (r.ok) expect(r.profile.organization).not.toHaveProperty('website')
    const named = rowToProfile(row({ name: '', legal_name: '', organization_name: 'Org' }))
    expect(named).toMatchObject({ ok: true, profile: { organization: { name: 'Org', legalName: 'Org' } } })
    const noAddress = rowToProfile(row({ address_std: '', address: '' }))
    expect(noAddress.ok && noAddress.profile.delivery).toEqual({ parcelLockers: [] })
  })

  it('skips terminated, nameless, placeless and id-less rows, and stops on an unknown category', () => {
    expect(rowToProfile(row({ legal_status: 'terminated 2023-08-01' }))).toEqual({ ok: false, id: 'imp-L0005', reason: 'terminated' })
    expect(rowToProfile(row({ name: '', organization_name: '' }))).toMatchObject({ ok: false, reason: 'no name' })
    expect(rowToProfile(row({ lat: '' }))).toMatchObject({ ok: false, reason: 'no location in Latvia' })
    expect(rowToProfile(row({ lat: '40.1' }))).toMatchObject({ ok: false, reason: 'no location in Latvia' })
    expect(rowToProfile(row({ location_id: '' }))).toMatchObject({ ok: false, reason: 'no location_id' })
    expect(() => rowToProfile(row({ category: 'casino' }))).toThrow(/CATEGORY_MAP/)
  })
})

describe('convertCsv', () => {
  it('makes slugs unique: the city for repeated names, then a number', () => {
    expect(assignSlugs([
      { id: 'imp-L1', name: 'Sarkanais Krusts', city: 'Valka, Valkas nov.' },
      { id: 'imp-L2', name: 'Sarkanais Krusts', city: 'Rīga' },
      { id: 'imp-L3', name: 'Sarkanais Krusts', city: 'Rīga' },
      { id: 'imp-L4', name: 'Sarkanais Krusts', city: '' },
      { id: 'imp-L5', name: 'Ulubele', city: 'Rīga' },
    ])).toEqual(['sarkanais-krusts-valka', 'sarkanais-krusts-riga', 'sarkanais-krusts-riga-l3', 'sarkanais-krusts', 'ulubele'])
    const long = assignSlugs([{ id: 'imp-L1', name: 'vārds '.repeat(30), city: '' }])[0]!
    expect(long.length).toBeLessThanOrEqual(54)
    expect(long.endsWith('-')).toBe(false)
    expect(assignSlugs([{ id: 'imp-L1', name: 'x'.repeat(80), city: '' }])[0]).toBe('x'.repeat(54))
    const longDupes = assignSlugs([
      { id: 'imp-L0001', name: 'x'.repeat(80), city: '' },
      { id: 'imp-L0002', name: 'x'.repeat(80), city: '' },
    ])
    expect(longDupes).toEqual(['x'.repeat(54), `${'x'.repeat(54)}-l0002`])
    expect(longDupes[1]!.length).toBeLessThanOrEqual(60)
  })

  it('keeps slugs stable when rows are added or reordered', () => {
    const a = { id: 'imp-L10', name: 'Sarkanais Krusts', city: 'Rīga' }
    const b = { id: 'imp-L20', name: 'Sarkanais Krusts', city: 'Rīga' }
    const first = assignSlugs([a, b])
    expect(first).toEqual(['sarkanais-krusts-riga', 'sarkanais-krusts-riga-l20'])
    const previous = new Map([[a.id, first[0]!], [b.id, first[1]!]])
    const added = { id: 'imp-L05', name: 'Sarkanais Krusts', city: 'Rīga' }
    expect(assignSlugs([added, b, a], previous)).toEqual(['sarkanais-krusts-riga-l05', 'sarkanais-krusts-riga-l20', 'sarkanais-krusts-riga'])
    // A name that was unique and now repeats keeps its old slug; only the newcomer gets the city.
    const solo = { id: 'imp-L1', name: 'Ulubele', city: 'Rīga' }
    expect(assignSlugs([solo, { id: 'imp-L2', name: 'Ulubele', city: 'Cēsis' }], new Map([[solo.id, 'ulubele']]))).toEqual([
      'ulubele',
      'ulubele-cesis',
    ])
    // Without previous slugs, the suffix comes from the id, so file order does not matter.
    expect(assignSlugs([b, a])).toEqual(['sarkanais-krusts-riga', 'sarkanais-krusts-riga-l10'])
    expect(assignSlugs([added, a, b])[2]).toBe('sarkanais-krusts-riga-l20')
  })

  it('converts a CSV into valid import items and lists what it skipped', () => {
    const header = 'location_id,name,category,category_lv,address_std,city,lat,lon,legal_status'
    const text = [
      header,
      'L1,"Dienas centrs ""Mēs""",day_centre,Dienas centrs,"Iela 1, Rīga, LV-1083",Rīga,56.9,24.1,active',
      'L2,"Dienas centrs ""Mēs""",day_centre,Dienas centrs,"Iela 2, Rīga, LV-1083",Rīga,56.9,24.1,',
      'L3,Old,other,Cits,"Iela 3, Rīga",Rīga,56.9,24.1,terminated 2023-08-01',
    ].join('\r\n')
    const { items, skipped, approximate } = convertCsv(text, 'import:test')
    expect(approximate).toEqual([])
    expect(convertCsv(text, 'import:test', new Map([['imp-L2', 'mes-otrais']])).items.map((i) => i.slug)).toEqual([
      'dienas-centrs-mes-riga',
      'mes-otrais',
    ])
    expect(items.map((i) => [i.id, i.slug])).toEqual([['imp-L1', 'dienas-centrs-mes-riga'], ['imp-L2', 'dienas-centrs-mes-riga-l2']])
    expect(items.every(isImportedCharity)).toBe(true)
    expect(skipped).toEqual([{ id: 'imp-L3', reason: 'terminated' }])
    const json = toJsonLines(items)
    expect(json.split('\n')).toHaveLength(5)
    expect(JSON.parse(json)).toEqual(items)
  })

  it('names the source after the file', () => {
    expect(sourceOf('/x/y/charity-map-2026-11-25.csv')).toBe('import:charity-map-2026-11-25')
    expect(sourceOf('C:\\data\\Map.CSV')).toBe('import:map')
  })

  it.skipIf(!existsSync(CSV))('converts the real CSV: every active row, valid, unique slugs', () => {
    const { items, skipped, approximate } = convertCsv(readFileSync(CSV, 'utf8'), sourceOf(CSV))
    expect(items.length).toBeGreaterThan(1000)
    expect(skipped.every((s) => s.reason === 'terminated')).toBe(true)
    expect(approximate.length).toBeGreaterThan(0)
    expect(items.every(isImportedCharity)).toBe(true)
    expect(new Set(items.map((i) => i.slug)).size).toBe(items.length)
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length)
  })
})
