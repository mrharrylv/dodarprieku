/**
 * Sample charities for the local dev server. Fictional organisations with
 * plausible Latvian details; every profile goes through validateProfile in
 * seed.ts, so a sample that the API would refuse fails the seed test.
 */
import type { CategoryId } from '../../../shared/src/catalog'
import type { DeliveryOptions, Need, Sponsor } from '../../../shared/src/contracts'

export interface Sample {
  readonly name: string
  readonly legalName: string
  readonly regNumber: string
  readonly legalForm: 'biedriba' | 'nodibinajums' | 'pasvaldibas-iestade'
  readonly category: CategoryId
  readonly city: string
  readonly street: string
  readonly postalCode: string
  readonly lat: number
  readonly lng: number
  readonly description: string
  readonly needs: readonly Need[]
  readonly delivery: DeliveryOptions
  readonly sponsors: readonly Sponsor[]
  readonly slugHint: string
  readonly colour: readonly [number, number, number]
}

const need = (itemId: string, urgent = false, note?: string): Need => ({ itemId, urgent, ...(note ? { note } : {}) })

export const APPROVED_SAMPLES: readonly Sample[] = [
  {
    name: 'Dzīvnieku patversme Ķepa',
    legalName: 'Biedrība "Ķepa"',
    regNumber: '40008100001',
    legalForm: 'biedriba',
    category: 'dzivnieku-patversme',
    city: 'Rīga',
    street: 'Dzirciema iela 12',
    postalCode: 'LV-1007',
    lat: 56.9566,
    lng: 24.0663,
    description:
      'Mēs rūpējamies par vairāk nekā 80 suņiem un kaķiem, kuri gaida jaunas mājas. Katru dienu mums palīdz brīvprātīgie, bet barības un aprūpes līdzekļu vienmēr pietrūkst.',
    needs: [
      need('sausa-bariba-kakiem', true, 'Īpaši kaķēniem līdz gada vecumam'),
      need('sausa-bariba-suniem'),
      need('smiltis', true),
      need('segas-dzivniekiem', false, 'Var būt lietotas, bet tīras'),
      need('brivpratigie', false, 'Suņu pastaigām brīvdienās'),
    ],
    delivery: {
      inPerson: { address: 'Dzirciema iela 12, Rīga', hours: 'Katru dienu 10:00-18:00' },
      parcelLockers: [{ provider: 'omniva', name: 'Omniva pakomāts Spice', address: 'Lielirbes iela 29, Rīga' }],
    },
    sponsors: [
      { name: 'SIA “Labie Kaimiņi”', url: 'https://labiekaimini.example.com' },
      { name: 'AS Ziemeļu Maiznīca' },
    ],
    slugHint: 'kepa',
    colour: [214, 160, 90],
  },
  {
    name: 'Jelgavas bērnu nams Saulespuķe',
    legalName: 'Jelgavas valstspilsētas pašvaldības iestāde "Saulespuķe"',
    regNumber: '90000100002',
    legalForm: 'pasvaldibas-iestade',
    category: 'bernu-nams',
    city: 'Jelgava',
    street: 'Lielā iela 30',
    postalCode: 'LV-3001',
    lat: 56.6511,
    lng: 23.7214,
    description:
      'Mūsu ģimeniskajā vidē dzīvo 24 bērni vecumā no 3 līdz 17 gadiem. Mēs priecāsimies par skolas piederumiem, siltām drēbēm un galda spēlēm vakariem.',
    needs: [
      need('ziemas-apgerbs', true, 'Izmēri 128-164'),
      need('skolas-somas'),
      need('kancelejas-preces'),
      need('galda-speles'),
    ],
    delivery: {
      inPerson: { address: 'Lielā iela 30, Jelgava', hours: 'Darba dienās 9:00-17:00' },
      post: { address: 'Lielā iela 30, Jelgava, LV-3001' },
      parcelLockers: [],
    },
    sponsors: [{ name: 'Labie Kaimiņi', url: 'https://labiekaimini.example.com' }],
    slugHint: 'saulespuke',
    colour: [120, 170, 220],
  },
  {
    name: 'Liepājas sociālās aprūpes centrs Jūrmala',
    legalName: 'Nodibinājums "Aprūpes centrs Jūrmala"',
    regNumber: '40008100003',
    legalForm: 'nodibinajums',
    category: 'pansionats',
    city: 'Liepāja',
    street: 'Jūrmalas iela 5',
    postalCode: 'LV-3401',
    lat: 56.5047,
    lng: 21.0108,
    description:
      'Pansionātā dzīvo 60 seniori. Daudziem no viņiem nav tuvinieku, tāpēc mums ļoti noder gan kopšanas līdzekļi, gan grāmatas un rokdarbu materiāli brīvajam laikam.',
    needs: [
      need('pieauguso-autini', true, 'Izmērs L un XL'),
      need('kopsanas-krems'),
      need('rokdarbu-materiali', false, 'Dzija un adāmadatas'),
      need('zekes'),
    ],
    delivery: {
      inPerson: { address: 'Jūrmalas iela 5, Liepāja', hours: 'Darba dienās 8:00-16:00' },
      parcelLockers: [{ provider: 'dpd', name: 'DPD Pickup Ostmala', address: 'Rožu laukums 5, Liepāja' }],
    },
    sponsors: [{ name: 'SIA Labie Kaimiņi' }, { name: 'Kurzemes Drukātava' }],
    slugHint: 'jurmala',
    colour: [150, 200, 160],
  },
  {
    name: 'Krīzes centrs Patvērums',
    legalName: 'Biedrība "Patvērums Daugavpilī"',
    regNumber: '40008100004',
    legalForm: 'biedriba',
    category: 'krizes-centrs',
    city: 'Daugavpils',
    street: 'Rīgas iela 44',
    postalCode: 'LV-5401',
    lat: 55.8747,
    lng: 26.5362,
    description:
      'Sniedzam drošu patvērumu sievietēm un bērniem, kuri cietuši no vardarbības. Bieži cilvēki pie mums ierodas tikai ar to, kas mugurā.',
    needs: [
      need('partika-ilgi-glabajama', true),
      need('apgerbs-sievietem', false, 'Tikai jauns vai ļoti labā stāvoklī'),
      need('autinbiksites-krize', true, 'Izmēri 4 un 5'),
      need('rotallietas-krize'),
    ],
    delivery: {
      dropOff: { address: 'Saules iela 10, Daugavpils (veikals “Pie Ilzes”)', hours: 'Darba dienās 10:00-19:00' },
      parcelLockers: [],
    },
    sponsors: [{ name: 'Ziemeļu Maiznīca AS' }],
    slugHint: 'patverums',
    colour: [200, 140, 180],
  },
  {
    name: 'Valmieras zupas virtuve Siltums',
    legalName: 'Biedrība "Siltums Valmierā"',
    regNumber: '40008100005',
    legalForm: 'biedriba',
    category: 'zupas-virtuve',
    city: 'Valmiera',
    street: 'Rīgas iela 15',
    postalCode: 'LV-4201',
    lat: 57.5385,
    lng: 25.4264,
    description:
      'Katru darba dienu pagatavojam siltas pusdienas aptuveni 120 cilvēkiem. Pārtikas krājumi mums jāpapildina katru nedēļu.',
    needs: [need('graudaugi', true), need('konservi'), need('ella'), need('vienreizejie-trauki')],
    delivery: {
      inPerson: { address: 'Rīgas iela 15, Valmiera', hours: 'Darba dienās 8:00-14:00' },
      parcelLockers: [],
    },
    sponsors: [],
    slugHint: 'siltums',
    colour: [230, 190, 110],
  },
  {
    name: 'Cēsu ģimeņu atbalsta centrs Pavards',
    legalName: 'Biedrība "Pavards"',
    regNumber: '40008100006',
    legalForm: 'biedriba',
    category: 'gimenes-atbalsts',
    city: 'Cēsis',
    street: 'Lenču iela 8',
    postalCode: 'LV-4101',
    lat: 57.3119,
    lng: 25.2706,
    description:
      'Palīdzam daudzbērnu un trūcīgām ģimenēm Cēsu novadā. Īpaši gaidām mēbeles un sadzīves tehniku ģimenēm, kuras tikko pārcēlušās uz jaunu dzīvokli.',
    needs: [need('mebeles', false, 'Gultas un skapji'), need('sadzives-tehnika'), need('skolas-piederumi', true)],
    delivery: {
      inPerson: { address: 'Lenču iela 8, Cēsis', hours: 'Otrdienās un ceturtdienās 12:00-18:00' },
      parcelLockers: [{ provider: 'omniva', name: 'Omniva pakomāts Cēsu Maxima', address: 'Valmieras iela 21, Cēsis' }],
    },
    sponsors: [{ name: '“Labie kaimiņi” SIA' }],
    slugHint: 'pavards',
    colour: [180, 160, 220],
  },
]

