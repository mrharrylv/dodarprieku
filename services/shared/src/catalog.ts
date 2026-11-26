/**
 * What kinds of institution can register, and what each of them typically
 * needs. The registration wizard offers a category's `needs` as tick boxes;
 * the charity can add a note to each and add custom items of its own.
 *
 * Ids are stable: they are stored in profiles and pledges. Rename a label
 * freely, never an id. Money is deliberately absent (out of scope for now).
 *
 * `icon` names an inline SVG icon the website draws (CategoryIcon). No icon
 * font, no CDN.
 */

export type CategoryId =
  | 'dzivnieku-patversme'
  | 'bernu-nams'
  | 'pansionats'
  | 'slimnica'
  | 'hospiss'
  | 'krizes-centrs'
  | 'bezpajumtnieki'
  | 'zupas-virtuve'
  | 'gimenes-atbalsts'
  | 'invaliditate'
  | 'skola'
  | 'ukrainas-atbalsts'
  | 'cits'

export type CategoryIcon =
  | 'paw'
  | 'child'
  | 'elder'
  | 'hospital'
  | 'candle'
  | 'shield'
  | 'home'
  | 'soup'
  | 'family'
  | 'wheelchair'
  | 'school'
  | 'heart-flag'
  | 'heart'

/**
 * Colour token names. `brown` is the warm neutral of "Cita organizācija": a
 * grey one read as a greyed-out pin once organisations without needs are drawn
 * faded (Harry, 2026-11-26).
 */
export type CategoryTone =
  | 'amber' | 'sky' | 'violet' | 'rose' | 'slate' | 'emerald' | 'orange' | 'teal' | 'indigo' | 'lime' | 'cyan' | 'yellow' | 'brown'

export interface NeedItem {
  readonly id: string
  readonly label: string
}

export interface NeedGroup {
  readonly id: string
  readonly label: string
  readonly items: readonly NeedItem[]
}

export interface Category {
  readonly id: CategoryId
  readonly label: string
  /** Plural, for filters: "Dzīvnieku patversmes". */
  readonly plural: string
  readonly icon: CategoryIcon
  /** A colour token name the website maps to a CSS variable (never a hex here). */
  readonly tone: CategoryTone
  readonly needs: readonly NeedGroup[]
}

const g = (id: string, label: string, items: readonly [string, string][]): NeedGroup => ({
  id,
  label,
  items: items.map(([itemId, itemLabel]) => ({ id: itemId, label: itemLabel })),
})

// Groups shared by several categories.
const HYGIENE = g('higiena', 'Higiēna', [
  ['ziepes', 'Ziepes un dušas želeja'],
  ['zobu-pasta', 'Zobu pasta un birstes'],
  ['sampuns', 'Šampūns'],
  ['autini', 'Mitrās salvetes'],
  ['tualetes-papirs', 'Tualetes papīrs'],
  ['skuvekli', 'Skuvekļi'],
  ['higienas-preces-sievietem', 'Sieviešu higiēnas preces'],
])
const TEXTILES = g('tekstils', 'Tekstils', [
  ['dvieli', 'Dvieļi'],
  ['gultas-vela', 'Gultas veļa'],
  ['segas', 'Segas'],
  ['spilveni', 'Spilveni'],
  ['pledi', 'Pledi'],
])
const CLEANING = g('tirisana', 'Tīrīšana', [
  ['mazgasanas-lidzekli', 'Veļas mazgāšanas līdzekļi'],
  ['tirisanas-lidzekli', 'Tīrīšanas līdzekļi'],
  ['dezinfekcija', 'Dezinfekcijas līdzekļi'],
  ['atkritumu-maisi', 'Atkritumu maisi'],
])
const VOLUNTEERS = g('palidziba', 'Palīdzība', [
  ['brivpratigie', 'Brīvprātīgie'],
  ['transports', 'Transports un piegāde'],
  ['remontdarbi', 'Remontdarbi'],
])

