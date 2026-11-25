import { describe, it, expect } from 'vitest'

import { resources } from '@/i18n'
import { isPlaceholder, isPlaceholderCopy, publishable, publishableCopy } from './placeholder'

/**
 * The values `config/site.ts` ships with in the TEMPLATE, as literals.
 *
 * Literals rather than imports: once a site fills in its real details, an
 * import would make this test assert that the real phone number is fake.
 * `seo.test.ts` covers the live config from the other side, by checking that
 * nothing published is a placeholder.
 */
const TEMPLATE_PLACEHOLDERS = {
  email: 'hello@example.com',
  phone: '+371 20 000 000',
  phoneE164: '+37120000000',
  whatsapp: '37120000000',
  street: 'Example street 1',
  domain: 'example.com',
  legalName: 'SIA "Example"',
  registrationNumber: '40203XXXXXX',
  vatNumber: 'LV40203XXXXXX',
  iban: 'LV00XXXX0000000000000',
  bank: '',
  registeredAddress: 'Example street 1, Rīga, LV-1010, Latvia',
} as const

const REAL_LOOKING = {
  email: 'info@hagroup.lv',
  phone: '+371 26 123 456',
  phoneE164: '+37126123456',
  street: 'Brīvības iela 21',
  domain: 'hagroup.lv',
  legalName: 'SIA "HA Group"',
  registrationNumber: '40203123456',
  vatNumber: 'LV40203123456',
  iban: 'LV80BANK0000435195001',
  city: 'Rīga',
  country: 'Latvia',
  social: 'https://www.linkedin.com/company/hagroup',
} as const

describe('isPlaceholder', () => {
  it.each(Object.entries(TEMPLATE_PLACEHOLDERS))('flags the template %s', (_, value) => {
    expect(isPlaceholder(value)).toBe(true)
  })

  it.each(Object.entries(REAL_LOOKING))('passes a real %s', (_, value) => {
    expect(isPlaceholder(value)).toBe(false)
  })

  it('flags nothing at all', () => {
    expect(isPlaceholder(null)).toBe(true)
    expect(isPlaceholder(undefined)).toBe(true)
    expect(isPlaceholder('   ')).toBe(true)
  })

  it('sees the zeros through spacing and dashes', () => {
    expect(isPlaceholder('+371 20-000-000')).toBe(true)
    expect(isPlaceholder('+371 20 000 001')).toBe(false)
  })

  it('does not mistake one X in a real name for the marker', () => {
    expect(isPlaceholder('SIA "Xpress"')).toBe(false)
    expect(isPlaceholder('LV40203XX1234')).toBe(false)
  })

  it('knows "example" as a word, not as a substring', () => {
    expect(isPlaceholder('Counterexamples Ltd')).toBe(false)
    expect(isPlaceholder('shop.example.org')).toBe(true)
  })
})

describe('publishable', () => {
  it('returns a real value trimmed', () => {
    expect(publishable('  info@hagroup.lv ')).toBe('info@hagroup.lv')
  })

  it('returns null for a placeholder or nothing', () => {
    expect(publishable(TEMPLATE_PLACEHOLDERS.email)).toBeNull()
    expect(publishable('')).toBeNull()
    expect(publishable(undefined)).toBeNull()
  })
})

/**
 * The instructions the template's locale files ship where the real copy goes,
 * verbatim, in every language: "Replace this with one sentence...". Literals,
 * for the reason the values above are: once a site writes its own copy, an
 * import would make this test call the real copy a placeholder.
 *
 * The services' four bodies share two texts, so each appears once.
 */
