/**
 * Converts the charity map CSV into the import file the API loads:
 *
 *   npx tsx scripts/csv-to-profiles.ts [input.csv] [output.json]
 *
 * Defaults: ../../charity-map-2026-11-25.csv -> data/imported-charities.json.
 * Rows whose legal_status is "terminated ..." are skipped; an unknown category
 * stops the conversion (add it to CATEGORY_MAP first). A charity already in the
 * output file keeps its slug, so URLs already shared survive a re-run; pass
 * --fresh to assign every slug anew.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { convertCsv, sourceOf, toJsonLines } from '../src/import/convert'
import { isImportedCharity } from '../src/domain/imported'

const here = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url))

const args = process.argv.slice(2)
const fresh = args.includes('--fresh')
const [inputArg, outputArg] = args.filter((a) => a !== '--fresh')
const input = inputArg ?? here('../../../charity-map-2026-11-25.csv')
const output = outputArg ?? here('../data/imported-charities.json')

const previousSlugs = (): ReadonlyMap<string, string> => {
  if (fresh || !existsSync(output)) return new Map()
  const parsed: unknown = JSON.parse(readFileSync(output, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error(`${output} is not a JSON array: pass --fresh to replace it`)
  return new Map(parsed.filter(isImportedCharity).map((i) => [i.id, i.slug]))
}

const previous = previousSlugs()
const { items, skipped, approximate } = convertCsv(readFileSync(input, 'utf8'), sourceOf(input), previous)
const invalid = items.findIndex((i: unknown) => !isImportedCharity(i))
if (invalid >= 0) {
  process.stderr.write(`error: converted item ${items[invalid]?.id} fails isImportedCharity\n`)
  process.exit(1)
}
writeFileSync(output, toJsonLines(items))
process.stdout.write(`${items.length} charities written to ${output} (${previous.size} kept their slugs)\n`)
process.stdout.write(`  ${approximate.length} pins are approximate (settlement or municipality centre); their description says so\n`)
for (const s of skipped) process.stdout.write(`  skipped ${s.id}: ${s.reason}\n`)