export const CATEGORIES: readonly Category[] = [
  {
    id: 'dzivnieku-patversme',
    label: 'Dzīvnieku patversme',
    plural: 'Dzīvnieku patversmes',
    icon: 'paw',
    tone: 'amber',
    needs: [
      g('bariba', 'Barība', [
        ['sausa-bariba-suniem', 'Sausā barība suņiem'],
        ['sausa-bariba-kakiem', 'Sausā barība kaķiem'],
        ['konservi-suniem', 'Konservi suņiem'],
        ['konservi-kakiem', 'Konservi kaķiem'],
        ['bariba-kakeniem-kuceniem', 'Barība kaķēniem un kucēniem'],
        ['gardumi', 'Gardumi'],
      ]),
      g('aprupe', 'Aprūpe', [
        ['smiltis', 'Kaķu pakaiši'],
        ['segas-dzivniekiem', 'Segas un dvieļi'],
        ['gulvietas', 'Guļvietas'],
        ['rotallietas', 'Rotaļlietas'],
        ['siksnas-kaklasiksnas', 'Pavadas un kakla siksnas'],
        ['blodas', 'Bļodas'],
        ['transportesanas-bures', 'Transportēšanas būri'],
      ]),
      g('veseliba', 'Veselība', [
        ['pretblusu-lidzekli', 'Pretblusu un pretērču līdzekļi'],
        ['vitamini', 'Vitamīni'],
        ['veterinaras-preces', 'Pārsienamie un veterinārās preces'],
        ['autini-dzivniekiem', 'Absorbējošie paladziņi'],
      ]),
      CLEANING,
      VOLUNTEERS,
    ],
  },
  {
    id: 'bernu-nams',
    label: 'Bērnu nams',
    plural: 'Bērnu nami',
    icon: 'child',
    tone: 'sky',
    needs: [
      g('apgerbs', 'Apģērbs', [
        ['apgerbs-zidainiem', 'Apģērbs zīdaiņiem'],
        ['apgerbs-berniem', 'Apģērbs bērniem'],
        ['apgerbs-pusaudziem', 'Apģērbs pusaudžiem'],
        ['apavi', 'Apavi'],
        ['ziemas-apgerbs', 'Ziemas apģērbs'],
      ]),
      g('macibas', 'Mācības un brīvais laiks', [
        ['kancelejas-preces', 'Kancelejas preces'],
        ['skolas-somas', 'Skolas somas'],
        ['gramatas', 'Grāmatas'],
        ['rotallietas-berniem', 'Rotaļlietas'],
        ['galda-speles', 'Galda spēles'],
        ['sporta-inventars', 'Sporta inventārs'],
        ['datori', 'Datori un planšetes'],
      ]),
      g('zidainiem', 'Zīdaiņiem', [
        ['autinbiksites', 'Autiņbiksītes'],
        ['bernu-partika', 'Bērnu pārtika'],
        ['ratini', 'Ratiņi'],
      ]),
      HYGIENE,
      TEXTILES,
      VOLUNTEERS,
    ],
  },
  {
    id: 'pansionats',
    label: 'Pansionāts',
    plural: 'Pansionāti',
    icon: 'elder',
    tone: 'violet',
    needs: [
      g('aprupe-seniori', 'Aprūpe', [
        ['pieauguso-autini', 'Pieaugušo autiņbiksītes'],
        ['paladzini', 'Absorbējošie paladziņi'],
        ['mitras-salvetes', 'Mitrās salvetes'],
        ['cimdi', 'Vienreizējie cimdi'],
        ['kopsanas-krems', 'Ādas kopšanas krēmi'],
      ]),
      g('palidzlidzekli', 'Palīglīdzekļi', [
        ['ratinkresli', 'Ratiņkrēsli'],
        ['staiguli', 'Staiguļi un spieķi'],
        ['funkcionalas-gultas', 'Funkcionālās gultas'],
        ['pretizgulejumu-matraci', 'Pretizgulējumu matrači'],
      ]),
      g('briva-laika', 'Brīvais laiks', [
        ['gramatas-seniori', 'Grāmatas un žurnāli'],
        ['rokdarbu-materiali', 'Rokdarbu materiāli'],
        ['galda-speles-seniori', 'Galda spēles'],
        ['radio-televizors', 'Radio un televizori'],
      ]),
      g('apgerbs-seniori', 'Apģērbs', [
        ['silts-apgerbs', 'Silts apģērbs'],
        ['zekes', 'Zeķes'],
        ['majas-apavi', 'Mājas apavi'],
      ]),
      HYGIENE,
      TEXTILES,
      VOLUNTEERS,
    ],
  },
  {
    id: 'slimnica',
    label: 'Slimnīca',
    plural: 'Slimnīcas',
    icon: 'hospital',
    tone: 'rose',
    needs: [
      g('pacientiem', 'Pacientiem', [
        ['halati', 'Halāti un pidžamas'],
        ['cibas', 'Čības'],
        ['higienas-komplekti', 'Higiēnas komplekti'],
        ['gramatas-pacientiem', 'Grāmatas'],
        ['rotallietas-bernu-nodalai', 'Rotaļlietas bērnu nodaļai'],
      ]),
      g('aprikojums', 'Aprīkojums', [
        ['medicinas-aprikojums', 'Medicīnas aprīkojums'],
        ['ratinkresli-slimnica', 'Ratiņkrēsli'],
        ['plansetes-pacientiem', 'Planšetes saziņai ar tuviniekiem'],
      ]),
      TEXTILES,
      VOLUNTEERS,
    ],
  },
  {
    id: 'hospiss',
    label: 'Hospiss',
    plural: 'Hospisi',
    icon: 'candle',
    tone: 'slate',
    needs: [
      g('aprupe-hospiss', 'Aprūpe', [
        ['pieauguso-autini-hospiss', 'Pieaugušo autiņbiksītes'],
        ['paladzini-hospiss', 'Absorbējošie paladziņi'],
        ['kopsanas-lidzekli', 'Ādas kopšanas līdzekļi'],
        ['pretizgulejumu-matraci-hospiss', 'Pretizgulējumu matrači'],
      ]),
      g('komforts', 'Komforts', [
        ['pledi-hospiss', 'Mīksti pledi'],
        ['spilveni-hospiss', 'Spilveni'],
        ['ziedi-istabam', 'Istabas augi un ziedi'],
      ]),
      HYGIENE,
      VOLUNTEERS,
    ],
  },
  {
    id: 'krizes-centrs',
    label: 'Krīzes centrs',
    plural: 'Krīzes centri',
    icon: 'shield',
    tone: 'emerald',
    needs: [
      g('pamatvajadzibas', 'Pamatvajadzības', [
        ['partika-ilgi-glabajama', 'Ilgi glabājama pārtika'],
        ['apgerbs-sievietem', 'Apģērbs sievietēm'],
        ['apgerbs-berniem-krize', 'Apģērbs bērniem'],
        ['apavi-krize', 'Apavi'],
      ]),
      g('berniem-krize', 'Bērniem', [
        ['autinbiksites-krize', 'Autiņbiksītes'],
        ['rotallietas-krize', 'Rotaļlietas'],
        ['kancelejas-krize', 'Kancelejas preces'],
      ]),
      HYGIENE,
      TEXTILES,
      VOLUNTEERS,
    ],
  },
  {
    id: 'bezpajumtnieki',
    label: 'Patversme bezpajumtniekiem',
    plural: 'Patversmes bezpajumtniekiem',
    icon: 'home',
    tone: 'orange',
    needs: [
      g('silti', 'Siltumam', [
        ['ziemas-jakas', 'Ziemas jakas'],
        ['siltas-zekes', 'Siltas zeķes'],
        ['cimdi-cepures', 'Cimdi un cepures'],
        ['gulammaisi', 'Guļammaisi'],
        ['ziemas-apavi', 'Ziemas apavi'],
      ]),
      g('partika-bez', 'Pārtika', [
        ['partika-bez-ilgi', 'Ilgi glabājama pārtika'],
        ['teja-kafija', 'Tēja un kafija'],
      ]),
      HYGIENE,
      TEXTILES,
      VOLUNTEERS,
    ],
  },
  {
    id: 'zupas-virtuve',
    label: 'Zupas virtuve',
    plural: 'Zupas virtuves',
    icon: 'soup',
    tone: 'teal',
    needs: [
      g('produkti', 'Produkti', [
        ['graudaugi', 'Putraimi un makaroni'],
        ['konservi', 'Konservi'],
        ['darzeni', 'Dārzeņi'],
        ['ella', 'Eļļa'],
        ['cukurs-milti', 'Cukurs un milti'],
        ['teja-kafija-zupa', 'Tēja un kafija'],
      ]),
      g('virtuve', 'Virtuvei', [
        ['vienreizejie-trauki', 'Vienreizējie trauki'],
        ['virtuves-inventars', 'Virtuves inventārs'],
        ['partikas-konteineri', 'Pārtikas trauciņi līdzņemšanai'],
      ]),
      CLEANING,
      VOLUNTEERS,
    ],
  },
  {
    id: 'gimenes-atbalsts',
    label: 'Atbalsts ģimenēm',
    plural: 'Atbalsts ģimenēm',
    icon: 'family',
    tone: 'indigo',
    needs: [
      g('berniem-gimenes', 'Bērniem', [
        ['apgerbs-berniem-gimenes', 'Apģērbs bērniem'],
        ['skolas-piederumi', 'Skolas piederumi'],
        ['autinbiksites-gimenes', 'Autiņbiksītes'],
        ['bernu-partika-gimenes', 'Bērnu pārtika'],
        ['rotallietas-gimenes', 'Rotaļlietas'],
      ]),
      g('majai', 'Mājai', [
        ['mebeles', 'Mēbeles'],
        ['sadzives-tehnika', 'Sadzīves tehnika'],
        ['trauki', 'Trauki'],
      ]),
      g('partika-gimenes', 'Pārtika', [['partikas-pakas', 'Pārtikas pakas']]),
      HYGIENE,
      TEXTILES,
    ],
  },
  {
    id: 'invaliditate',
    label: 'Cilvēki ar invaliditāti',
    plural: 'Organizācijas cilvēkiem ar invaliditāti',
    icon: 'wheelchair',
    tone: 'lime',
    needs: [
      g('palidzlidzekli-inv', 'Palīglīdzekļi', [
        ['ratinkresli-inv', 'Ratiņkrēsli'],
        ['staiguli-inv', 'Staiguļi'],
        ['dzirdes-aparati', 'Dzirdes aparāti'],
        ['sensorie-materiali', 'Sensorie materiāli'],
      ]),
      g('nodarbibas', 'Nodarbības', [
        ['radosie-materiali', 'Radošo nodarbību materiāli'],
        ['sporta-inventars-inv', 'Sporta inventārs'],
        ['datori-inv', 'Datori'],
      ]),
      HYGIENE,
      VOLUNTEERS,
    ],
  },
  {
    id: 'skola',
    label: 'Skola vai bērnudārzs',
    plural: 'Skolas un bērnudārzi',
    icon: 'school',
    tone: 'cyan',
    needs: [
      g('macibu-lidzekli', 'Mācību līdzekļi', [
        ['kancelejas-skola', 'Kancelejas preces'],
        ['gramatas-skola', 'Grāmatas bibliotēkai'],
        ['datori-skola', 'Datori un planšetes'],
        ['projektori', 'Projektori'],
        ['makslas-materiali', 'Mākslas materiāli'],
      ]),
      g('rotalas', 'Rotaļām un sportam', [
        ['rotallietas-skola', 'Rotaļlietas'],
        ['sporta-inventars-skola', 'Sporta inventārs'],
        ['ara-rotalu-lietas', 'Āra rotaļu lietas'],
      ]),
      VOLUNTEERS,
    ],
  },
  {
    id: 'ukrainas-atbalsts',
    label: 'Atbalsts Ukrainai',
    plural: 'Atbalsts Ukrainai',
    icon: 'heart-flag',
    tone: 'yellow',
    needs: [
      g('humanitara', 'Humānā palīdzība', [
        ['partika-ukr', 'Ilgi glabājama pārtika'],
        ['medikamenti', 'Pirmās palīdzības aptieciņas'],
        ['generatori', 'Ģeneratori un lukturi'],
        ['siltie-apgerbi-ukr', 'Silts apģērbs'],
        ['gulammaisi-ukr', 'Guļammaisi'],
      ]),
      HYGIENE,
      VOLUNTEERS,
    ],
  },
  {
    id: 'cits',
    label: 'Cita organizācija',
    plural: 'Citas organizācijas',
    icon: 'heart',
    tone: 'brown',
    needs: [HYGIENE, TEXTILES, CLEANING, VOLUNTEERS],
  },
]

