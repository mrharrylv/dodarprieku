/** Display helpers: dates, labels from the shared catalog, media URLs. */
import { CATEGORIES, LEGAL_FORMS, PARCEL_PROVIDERS, type CategoryId } from '@shared/catalog'
import { MEDIA_PREFIX, type CharityStatus, type LegalForm, type ParcelProvider } from '@shared/contracts'
import { lv } from '../i18n/lv'

const DATE = new Intl.DateTimeFormat('lv-LV', { day: '2-digit', month: '2-digit', year: 'numeric' })
const DATE_TIME = new Intl.DateTimeFormat('lv-LV', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

const parse = (iso: string): Date | undefined => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export const formatDate = (iso: string): string => {
  const d = parse(iso)
  return d ? DATE.format(d) : iso
}

export const formatDateTime = (iso: string): string => {
  const d = parse(iso)
  return d ? DATE_TIME.format(d) : iso
}

export const formatNumber = (n: number): string => new Intl.NumberFormat('lv-LV').format(n)

export const categoryLabel = (id: CategoryId | string): string => CATEGORIES.find((c) => c.id === id)?.label ?? id
export const legalFormLabel = (id: LegalForm | string): string => LEGAL_FORMS.find((f) => f.id === id)?.label ?? id
export const providerLabel = (id: ParcelProvider | string): string => PARCEL_PROVIDERS.find((p) => p.id === id)?.label ?? id
export const statusLabel = (status: CharityStatus): string => lv.status[status]

export const mediaUrl = (key: string): string => `${MEDIA_PREFIX}${key}`

/** The public charity page, on the public host (admin.<host> minus "admin."). */
export const publicCharityUrl = (slug: string, host: string = window.location.host): string => {
  const publicHost = host.startsWith('admin.') ? host.slice('admin.'.length) : host
  return `${window.location.protocol}//${publicHost}/organizacija/${encodeURIComponent(slug)}`
}
