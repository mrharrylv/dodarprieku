/**
 * The editable shape of a charity profile, shared by the registration wizard
 * and the account editor. Every text field is a plain string (an empty field is
 * ''), the delivery options carry their on/off switches, and nothing here is
 * trusted: `formToProfileInput` builds the object `validateProfile`
 * (@shared/validate) checks, and only its validated value is ever sent.
 */

import type { CategoryId } from '@shared/catalog'
import type {
  CharityProfile,
  GeoPoint,
  LegalForm,
  Need,
  ParcelLockerChoice,
  Sponsor,
} from '@shared/contracts'

export interface PlaceForm {
  readonly enabled: boolean
  readonly address: string
  readonly hours: string
}

export interface DeliveryForm {
  readonly inPerson: PlaceForm
  readonly dropOff: PlaceForm
  readonly lockersEnabled: boolean
  readonly parcelLockers: readonly ParcelLockerChoice[]
  readonly post: { readonly enabled: boolean; readonly address: string }
}

export interface OrganizationForm {
  readonly name: string
  readonly legalName: string
  readonly regNumber: string
  readonly legalForm: LegalForm | ''
  readonly publicBenefit: boolean
  readonly email: string
  readonly phone: string
  readonly website: string
  readonly facebook: string
  readonly instagram: string
}

export interface ProfileForm {
  readonly organization: OrganizationForm
  readonly contactPerson: { readonly firstName: string; readonly lastName: string; readonly email: string; readonly phone: string }
  readonly address: { readonly street: string; readonly city: string; readonly postalCode: string }
  readonly location: GeoPoint | null
  readonly category: CategoryId | ''
  readonly description: string
  readonly photos: readonly string[]
  readonly logo: string
  readonly needs: readonly Need[]
  readonly delivery: DeliveryForm
  readonly sponsors: readonly Sponsor[]
}

const EMPTY_PLACE: PlaceForm = { enabled: false, address: '', hours: '' }

export const EMPTY_FORM: ProfileForm = {
  organization: {
    name: '',
    legalName: '',
    regNumber: '',
    legalForm: '',
    publicBenefit: false,
    email: '',
    phone: '',
    website: '',
    facebook: '',
    instagram: '',
  },
  contactPerson: { firstName: '', lastName: '', email: '', phone: '' },
  address: { street: '', city: '', postalCode: '' },
  location: null,
  category: '',
  description: '',
  photos: [],
  logo: '',
  needs: [],
  delivery: {
    inPerson: EMPTY_PLACE,
    dropOff: EMPTY_PLACE,
    lockersEnabled: false,
    parcelLockers: [],
    post: { enabled: false, address: '' },
  },
  sponsors: [],
}

/** One line of the institution's address, to prefill the delivery addresses. */
export const addressLine = (address: ProfileForm['address']): string =>
  [address.street, address.city, address.postalCode].map((part) => part.trim()).filter((part) => part !== '').join(', ')

const place = (p: PlaceForm) => (p.enabled ? { address: p.address, hours: p.hours } : undefined)

const withValue = <K extends string>(key: K, value: unknown): Record<string, unknown> =>
  value === undefined || value === '' ? {} : { [key]: value }

/** The object `validateProfile` checks. Switched-off options and empty optional keys are left out. */
export const formToProfileInput = (form: ProfileForm): Record<string, unknown> => ({
  organization: { ...form.organization },
  contactPerson: { ...form.contactPerson },
  address: { ...form.address },
  ...withValue('location', form.location ?? undefined),
  category: form.category,
  description: form.description,
  photos: [...form.photos],
  ...withValue('logo', form.logo),
  needs: form.needs.map((need) => ({ ...need })),
  delivery: {
    ...withValue('inPerson', place(form.delivery.inPerson)),
    ...withValue('dropOff', place(form.delivery.dropOff)),
    parcelLockers: form.delivery.lockersEnabled ? form.delivery.parcelLockers.map((l) => ({ ...l })) : [],
    ...withValue('post', form.delivery.post.enabled ? { address: form.delivery.post.address } : undefined),
  },
  sponsors: form.sponsors.map((s) => ({ name: s.name, ...withValue('url', s.url), ...withValue('logo', s.logo) })),
})

const placeForm = (p: { address: string; hours?: string } | undefined): PlaceForm =>
  p ? { enabled: true, address: p.address, hours: p.hours ?? '' } : EMPTY_PLACE

/** A stored profile, opened for editing. */
export const profileToForm = (profile: CharityProfile): ProfileForm => ({
  organization: {
    ...profile.organization,
    website: profile.organization.website ?? '',
    facebook: profile.organization.facebook ?? '',
    instagram: profile.organization.instagram ?? '',
  },
  contactPerson: { ...profile.contactPerson },
  address: { ...profile.address },
  location: { ...profile.location },
  category: profile.category,
  description: profile.description,
  photos: [...profile.photos],
  logo: profile.logo ?? '',
  needs: profile.needs.map((n) => ({ ...n })),
  delivery: {
    inPerson: placeForm(profile.delivery.inPerson),
    dropOff: placeForm(profile.delivery.dropOff),
    lockersEnabled: profile.delivery.parcelLockers.length > 0,
    parcelLockers: profile.delivery.parcelLockers.map((l) => ({ ...l })),
    post: profile.delivery.post ? { enabled: true, address: profile.delivery.post.address } : { enabled: false, address: '' },
  },
  sponsors: profile.sponsors.map((s) => ({ ...s })),
})

/** What a section hands back: a function from the current form to the next one. */
export type FormUpdate = (fn: (form: ProfileForm) => ProfileForm) => void

/** What every form section takes. */
export interface SectionProps {
  readonly form: ProfileForm
  readonly update: FormUpdate
  readonly errors: Readonly<Record<string, string>>
}

export const patchOrganization = (form: ProfileForm, patch: Partial<OrganizationForm>): ProfileForm => ({
  ...form,
  organization: { ...form.organization, ...patch },
})

export const patchContact = (form: ProfileForm, patch: Partial<ProfileForm['contactPerson']>): ProfileForm => ({
  ...form,
  contactPerson: { ...form.contactPerson, ...patch },
})

export const patchAddress = (form: ProfileForm, patch: Partial<ProfileForm['address']>): ProfileForm => ({
  ...form,
  address: { ...form.address, ...patch },
})

export const patchDelivery = (form: ProfileForm, patch: Partial<DeliveryForm>): ProfileForm => ({
  ...form,
  delivery: { ...form.delivery, ...patch },
})
