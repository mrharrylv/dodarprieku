/** Subscriber table helpers. Pure. */
import type { SubscriberRecord } from '@shared/contracts'
import { lv } from '../i18n/lv'
import { fold } from './charity-table'

const H = lv.subscribers.cols
export const SUBSCRIBER_HEADER = [H.email, H.name, H.charities, H.createdAt] as const

export const filterSubscribers = (rows: readonly SubscriberRecord[], search: string): readonly SubscriberRecord[] => {
  const q = fold(search)
  return q === '' ? rows : rows.filter((s) => fold(`${s.email} ${s.name ?? ''}`).includes(q))
}

export const subscribersOf = (all: readonly SubscriberRecord[], charityId: string): readonly SubscriberRecord[] =>
  all.filter((s) => s.charityIds.includes(charityId))

/** "Dzīvnieku patversme Ulubele" -> "dzivnieku-patversme-ulubele", for file names. */
export const fileSlug = (name: string): string => fold(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