export const CUSTOM_NEED_ID = 'custom'

export const CATEGORY_IDS: readonly CategoryId[] = CATEGORIES.map((c) => c.id)

export const isCategoryId = (value: unknown): value is CategoryId =>
  typeof value === 'string' && (CATEGORY_IDS as readonly string[]).includes(value)

export const categoryById = (id: CategoryId): Category => {
  const found = CATEGORIES.find((c) => c.id === id)
  if (!found) throw new Error(`Unknown category: ${id}`)
  return found
}

/** Every item id a category offers, across its groups. */
export const needItemIds = (id: CategoryId): readonly string[] =>
  categoryById(id).needs.flatMap((group) => group.items.map((item) => item.id))

/** The label of a need: the catalog label, or the charity's own for a custom one. */
export const needLabel = (category: CategoryId, need: { itemId: string; customLabel?: string }): string => {
  if (need.itemId === CUSTOM_NEED_ID) return need.customLabel ?? ''
  for (const group of categoryById(category).needs) {
    const item = group.items.find((i) => i.id === need.itemId)
    if (item) return item.label
  }
  return need.itemId
}

/** Pledge key of the need at `index` in a profile's needs: its itemId, or "custom:<index>". */
export const needKey = (need: { itemId: string }, index: number): string =>
  need.itemId === CUSTOM_NEED_ID ? `custom:${index}` : need.itemId

