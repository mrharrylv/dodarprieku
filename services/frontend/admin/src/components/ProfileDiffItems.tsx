import type { ReactNode } from 'react'
import { needLabel, type CategoryId } from '@shared/catalog'
import type { Need, ParcelLockerChoice, Sponsor } from '@shared/contracts'
import { lv } from '../i18n/lv'
import type { ItemDiff } from '../lib/diff'
import { providerLabel } from '../lib/format'
import { ChangeBadge, rowTone } from './ChangeBadge'
import { UrgentBadge } from './ProfileViewLists'
import { Card } from './ui'

const FIELD_LABEL: Readonly<Record<string, string>> = {
  note: lv.fields.note,
  urgent: lv.fields.urgent,
  customLabel: lv.fields.lockerName,
  url: lv.fields.sponsorUrl,
  logo: lv.fields.sponsorLogo,
  name: lv.fields.lockerName,
  address: lv.fields.lockerAddress,
  lockerId: lv.editor.lockerId,
  provider: lv.fields.provider,
}

export const ItemList = <T,>({
  title,
  items,
  render,
  extra,
}: {
  readonly title: string
  readonly items: readonly ItemDiff<T>[]
  readonly render: (item: T) => ReactNode
  readonly extra?: (item: ItemDiff<T>) => string | undefined
}) =>
  items.length === 0 ? null : (
    <Card>
      <h3 className="text-[length:var(--text-lg)]">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.key} data-status={item.status} className={`rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3 ${rowTone(item.status)}`}>
            <div className="flex flex-wrap items-center gap-2">
              <ChangeBadge status={item.status} />
              {extra?.(item) && <span className="text-xs font-semibold text-[var(--text-secondary)]">{extra(item)}</span>}
              {item.changedFields.length > 0 && (
                <span className="text-xs text-[var(--text-secondary)]">
                  {item.changedFields.map((f) => FIELD_LABEL[f] ?? f).join(', ')}
                </span>
              )}
            </div>
            {item.status === 'changed' && item.before !== undefined && item.after !== undefined ? (
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">{lv.updates.live}</p>
                  {render(item.before)}
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">{lv.updates.proposed}</p>
                  {render(item.after)}
                </div>
              </div>
            ) : (
              <div className={`mt-2 ${item.status === 'removed' ? 'line-through decoration-[var(--text-danger)]' : ''}`}>
                {render((item.after ?? item.before) as T)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )

export const NeedItem = ({ category, need }: { readonly category: CategoryId; readonly need: Need }) => (
  <div>
    <span className="font-medium">{needLabel(category, need)}</span> {need.urgent && <UrgentBadge />}
    {need.note && <p className="text-sm text-[var(--text-secondary)]">{need.note}</p>}
  </div>
)

export const SponsorItem = ({ sponsor }: { readonly sponsor: Sponsor }) => (
  <div>
    <span className="font-medium">{sponsor.name}</span>
    {sponsor.url && <p className="break-all text-sm text-[var(--text-secondary)]">{sponsor.url}</p>}
    {sponsor.logo && <p className="text-xs text-[var(--text-muted)]">{lv.fields.sponsorLogo}: {sponsor.logo}</p>}
  </div>
)

export const LockerItem = ({ locker }: { readonly locker: ParcelLockerChoice }) => (
  <div>
    <span className="font-medium">{providerLabel(locker.provider)}: {locker.name}</span>
    <p className="text-sm text-[var(--text-secondary)]">{locker.address}</p>
  </div>
)
