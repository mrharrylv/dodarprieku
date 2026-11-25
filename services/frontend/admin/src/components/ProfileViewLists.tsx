import type { CharityProfile, DeliveryOptions, Sponsor } from '@shared/contracts'
import { categoryById, needLabel } from '@shared/catalog'
import { lv } from '../i18n/lv'
import { mediaUrl, providerLabel } from '../lib/format'

export const UrgentBadge = () => (
  <span className="inline-flex items-center rounded-full border border-[var(--border-danger)] bg-[var(--surface-danger-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--text-danger)]">
    {lv.view.urgent}
  </span>
)

/** Needs grouped as the catalog groups them, custom ones last. */
export const NeedsView = ({ profile }: { readonly profile: CharityProfile }) => {
  if (profile.needs.length === 0) return <p className="text-[var(--text-muted)]">{lv.view.noNeeds}</p>
  const groups = categoryById(profile.category).needs
  const groupOf = (itemId: string): string =>
    groups.find((g) => g.items.some((i) => i.id === itemId))?.label ?? lv.editor.customNeed
  const labelled = profile.needs.map((need) => ({ need, group: groupOf(need.itemId) }))
  const order = [...new Set(labelled.map((l) => l.group))]
  return (
    <div className="space-y-4">
      {order.map((group) => (
        <div key={group}>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">{group}</h3>
          <ul className="mt-1 divide-y divide-[var(--border-subtle)]">
            {labelled
              .filter((l) => l.group === group)
              .map(({ need }, i) => (
                <li key={`${need.itemId}-${i}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                  <span className="font-medium">{needLabel(profile.category, need)}</span>
                  {need.urgent && <UrgentBadge />}
                  {need.note && <span className="w-full text-sm text-[var(--text-secondary)]">{need.note}</span>}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export const DeliveryView = ({ delivery }: { readonly delivery: DeliveryOptions }) => {
  const rows: { label: string; text: string }[] = [
    ...(delivery.inPerson ? [{ label: lv.fields.inPerson, text: [delivery.inPerson.address, delivery.inPerson.hours].filter(Boolean).join(', ') }] : []),
    ...(delivery.dropOff ? [{ label: lv.fields.dropOff, text: [delivery.dropOff.address, delivery.dropOff.hours].filter(Boolean).join(', ') }] : []),
    ...(delivery.post ? [{ label: lv.fields.post, text: delivery.post.address }] : []),
  ]
  if (rows.length === 0 && delivery.parcelLockers.length === 0) {
    return <p className="text-[var(--text-muted)]">{lv.view.noDelivery}</p>
  }
  return (
    <dl className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <dt className="text-sm text-[var(--text-muted)]">{r.label}</dt>
          <dd>{r.text}</dd>
        </div>
      ))}
      {delivery.parcelLockers.length > 0 && (
        <div>
          <dt className="text-sm text-[var(--text-muted)]">{lv.fields.parcelLockers}</dt>
          <dd>
            <ul className="list-disc pl-5">
              {delivery.parcelLockers.map((l, i) => (
                <li key={`${l.provider}-${l.lockerId ?? l.name}-${i}`}>
                  {providerLabel(l.provider)}: {l.name}, {l.address}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      )}
    </dl>
  )
}

export const SponsorsView = ({ sponsors }: { readonly sponsors: readonly Sponsor[] }) =>
  sponsors.length === 0 ? (
    <p className="text-[var(--text-muted)]">{lv.view.noSponsors}</p>
  ) : (
    <ul className="grid gap-3 sm:grid-cols-2">
      {sponsors.map((s, i) => (
        <li key={`${s.name}-${i}`} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
          {s.logo && <img src={mediaUrl(s.logo)} alt="" className="size-10 object-contain" />}
          <div className="min-w-0">
            <p className="font-medium">{s.name}</p>
            {s.url && (
              <a href={s.url} target="_blank" rel="noreferrer" className="break-all text-sm text-[var(--text-accent)] underline">
                {s.url}
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
