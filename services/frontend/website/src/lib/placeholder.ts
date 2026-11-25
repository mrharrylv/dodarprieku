/**
 * Recognises the template's placeholders, so nothing publishes them.
 *
 * `config/site.ts` ships with stand-ins for everything only the business can
 * supply: a phone number of zeros, `hello@example.com`, `Example street 1`, a
 * registration number of `X`s. The locale files ship with instructions where
 * the copy goes: "Replace this with one sentence describing what the business
 * does". On a page a visitor can at least see that they are fake. In
 * structured data, `llms.txt` or a legal page they become machine-readable
 * statements about a real company, repeated by search engines and AI
 * assistants to anyone who asks.
 *
 * This is the ONE definition of "still a placeholder", in two parts:
 *
 * - `isPlaceholder` for a VALUE: a contact detail, a company identifier, a
 *   profile URL. Every place that publishes one asks it.
 * - `isPlaceholderCopy` for PROSE: a description, a service's text. It asks
 *   only whether the template's own instructions are still there, because
 *   the value markers would take real prose ("for example", "XXXL") for a
 *   placeholder.
 *
 * No imports: it is pure, and the crawler-file modules (`llms.ts`,
 * `crawler-files.ts`) reach it by relative path.
 */

/**
 * - a run of three or more capital X: `40203XXXXXX`, `LV00XXXX…`, digits
 *   nobody has filled in yet;
 * - the word "example": `example.com`, `hello@example.com`, `Example street 1`,
 *   `SIA "Example"`;
 * - six or more zeros at the end, ignoring spaces and dashes: the phone
 *   number `+371 20 000 000` and the WhatsApp number `37120000000`.
 *
 * A false positive only ever hides a value; a false negative publishes a
 * fake. The patterns lean towards hiding.
 */
const MARKERS: readonly RegExp[] = [/X{3,}/, /\bexample\b/i, /0{6,}$/]

/**
 * The opening words of every instruction the template's locale files ship in
 * place of real copy, in each language. Long enough that no real sentence
 * starts the same way: "Describe the service in three or four sentences",
 * never just "Describe", which the template's own real copy begins with.
 *
 * Changing or adding an instruction in the template's locale files means
 * changing it here, and in `TEMPLATE_COPY` in `placeholder.test.ts`, which
 * holds every one verbatim and fails on any this list does not recognise. A
 * site's own copy never needs an entry: it is real.
 */
const TEMPLATE_INSTRUCTIONS: readonly string[] = [
  // en
  'Replace this with one sentence',
  'Replace with a sentence',
  'A short, concrete promise',
  'One or two sentences saying what you do',
  'Three reasons, each worth a sentence',
  'A short line framing the list below',
  'Two or three sentences of substance',
  'A paragraph framing the offer',
  'Describe the service in three or four sentences',
  'One paragraph. Who you are',
  'Two or three paragraphs of real history',
  // lv
  'Aizstājiet šo ar vienu teikumu',
  'Aizstājiet ar teikumu',
  'Īss un konkrēts solījums',
  'Viens vai divi teikumi par to, ko jūs darāt',
  'Trīs iemesli, katrs viena teikuma vērts',
  'Īsa rindiņa, kas ievada zemāk redzamo sarakstu',
  'Divi vai trīs saturīgi teikumi par uzņēmumu',
  'Rindkopa, kas ievada piedāvājumu',
  'Aprakstiet pakalpojumu trīs līdz četros teikumos',
  'Viena rindkopa. Kas jūs esat',
  'Divas vai trīs rindkopas patiesas vēstures',
  // ru
  'Замените этот текст одним предложением',
  'Замените одним предложением',
  'Короткое и конкретное обещание',
  'Одно-два предложения о том, что вы делаете',
  'Три причины, по одному предложению на каждую',
  'Короткая строка, которая вводит список ниже',
  'Два-три содержательных предложения о компании',
  'Абзац, который задаёт рамку предложения',
  'Опишите услугу в трёх-четырёх предложениях',
  'Один абзац. Кто вы',
  'Два-три абзаца настоящей истории',
]

/** Case, wrapping and a retyped `ё` do not make an instruction real copy. */
const normalise = (text: string): string =>
  text.normalize('NFC').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()

const OPENINGS: readonly string[] = TEMPLATE_INSTRUCTIONS.map(normalise)

/** Where a sentence can begin: the start, and after a full stop, `!`, `?` or `…`. */
const sentenceStarts = (text: string): readonly number[] => [
  0,
  ...[...text.matchAll(/[.!?…] /g)].map((match) => (match.index ?? 0) + match[0].length),
]

/** True when any sentence of the text opens with one of the template's instructions. */
const carriesInstruction = (text: string): boolean => {
  const clean = normalise(text)
  return sentenceStarts(clean).some((start) => OPENINGS.some((opening) => clean.startsWith(opening, start)))
}

const isBlank = (value: string | null | undefined): value is null | undefined | '' =>
  value === null || value === undefined || value.trim() === ''

/** True for an empty value or one that still carries a template marker or instruction. */
export const isPlaceholder = (value: string | null | undefined): boolean => {
  if (isBlank(value)) return true
  const trimmed = value.trim()
  const compact = trimmed.replace(/[\s-]/g, '')
  return MARKERS.some((marker) => marker.test(trimmed) || marker.test(compact)) || carriesInstruction(trimmed)
}

/** The value, trimmed, when it is real; `null` when it is still a placeholder. */
export const publishable = (value: string | null | undefined): string | null =>
  isPlaceholder(value) ? null : (value ?? '').trim()

/** True for empty copy, or copy with one of the template's instructions still in it. */
export const isPlaceholderCopy = (text: string | null | undefined): boolean => isBlank(text) || carriesInstruction(text)

/**
 * The parts that are real copy, trimmed and joined by a space, or `null` when
 * none is. A service's summary is published when its body is still the
 * template's instruction.
 */
export const publishableCopy = (...parts: ReadonlyArray<string | null | undefined>): string | null => {
  const real = parts.filter((part): part is string => !isPlaceholderCopy(part)).map((part) => part.trim())
  return real.length === 0 ? null : real.join(' ')
}
