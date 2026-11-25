import { CATEGORIES, LEGAL_FORMS } from '@shared/catalog'
import { LIMITS } from '@shared/contracts'
import { MapPin } from '../components/MapPin'
import { lv } from '../i18n/lv'
import { fieldErrorMessage } from '../lib/errors'
import { useEditor } from './context'
import { Check, Fieldset, NumberInput, SelectInput, TextInput } from './inputs'

const f = lv.fields

export const OrganizationSection = () => {
  const { profile, set } = useEditor()
  return (
    <Fieldset legend={lv.sections.organization}>
      <TextInput path="organization.name" label={f['organization.name']} max={LIMITS.orgName} />
      <TextInput path="organization.legalName" label={f['organization.legalName']} max={LIMITS.legalName} />
      <TextInput path="organization.regNumber" label={f['organization.regNumber']} max={LIMITS.regNumber} />
      <SelectInput path="organization.legalForm" label={f['organization.legalForm']} options={LEGAL_FORMS} />
      <TextInput path="organization.email" label={f['organization.email']} type="email" max={LIMITS.email} />
      <TextInput path="organization.phone" label={f['organization.phone']} type="tel" max={LIMITS.phone} />
      <TextInput path="organization.website" label={f['organization.website']} type="url" max={LIMITS.url} optional />
      <TextInput path="organization.facebook" label={f['organization.facebook']} type="url" max={LIMITS.url} optional />
      <TextInput path="organization.instagram" label={f['organization.instagram']} type="url" max={LIMITS.url} optional />
      <div className="sm:col-span-2">
        <Check checked={profile.organization.publicBenefit} onChange={(v) => set('organization.publicBenefit', v)}>
          {f['organization.publicBenefit']}
        </Check>
      </div>
    </Fieldset>
  )
}

export const ContactSection = () => (
  <Fieldset legend={lv.sections.contactPerson} note={lv.sections.contactPrivate}>
    <TextInput path="contactPerson.firstName" label={f['contactPerson.firstName']} max={LIMITS.personName} />
    <TextInput path="contactPerson.lastName" label={f['contactPerson.lastName']} max={LIMITS.personName} />
    <TextInput path="contactPerson.email" label={f['contactPerson.email']} type="email" max={LIMITS.email} />
    <TextInput path="contactPerson.phone" label={f['contactPerson.phone']} type="tel" max={LIMITS.phone} />
  </Fieldset>
)

export const AddressSection = () => {
  const { profile, error } = useEditor()
  const loc = profile.location
  const locError = error('location')
  return (
    <Fieldset legend={lv.sections.address} error={locError ? `${f.location}: ${locError}` : undefined}>
      <TextInput path="address.street" label={f['address.street']} max={LIMITS.addressLine} />
      <TextInput path="address.city" label={f['address.city']} max={LIMITS.city} />
      <TextInput path="address.postalCode" label={f['address.postalCode']} max={LIMITS.postalCode} />
      <div />
      <NumberInput path="location.lat" label={f['location.lat']} />
      <NumberInput path="location.lng" label={f['location.lng']} />
      {Number.isFinite(loc.lat) && Number.isFinite(loc.lng) && (
        <div className="sm:col-span-2">
          <MapPin location={loc} />
        </div>
      )}
    </Fieldset>
  )
}

export const CategorySection = () => {
  const { error } = useEditor()
  const options = CATEGORIES.map((c) => ({ id: c.id, label: c.label }))
  const e = error('category')
  return (
    <Fieldset legend={lv.sections.category} error={e ? fieldErrorMessage('required') : undefined}>
      <SelectInput path="category" label={f.category} options={options} />
      <div className="sm:col-span-2">
        <TextInput path="description" label={f.description} max={LIMITS.description} multiline />
      </div>
    </Fieldset>
  )
}
