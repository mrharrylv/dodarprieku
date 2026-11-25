import { useTranslation } from 'react-i18next'

import { PARCEL_PROVIDERS } from '@shared/catalog'
import type { DeliveryOptions as Delivery } from '@shared/contracts'
import { CopyButton } from './CopyButton'
import { SectionCard } from './SectionCard'

const providerLabel = (id: string): string => PARCEL_PROVIDERS.find((p) => p.id === id)?.label ?? id

interface Way {
  readonly key: string
  readonly title: string
  readonly name?: string
  readonly address: string
  readonly hours?: string
}

/** Every way to bring things, as the charity listed them, each address one tap to copy. */
export const DeliveryOptions = ({ delivery, compact = false }: { delivery: Delivery; compact?: boolean }) => {
  const { t } = useTranslation('charity')
  const ways: readonly Way[] = [
    ...(delivery.inPerson !== undefined
      ? [{ key: 'in-person', title: t('delivery.inPerson'), address: delivery.inPerson.address, ...(delivery.inPerson.hours ? { hours: delivery.inPerson.hours } : {}) }]
      : []),
    ...(delivery.dropOff !== undefined
      ? [{ key: 'drop-off', title: t('delivery.dropOff'), address: delivery.dropOff.address, ...(delivery.dropOff.hours ? { hours: delivery.dropOff.hours } : {}) }]
      : []),
    ...delivery.parcelLockers.map((locker, i) => ({
      key: `locker-${i}`,
      title: `${t('delivery.lockers')}: ${providerLabel(locker.provider)}`,
      name: locker.name,
      address: locker.address,
    })),
    ...(delivery.post !== undefined ? [{ key: 'post', title: t('delivery.post'), address: delivery.post.address }] : []),
  ].filter((way) => way.address.trim() !== '')

  return (
    <SectionCard title={t('delivery.title')} compact={compact}>
      {ways.length === 0 ? (
        <p className="text-(--text-secondary)">{t('delivery.none')}</p>
      ) : (
        <ul className="divide-y divide-(--border-subtle)">
          {ways.map((way) => (
            <li key={way.key} className="flex flex-wrap items-start justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-(length:--text-sm) font-semibold text-(--text-accent)">{way.title}</p>
                {way.name !== undefined && <p className="font-medium text-(--text-primary)">{way.name}</p>}
                <p className="text-(--text-primary)">{way.address}</p>
                {way.hours !== undefined && <p className="text-(length:--text-sm) text-(--text-secondary)">{t('delivery.hours', { hours: way.hours })}</p>}
              </div>
              <CopyButton text={way.address} />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
