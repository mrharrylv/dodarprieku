/** The charity map's own vocabularies, mapped onto ours. */
import type { CategoryId } from '../../../shared/src/catalog'
import type { LegalForm } from '../../../shared/src/contracts'

export const CSV_CATEGORIES = [
  'elderly_care',
  'disability_day_centre',
  'group_home',
  'respite_care',
  'family_support',
  'children_ngo',
  'food_aid',
  'soup_kitchen',
  'animal_shelter',
  'children_care',
  'boarding_school',
  'homeless_shelter',
  'crisis_centre',
  'charity_ngo',
  'social_service',
  'day_centre',
  'other',
] as const

export type CsvCategory = (typeof CSV_CATEGORIES)[number]

export const CATEGORY_MAP: Readonly<Record<CsvCategory, CategoryId>> = {
  elderly_care: 'pansionats',
  disability_day_centre: 'invaliditate',
  group_home: 'invaliditate',
  respite_care: 'invaliditate',
  family_support: 'gimenes-atbalsts',
  children_ngo: 'gimenes-atbalsts',
  food_aid: 'zupas-virtuve',
  soup_kitchen: 'zupas-virtuve',
  animal_shelter: 'dzivnieku-patversme',
  children_care: 'bernu-nams',
  boarding_school: 'skola',
  homeless_shelter: 'bezpajumtnieki',
  crisis_centre: 'krizes-centrs',
  charity_ngo: 'cits',
  social_service: 'cits',
  day_centre: 'cits',
  other: 'cits',
}

export const isCsvCategory = (v: string): v is CsvCategory => (CSV_CATEGORIES as readonly string[]).includes(v)

/** Uzņēmumu reģistra "Tiesiskā forma", by its first words. */
export const legalFormOf = (raw: string): LegalForm => {
  const v = raw.trim().toLowerCase()
  if (v.startsWith('biedrība')) return 'biedriba'
  if (v.startsWith('nodibinājums')) return 'nodibinajums'
  if (v.startsWith('pašvaldības')) return 'pasvaldibas-iestade'
  if (v.startsWith('valsts')) return 'valsts-iestade'
  if (v.startsWith('draudze') || v.startsWith('reliģisk') || v.includes('baznīcas')) return 'religiska-organizacija'
  if (v.startsWith('sabiedrība ar ierobežotu atbildību') || v.startsWith('akciju sabiedrība') || v === 'as') return 'komersants'
  return 'cits'
}

/**
 * When the register gave no legal form, the name sometimes states it:
 * 'Biedrība "Sadzirdēt"', 'Nodibinājums "CARITAS LATVIJA"', '... ev. lut. draudze'.
 * Only those unambiguous prefixes and suffixes count; anything else is 'cits'.
 */
export const legalFormFromName = (...names: readonly string[]): LegalForm => {
  for (const raw of names) {
    const v = raw.trim().toLowerCase().replace(/["„“”]/g, '')
    if (/^biedrība(s)?\s/u.test(v)) return 'biedriba'
    if (/^nodibinājum(s|a)\s/u.test(v)) return 'nodibinajums'
    if (/^draudze(s)?\s/u.test(v) || /\sdraudze$/u.test(v)) return 'religiska-organizacija'
  }
  return 'cits'
}
