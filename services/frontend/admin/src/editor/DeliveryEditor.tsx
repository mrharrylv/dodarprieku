import { PARCEL_PROVIDERS } from '@shared/catalog'
import { LIMITS, type ParcelLockerChoice } from '@shared/contracts'
import { Button } from '../components/ui'
import { lv } from '../i18n/lv'
import { useEditor } from './context'
import { Check, Fieldset, SelectInput, TextInput } from './inputs'

type Place = 'inPerson' | 'dropOff' | 'post'

const EMPTY_LOCKER: ParcelLockerChoice = { provider: 'omniva', name: '', address: '' }

export const DeliveryEditor = () => {
  const { profile, set, error } = useEditor()
  const d = profile.delivery
  const toggle = (place: Place, on: boolean) => set(`delivery.${place}`, on ? { address: '' } : undefined)
  const lockers = d.parcelLockers
  const deliveryError = error('delivery') ?? error('delivery.parcelLockers')

  return (
    <Fieldset legend={lv.sections.delivery} error={deliveryError}>
      <div className="space-y-4 sm:col-span-2">
        <div>
          <Check checked={d.inPerson !== undefined} onChange={(on) => toggle('inPerson', on)}>{lv.fields.inPerson}</Check>
          {d.inPerson && (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <TextInput path="delivery.inPerson.address" label={lv.fields['delivery.inPerson.address']} max={LIMITS.addressLine} />
              <TextInput path="delivery.inPerson.hours" label={lv.fields['delivery.inPerson.hours']} max={LIMITS.shortText} optional />
            </div>
          )}
        </div>
        <div>
          <Check checked={d.dropOff !== undefined} onChange={(on) => toggle('dropOff', on)}>{lv.fields.dropOff}</Check>
          {d.dropOff && (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <TextInput path="delivery.dropOff.address" label={lv.fields['delivery.dropOff.address']} max={LIMITS.addressLine} />
              <TextInput path="delivery.dropOff.hours" label={lv.fields['delivery.dropOff.hours']} max={LIMITS.shortText} optional />
            </div>
          )}
        </div>
        <div>
          <Check checked={d.post !== undefined} onChange={(on) => toggle('post', on)}>{lv.fields.post}</Check>
          {d.post && (
            <div className="mt-2">
              <TextInput path="delivery.post.address" label={lv.fields['delivery.post.address']} max={LIMITS.addressLine} />
            </div>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">{lv.fields.parcelLockers}</h3>
          <ul className="space-y-3">
            {lockers.map((l, i) => (
              <li key={`locker-${i}`} className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3 sm:grid-cols-2">
                <SelectInput path={`delivery.parcelLockers.${i}.provider`} label={lv.fields.provider} options={PARCEL_PROVIDERS} />
                <TextInput path={`delivery.parcelLockers.${i}.lockerId`} label={lv.editor.lockerId} max={40} optional />
                <TextInput path={`delivery.parcelLockers.${i}.name`} label={lv.fields.lockerName} max={LIMITS.shortText} />
                <TextInput path={`delivery.parcelLockers.${i}.address`} label={lv.fields.lockerAddress} max={LIMITS.addressLine} />
                <div className="sm:col-span-2">
                  <Button variant="ghost" onClick={() => set(`delivery.parcelLockers.${i}`, undefined)}>
                    {lv.editor.remove} {l.name}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {lockers.length < LIMITS.maxParcelLockers && (
            <Button className="mt-2" onClick={() => set('delivery.parcelLockers', [...lockers, EMPTY_LOCKER])}>
              {lv.editor.addLocker}
            </Button>
          )}
        </div>
      </div>
    </Fieldset>
  )
}
