/** Reads an import file (data/imported-charities.json) and checks every item. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { isImportedCharity, type ImportedCharity } from '../domain/imported'

export const IMPORTED_FILE = fileURLToPath(new URL('../../data/imported-charities.json', import.meta.url))

export const parseImportedFile = (text: string): ImportedCharity[] => {
  const parsed: unknown = JSON.parse(text)
  if (!Array.isArray(parsed)) throw new Error('import file: expected a JSON array')
  const bad = parsed.findIndex((item: unknown) => !isImportedCharity(item))
  if (bad >= 0) throw new Error(`import file: item ${bad} is not an imported charity`)
  return parsed.filter(isImportedCharity)
}

export const loadImportedFile = (path: string = IMPORTED_FILE): ImportedCharity[] =>
  parseImportedFile(readFileSync(path, 'utf8'))