export const PARCEL_PROVIDERS = [
  { id: 'omniva', label: 'Omniva' },
  { id: 'dpd', label: 'DPD Pickup' },
  { id: 'venipak', label: 'Venipak' },
  { id: 'latvijas-pasts', label: 'Latvijas Pasts' },
  { id: 'smartposti', label: 'Smartposti' },
] as const

export const LEGAL_FORMS = [
  { id: 'biedriba', label: 'Biedrība' },
  { id: 'nodibinajums', label: 'Nodibinājums' },
  { id: 'pasvaldibas-iestade', label: 'Pašvaldības iestāde' },
  { id: 'valsts-iestade', label: 'Valsts iestāde' },
  { id: 'religiska-organizacija', label: 'Reliģiska organizācija' },
  { id: 'komersants', label: 'Komersants' },
  { id: 'cits', label: 'Cits' },
] as const

// ── Need kinds: what a donor has to give, across categories ─────────────────

/**
 * The map's "Ko vajag" filter. A donor with a bag of children's clothes looks
 * for "Apģērbs un apavi", whichever kind of institution asks for it, so the
 * catalog's groups (which are per category) fold into these few kinds. Every
 * group has one kind (NEED_GROUP_KIND); a group that mixes things names the
 * exceptions item by item (NEED_ITEM_KIND). Custom needs have no kind.
 */
