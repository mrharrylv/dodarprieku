import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { PARCEL_PROVIDERS } from '@shared/catalog'
import { LIMITS } from '@shared/contracts'

import { LockerPicker } from '@/components/locker-picker/LockerPicker'
import { Icon } from '@/components/ui/Icon'
import { Input } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { Fieldset, Toggle } from './controls'
import { addressLine, patchDelivery, type PlaceForm, type ProfileForm, type SectionProps } from './form-model'
import { useFieldError } from './useFieldError'

const providerLabel = (id: string): string => PARCEL_PROVIDERS.find((p) => p.id === id)?.label ?? id

const Option = ({ on, children }: { on: boolean; children: ReactNode }) => (
  <div className={cn('space-y-4 rounded-(--radius-lg) border-2 p-4 transition-colors duration-200',
    on ? 'border-(--fill-accent) bg-(--surface-accent-soft)' : 'border-(--border-subtle) bg-(--surface-raised)')}>
    {children}
  </div>
)

/** Step 5 / tab 5: how a donor gets things to the charity. At least one way is needed. */
export const DeliverySection = ({ form, update, errors }: SectionProps) => {
  const { t } = useTranslation('register')
  const error = useFieldError(errors)
  const d = form.delivery
  const set = (patch: Parameters<typeof patchDelivery>[1]) => update((f) => patchDelivery(f, patch))

  /** Switching a place on fills in the institution's own address when it is still empty. */
  const togglePlace = (key: 'inPerson' | 'dropOff', enabled: boolean, prefill: boolean) =>
    update((f: ProfileForm) => {
      const current: PlaceForm = f.delivery[key]
      const address = enabled && prefill && current.address === '' ? addressLine(f.address) : current.address
      return patchDelivery(f, { [key]: { ...current, enabled, address } })
    })

  const placeFields = (key: 'inPerson' | 'dropOff') => (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label={t(`delivery.${key}.address`)} required value={d[key].address} maxLength={LIMITS.addressLine}
        error={error(`delivery.${key}.address`)}
        onChange={(e) => set({ [key]: { ...d[key], address: e.target.value } })} />
      <Input label={t('delivery.hours')} badge={t('common.optional')} value={d[key].hours} maxLength={LIMITS.shortText}
        placeholder={t('delivery.hoursPlaceholder')} error={error(`delivery.${key}.hours`)}
        onChange={(e) => set({ [key]: { ...d[key], hours: e.target.value } })} />
    </div>
  )

  return (
    <Fieldset legend={t('delivery.legend')} hint={t('delivery.hint')} error={error('delivery')}>
      <Option on={d.inPerson.enabled}>
        <Toggle label={t('delivery.inPerson.title')} description={t('delivery.inPerson.desc')} checked={d.inPerson.enabled}
          onChange={(on) => togglePlace('inPerson', on, true)} />
        {d.inPerson.enabled && placeFields('inPerson')}
      </Option>

      <Option on={d.dropOff.enabled}>
        <Toggle label={t('delivery.dropOff.title')} description={t('delivery.dropOff.desc')} checked={d.dropOff.enabled}
          onChange={(on) => togglePlace('dropOff', on, false)} />
        {d.dropOff.enabled && placeFields('dropOff')}
      </Option>

      <Option on={d.lockersEnabled}>
        <Toggle label={t('delivery.lockers.title')} description={t('delivery.lockers.desc')} checked={d.lockersEnabled}
          onChange={(lockersEnabled) => set({ lockersEnabled })} />
        {d.lockersEnabled && (
          <div className="space-y-4">
            {d.parcelLockers.length > 0 && (
              <ul className="space-y-2">
                {d.parcelLockers.map((locker, index) => (
                  <li key={`${locker.provider}-${locker.lockerId ?? locker.name}-${index}`}
                    className="flex items-center gap-3 rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-raised) p-3">
                    <Icon name="pin" className="text-(--text-accent)" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-(--text-primary)">{providerLabel(locker.provider)}: {locker.name}</p>
                      <p className="text-(length:--text-sm) text-(--text-secondary)">{locker.address}</p>
                    </div>
                    <button type="button" aria-label={t('lockers.removeN', { name: locker.name })}
                      onClick={() => set({ parcelLockers: d.parcelLockers.filter((_, i) => i !== index) })}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-(--radius-md) text-(--text-secondary) hover:bg-(--surface-sunken)">
                      <Icon name="close" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {error('delivery.parcelLockers') !== undefined && (
              <p role="alert" className="text-(length:--text-sm) text-(--color-danger-600)">{error('delivery.parcelLockers')}</p>
            )}
            {d.parcelLockers.length < LIMITS.maxParcelLockers ? (
              <LockerPicker chosen={d.parcelLockers}
                onAdd={(choice) => update((f) => patchDelivery(f, { parcelLockers: [...f.delivery.parcelLockers, choice] }))} />
            ) : (
              <p className="text-(length:--text-sm) text-(--text-secondary)">{t('lockers.limit', { max: LIMITS.maxParcelLockers })}</p>
            )}
          </div>
        )}
      </Option>

      <Option on={d.post.enabled}>
        <Toggle label={t('delivery.post.title')} description={t('delivery.post.desc')} checked={d.post.enabled}
          onChange={(enabled) => update((f) => patchDelivery(f, {
            post: { enabled, address: enabled && f.delivery.post.address === '' ? addressLine(f.address) : f.delivery.post.address },
          }))} />
        {d.post.enabled && (
          <Input label={t('delivery.post.address')} required value={d.post.address} maxLength={LIMITS.addressLine}
            error={error('delivery.post.address')} onChange={(e) => set({ post: { ...d.post, address: e.target.value } })} />
        )}
      </Option>
    </Fieldset>
  )
}
