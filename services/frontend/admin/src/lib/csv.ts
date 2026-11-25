/**
 * CSV for spreadsheets: comma-separated, CRLF lines, every cell that needs
 * it quoted with doubled quotes, and a UTF-8 BOM so Excel reads ā, š and ž
 * correctly. A cell that starts like a formula (= + - @, tab, CR) is
 * prefixed with an apostrophe so a spreadsheet never executes it.
 */
import type { SubscriberRecord } from '@shared/contracts'

export const BOM = '﻿'
const FORMULA_START = /^[=+\-@\t\r]/
const NEEDS_QUOTES = /[",\r\n;]|^\s|\s$/

export type Cell = string | number | boolean | null | undefined

export const escapeCell = (value: Cell): string => {
  if (value === null || value === undefined) return ''
  const raw = String(value)
  const safe = typeof value === 'string' && FORMULA_START.test(raw) ? `'${raw}` : raw
  return NEEDS_QUOTES.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

export const toCsv = (header: readonly string[], rows: readonly (readonly Cell[])[]): string =>
  [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n') + '\r\n'

export const withBom = (csv: string): string => BOM + csv

export const subscribersCsv = (
  subscribers: readonly SubscriberRecord[],
  charityName: (id: string) => string,
  header: readonly string[],
): string =>
  toCsv(
    header,
    subscribers.map((s) => [s.email, s.name ?? '', s.charityIds.map(charityName).join('; '), s.createdAt]),
  )

/** Hands the browser a file to save. Not unit-tested beyond the call: jsdom cannot save files. */
export const downloadCsv = (filename: string, csv: string): void => {
  const blob = new Blob([withBom(csv)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** "abonenti-2026-11-25.csv" */
export const datedFilename = (stem: string, now: Date): string => `${stem}-${now.toISOString().slice(0, 10)}.csv`