export const PENDING_SAMPLES: readonly Sample[] = [
  {
    name: 'Tukuma hospiss Gaisma',
    legalName: 'Nodibinājums "Gaisma Tukumā"',
    regNumber: '40008100007',
    legalForm: 'nodibinajums',
    category: 'hospiss',
    city: 'Tukums',
    street: 'Talsu iela 3',
    postalCode: 'LV-3101',
    lat: 56.967,
    lng: 23.155,
    description: 'Paliatīvās aprūpes nodaļa ar 12 vietām. Mēs gādājam, lai pēdējās dienas pacientiem būtu mierīgas un siltas.',
    needs: [need('pledi-hospiss', true), need('ziedi-istabam')],
    delivery: { inPerson: { address: 'Talsu iela 3, Tukums' }, parcelLockers: [] },
    sponsors: [],
    slugHint: 'gaisma',
    colour: [240, 220, 150],
  },
  {
    name: 'Rēzeknes patversme Ceļa Maize',
    legalName: 'Biedrība "Ceļa Maize"',
    regNumber: '40008100008',
    legalForm: 'biedriba',
    category: 'bezpajumtnieki',
    city: 'Rēzekne',
    street: 'Atbrīvošanas aleja 90',
    postalCode: 'LV-4601',
    lat: 56.5099,
    lng: 27.3331,
    description: 'Naktspatversme bezpajumtniekiem ar 30 gultasvietām. Ziemā vietu pietrūkst, tāpat kā siltu drēbju.',
    needs: [need('ziemas-jakas', true), need('siltas-zekes'), need('gulammaisi')],
    delivery: { inPerson: { address: 'Atbrīvošanas aleja 90, Rēzekne', hours: 'Katru dienu 18:00-22:00' }, parcelLockers: [] },
    sponsors: [],
    slugHint: 'cela-maize',
    colour: [160, 170, 180],
  },
]