export type NeedKindId =
  | 'apgerbs'
  | 'partika'
  | 'higiena'
  | 'tekstils'
  | 'brivais-laiks'
  | 'macibas'
  | 'dzivnieki'
  | 'medicina'
  | 'majai'
  | 'palidziba'

export interface NeedKind {
  readonly id: NeedKindId
  readonly label: string
}

export const NEED_KINDS: readonly NeedKind[] = [
  { id: 'apgerbs', label: 'Apģērbs un apavi' },
  { id: 'partika', label: 'Pārtika' },
  { id: 'higiena', label: 'Higiēna un tīrīšana' },
  { id: 'tekstils', label: 'Tekstils un gultas veļa' },
  { id: 'brivais-laiks', label: 'Rotaļlietas un brīvais laiks' },
  { id: 'macibas', label: 'Mācību lietas' },
  { id: 'dzivnieki', label: 'Dzīvnieku barība un aprūpe' },
  { id: 'medicina', label: 'Medicīna un aprūpe' },
  { id: 'majai', label: 'Mājai un tehnika' },
  { id: 'palidziba', label: 'Brīvprātīgie un transports' },
]

/** The kind of every catalog group, by group id. */
export const NEED_GROUP_KIND: Readonly<Record<string, NeedKindId>> = {
  higiena: 'higiena',
  tekstils: 'tekstils',
  tirisana: 'higiena',
  palidziba: 'palidziba',
  bariba: 'dzivnieki',
  aprupe: 'dzivnieki',
  veseliba: 'dzivnieki',
  apgerbs: 'apgerbs',
  macibas: 'macibas',
  zidainiem: 'higiena',
  'aprupe-seniori': 'medicina',
  palidzlidzekli: 'medicina',
  'briva-laika': 'brivais-laiks',
  'apgerbs-seniori': 'apgerbs',
  pacientiem: 'apgerbs',
  aprikojums: 'medicina',
  'aprupe-hospiss': 'medicina',
  komforts: 'tekstils',
  pamatvajadzibas: 'apgerbs',
  'berniem-krize': 'brivais-laiks',
  silti: 'apgerbs',
  'partika-bez': 'partika',
  produkti: 'partika',
  virtuve: 'majai',
  'berniem-gimenes': 'apgerbs',
  majai: 'majai',
  'partika-gimenes': 'partika',
  'palidzlidzekli-inv': 'medicina',
  nodarbibas: 'brivais-laiks',
  'macibu-lidzekli': 'macibas',
  rotalas: 'brivais-laiks',
  humanitara: 'partika',
}

