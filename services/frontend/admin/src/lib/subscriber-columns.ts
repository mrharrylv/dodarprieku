/**
 * The subscriber tables' columns, the same for the screen and the CSV: the
 * general newsletter's list, everyone with a column per organisation, and
 * one organisation's own list. Pure.
 */
import type { SubscriberRecord } from '@shared/contracts'
import { lv } from '../i18n/lv'
import { toCsv } from './csv'
import { formatDate } from './format'

export interface SubscriberColumn {
  readonly key: string
  readonly label: string
  /** What the table shows. */
  readonly cell: (s: SubscriberRecord) => string
  /** What the CSV holds, when it differs from the table (the raw timestamp). */
  readonly csv?: (s: SubscriberRecord) => string
}

const H = lv.subscribers.cols
const yes = (on: boolean): string => (on ? lv.subscribers.subscribed : '')

const EMAIL: SubscriberColumn = { key: 'email', label: H.email, cell: (s) => s.email }
const NAME: SubscriberColumn = { key: 'name', label: H.name, cell: (s) => s.name ?? '' }
const GENERAL: SubscriberColumn = { key: 'general', label: lv.subscribers.generalCol, cell: (s) => yes(s.general) }
const CREATED: SubscriberColumn = { key: 'createdAt', label: H.createdAt, cell: (s) => formatDate(s.createdAt), csv: (s) => s.createdAt }

/** The general newsletter: who, and which organisations they also follow. */
export const generalColumns = (charityName: (id: string) => string): readonly SubscriberColumn[] => [
  EMAIL,
  NAME,
  {
    key: 'charities',
    label: H.charities,
    cell: (s) => (s.charityIds.length === 0 ? lv.subscribers.general : s.charityIds.map(charityName).join(', ')),
    csv: (s) => s.charityIds.map(charityName).join('; '),
  },
  CREATED,
]

/** The organisations any of `rows` follow, by name, each its own column. */
export const organisationIds = (rows: readonly SubscriberRecord[], charityName: (id: string) => string): readonly string[] =>
  [...new Set(rows.flatMap((s) => s.charityIds))].sort((a, b) => charityName(a).localeCompare(charityName(b), 'lv'))

/** Everyone: the general flag, then a column per organisation that has subscribers. */
export const allColumns = (rows: readonly SubscriberRecord[], charityName: (id: string) => string): readonly SubscriberColumn[] => [
  EMAIL,
  NAME,
  GENERAL,
  CREATED,
  ...organisationIds(rows, charityName).map((id) => ({ key: `org:${id}`, label: charityName(id), cell: (s: SubscriberRecord) => yes(s.charityIds.includes(id)) })),
]

/** One organisation's subscribers, on its detail page. */
export const charityColumns: readonly SubscriberColumn[] = [EMAIL, NAME, GENERAL, CREATED]

export const columnsCsv = (columns: readonly SubscriberColumn[], rows: readonly SubscriberRecord[]): string =>
  toCsv(
    columns.map((c) => c.label),
    rows.map((s) => columns.map((c) => (c.csv ?? c.cell)(s))),
  )
