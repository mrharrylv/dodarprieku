/**
 * A small RFC 4180 reader: quoted fields, "" inside quotes, CRLF or LF, line
 * breaks inside quoted fields, an optional UTF-8 byte order mark. Pure.
 */

const BOM = '﻿'

/** Every row as an array of fields. A trailing line break does not add an empty row. */
export const parseCsv = (input: string): string[][] => {
  const text = input.startsWith(BOM) ? input.slice(1) : input
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let i = 0
  const endField = (): void => {
    row = [...row, field]
    field = ''
  }
  const endRow = (): void => {
    endField()
    rows.push(row)
    row = []
  }
  while (i < text.length) {
    const ch = text[i]!
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i += 2
        continue
      }
      if (ch === '"') quoted = false
      else field += ch
      i += 1
      continue
    }
    if (ch === '"' && field === '') quoted = true
    else if (ch === ',') endField()
    else if (ch === '\r' && text[i + 1] === '\n') {
      endRow()
      i += 1
    } else if (ch === '\n' || ch === '\r') endRow()
    else field += ch
    i += 1
  }
  if (quoted) throw new Error('csv: unterminated quoted field')
  if (field !== '' || row.length > 0) endRow()
  return rows
}

/** Rows keyed by the header row. A short row gets '' for its missing columns. */
export const toRecords = (rows: readonly (readonly string[])[]): Readonly<Record<string, string>>[] => {
  const [header, ...body] = rows
  if (!header) return []
  return body
    .filter((r) => !(r.length === 1 && r[0] === ''))
    .map((r) => Object.fromEntries(header.map((name, i) => [name.trim(), r[i] ?? ''])))
}