const TEMPLATE_COPY = {
  en: [
    'A short, concrete promise',
    'One or two sentences saying what you do, for whom, and why someone should read further. Say the thing plainly. A visitor decides in about five seconds.',
    'Three reasons, each worth a sentence.',
    'A short line framing the list below.',
    'Two or three sentences of substance about the business: how long it has been going, what it is good at, and who is behind it. Specifics beat adjectives: a number, a place, a year.',
    "Replace this with one sentence describing what the business does and who it is for. It is the line that appears under the site's name in search results.",
    'Replace with a sentence listing the main things the business offers, in the words a customer would use.',
    'A paragraph framing the offer. Keep it to what you actually sell. A list of everything you could conceivably do reads as a list of things you do badly.',
    'Describe the service in three or four sentences. Say what the customer gets, roughly what it costs, and how long it takes. Vague service descriptions are the most common reason a visitor leaves without asking.',
    'Describe the service in three or four sentences. Say what the customer gets, roughly what it costs, and how long it takes.',
    'Replace with a sentence about who runs the business and what it stands for.',
    'One paragraph. Who you are, how long you have been doing this, and where you are based.',
    'Two or three paragraphs of real history. When the business started, what it started doing, what changed. Specific beats impressive: a founding year and a first customer are worth more than a page of mission statement.',
  ],
  lv: [
    'Īss un konkrēts solījums',
    'Viens vai divi teikumi par to, ko jūs darāt, kam un kāpēc lasītājam būtu vērts lasīt tālāk. Sakiet to vienkārši: apmeklētājs izlemj apmēram piecās sekundēs.',
    'Trīs iemesli, katrs viena teikuma vērts.',
    'Īsa rindiņa, kas ievada zemāk redzamo sarakstu.',
    'Divi vai trīs saturīgi teikumi par uzņēmumu: cik ilgi tas darbojas, kas tam padodas vislabāk un kas aiz tā stāv. Konkrētība ir vērtīgāka par īpašības vārdiem: skaitlis, vieta, gads.',
    'Aizstājiet šo ar vienu teikumu par to, ko uzņēmums dara un kam tas ir domāts. Šī ir rindiņa, kas meklēšanas rezultātos parādās zem vietnes nosaukuma.',
    'Aizstājiet ar teikumu, kurā uzskaitīti galvenie uzņēmuma piedāvātie pakalpojumi, tādos vārdos, kādus lietotu pats klients.',
    'Rindkopa, kas ievada piedāvājumu. Rakstiet tikai to, ko patiešām pārdodat. Saraksts ar visu, ko teorētiski varētu izdarīt, izlasās kā saraksts ar lietām, kuras darāt slikti.',
    'Aprakstiet pakalpojumu trīs līdz četros teikumos. Pasakiet, ko klients saņem, aptuveni cik tas maksā un cik ilgs laiks tam vajadzīgs. Neskaidri pakalpojumu apraksti ir biežākais iemesls, kāpēc apmeklētājs aiziet, tā arī neko nepajautājis.',
    'Aprakstiet pakalpojumu trīs līdz četros teikumos. Pasakiet, ko klients saņem, aptuveni cik tas maksā un cik ilgs laiks tam vajadzīgs.',
    'Aizstājiet ar teikumu par to, kas vada uzņēmumu un kādas vērtības tas pārstāv.',
    'Viena rindkopa. Kas jūs esat, cik ilgi ar to nodarbojaties un kur atrodaties.',
    'Divas vai trīs rindkopas patiesas vēstures. Kad uzņēmums tika dibināts, ar ko tas sāka, kas mainījās. Konkrētība ir vērtīgāka par iespaidīgumu: dibināšanas gads un pirmais klients ir vairāk vērts nekā lappuse ar misijas formulējumu.',
  ],
  ru: [
    'Короткое и конкретное обещание',
    'Одно-два предложения о том, что вы делаете, для кого и почему стоит читать дальше. Скажите это просто: посетитель принимает решение примерно за пять секунд.',
    'Три причины, по одному предложению на каждую.',
    'Короткая строка, которая вводит список ниже.',
    'Два-три содержательных предложения о компании: сколько лет она работает, что умеет лучше всего и кто за ней стоит. Конкретика сильнее прилагательных: число, место, год.',
    'Замените этот текст одним предложением о том, чем занимается компания и для кого. Именно эта строка показывается под названием сайта в результатах поиска.',
    'Замените одним предложением: перечислите главное, что предлагает компания, теми словами, которыми это назвал бы клиент.',
    'Абзац, который задаёт рамку предложения. Пишите только о том, что вы действительно продаёте: перечень всего, что вы теоретически могли бы сделать, читается как перечень того, что вы делаете плохо.',
    'Опишите услугу в трёх-четырёх предложениях. Скажите, что получает клиент, сколько это примерно стоит и сколько занимает времени. Чаще всего посетитель уходит, так и не написав, именно из-за расплывчатого описания услуги.',
    'Опишите услугу в трёх-четырёх предложениях. Скажите, что получает клиент, сколько это примерно стоит и сколько занимает времени.',
    'Замените одним предложением о том, кто ведёт этот бизнес и на чём он стоит.',
    'Один абзац. Кто вы, сколько лет этим занимаетесь и где находитесь.',
    'Два-три абзаца настоящей истории. Когда появилась компания, с чего она начинала, что изменилось. Конкретное сильнее внушительного: год основания и первый клиент стоят больше, чем страница заявлений о миссии.',
  ],
} as const