/** Items whose kind is not their group's, by item id. */
export const NEED_ITEM_KIND: Readonly<Record<string, NeedKindId>> = {
  'rotallietas-berniem': 'brivais-laiks',
  'galda-speles': 'brivais-laiks',
  'sporta-inventars': 'brivais-laiks',
  'bernu-partika': 'partika',
  ratini: 'majai',
  'radio-televizors': 'majai',
  'higienas-komplekti': 'higiena',
  'gramatas-pacientiem': 'brivais-laiks',
  'rotallietas-bernu-nodalai': 'brivais-laiks',
  'plansetes-pacientiem': 'majai',
  'ziedi-istabam': 'majai',
  'partika-ilgi-glabajama': 'partika',
  'autinbiksites-krize': 'higiena',
  'kancelejas-krize': 'macibas',
  gulammaisi: 'tekstils',
  'skolas-piederumi': 'macibas',
  'autinbiksites-gimenes': 'higiena',
  'bernu-partika-gimenes': 'partika',
  'rotallietas-gimenes': 'brivais-laiks',
  'datori-inv': 'majai',
  medikamenti: 'medicina',
  generatori: 'majai',
  'siltie-apgerbi-ukr': 'apgerbs',
  'gulammaisi-ukr': 'tekstils',
}

const NEED_KIND_IDS: readonly NeedKindId[] = NEED_KINDS.map((k) => k.id)

export const isNeedKindId = (value: unknown): value is NeedKindId =>
  typeof value === 'string' && (NEED_KIND_IDS as readonly string[]).includes(value)

/** The kind of one of a category's catalog items, or null for a custom need or an item the catalog no longer has. */
export const needKindOf = (category: CategoryId, itemId: string): NeedKindId | null => {
  const group = categoryById(category).needs.find((g) => g.items.some((i) => i.id === itemId))
  if (group === undefined) return null
  return NEED_ITEM_KIND[itemId] ?? NEED_GROUP_KIND[group.id] ?? null
}
