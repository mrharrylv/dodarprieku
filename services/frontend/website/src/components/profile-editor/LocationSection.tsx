import { useTranslation } from 'react-i18next'

import { LIMITS } from '@shared/contracts'

import { LocationPicker } from '@/components/location-picker/LocationPicker'
import { Input } from '@/components/ui/Field'
import { Fieldset } from './controls'
import { addressLine, patchAddress, type SectionProps } from './form-model'
import { useFieldError } from './useFieldError'

/** Step 3 / tab 3: the address and the pin on the map. */
export const LocationSection = ({ form, update, errors }: SectionProps) => {
  const { t } = useTranslation('register')
  const error = useFieldError(errors)
  const set = (patch: Parameters<typeof patchAddress>[1]) => update((f) => patchAddress(f, patch))

  return (
    <div className="space-y-10">
      <Fieldset legend={t('location.addressLegend')} hint={t('location.addressHint')}>
        <div className="grid gap-5 sm:grid-cols-6">
          <Input className="sm:col-span-6" label={t('location.street')} required value={form.address.street}
            maxLength={LIMITS.addressLine} autoComplete="street-address" error={error('address.street')}
            onChange={(e) => set({ street: e.target.value })} />
          <Input className="sm:col-span-4" label={t('location.city')} required value={form.address.city}
            maxLength={LIMITS.city} autoComplete="address-level2" error={error('address.city')}
            onChange={(e) => set({ city: e.target.value })} />
          <Input className="sm:col-span-2" label={t('location.postalCode')} hint={t('location.postalHint')} required
            value={form.address.postalCode} maxLength={LIMITS.postalCode} autoComplete="postal-code"
            error={error('address.postalCode')} onChange={(e) => set({ postalCode: e.target.value })} />
        </div>
      </Fieldset>

      <Fieldset legend={t('location.mapLegend')} hint={t('location.mapHint')} error={error('location')}>
        <LocationPicker
          value={form.location}
          query={addressLine(form.address)}
          onChange={(location) => update((f) => ({ ...f, location }))}
        />
      </Fieldset>
    </div>
  )
}