const ALL_TEMPLATE_COPY: readonly string[] = Object.values(TEMPLATE_COPY).flat()

/**
 * Real copy that shares its first words, or a marker of the value check, with
 * the template's: none of it may be taken for a placeholder.
 */
const REAL_COPY = [
  'Describe the problem and we will tell you honestly whether we can help.',
  'Replace your old windows before winter: we measure, make and fit them in Rīga.',
  'Web shops for bakeries, for example, and for anyone else who sells by the kilo.',
  'One or two visits are usually enough to fix a leaking roof.',
  'A short, concrete quote within two working days.',
  'We sell XXXL workwear. Orders over 1000000 units ship free.',
  'Aprakstiet problēmu, un mēs godīgi pateiksim, vai varam palīdzēt.',
  'Aizstājiet vecos logus pirms ziemas: mēs izmērām, izgatavojam un uzstādām.',
  'Viena rindkopa par jums mūsu katalogā maksā mazāk nekā kafija.',
  'Опишите задачу, и мы честно скажем, можем ли мы помочь.',
  'Замените старые окна до зимы: замер, изготовление и монтаж в Риге.',
  'Один абзац договора защищает вас от скрытых платежей.',
]

/** Every string in every namespace of every locale the site ships. */
const localeStrings = (): ReadonlyArray<readonly [where: string, text: string]> => {
  const walk = (value: unknown, where: string): Array<readonly [string, string]> => {
    if (typeof value === 'string') return [[where, value]]
    if (value !== null && typeof value === 'object') {
      return Object.entries(value).flatMap(([key, child]) => walk(child, `${where}.${key}`))
    }
    return []
  }
  return Object.entries(resources).flatMap(([locale, namespaces]) =>
    Object.entries(namespaces).flatMap(([ns, bundle]) => walk(bundle, `${locale}/${ns}`)),
  )
}

describe('isPlaceholderCopy', () => {
  it.each(Object.entries(TEMPLATE_COPY).flatMap(([locale, texts]) => texts.map((text) => [locale, text] as const)))(
    'flags the template instruction (%s) %s',
    (_, text) => {
      expect(isPlaceholderCopy(text)).toBe(true)
    },
  )

  it.each(REAL_COPY)('passes real copy: %s', (text) => {
    expect(isPlaceholderCopy(text)).toBe(false)
  })

  it('flags nothing at all', () => {
    expect(isPlaceholderCopy(null)).toBe(true)
    expect(isPlaceholderCopy(undefined)).toBe(true)
    expect(isPlaceholderCopy(' \n ')).toBe(true)
  })

  it('sees an instruction however it was wrapped, cased or joined to real copy', () => {
    expect(isPlaceholderCopy('  replace THIS with one\n   sentence about the business.')).toBe(true)
    expect(isPlaceholderCopy('Keeping it working after it ships. Describe the service in three or four sentences.')).toBe(true)
    expect(isPlaceholderCopy('Абзац, который задает рамку предложения.')).toBe(true)
  })

  it('takes nothing the site ships for an instruction, except the template instructions themselves', () => {
    const flagged = localeStrings().filter(([, text]) => isPlaceholderCopy(text))
    expect(flagged.filter(([, text]) => !ALL_TEMPLATE_COPY.includes(text))).toEqual([])
  })
})

describe('isPlaceholder, given copy', () => {
  it.each(ALL_TEMPLATE_COPY)('flags the template instruction %s', (text) => {
    expect(isPlaceholder(text)).toBe(true)
  })
})

describe('publishableCopy', () => {
  it('returns real copy trimmed, and null for an instruction or nothing', () => {
    expect(publishableCopy('  We fit windows in Rīga. ')).toBe('We fit windows in Rīga.')
    expect(publishableCopy(TEMPLATE_COPY.en[5])).toBeNull()
    expect(publishableCopy('')).toBeNull()
    expect(publishableCopy(undefined)).toBeNull()
  })

  it('joins the parts that are real and drops the ones that are not', () => {
    expect(publishableCopy('Keeping it working after it ships.', TEMPLATE_COPY.en[9])).toBe('Keeping it working after it ships.')
    expect(publishableCopy('Keeping it working.', 'Around the clock.')).toBe('Keeping it working. Around the clock.')
    expect(publishableCopy(TEMPLATE_COPY.ru[0], TEMPLATE_COPY.ru[9])).toBeNull()
  })
})
