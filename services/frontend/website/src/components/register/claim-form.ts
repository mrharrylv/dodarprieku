import type { PublicCharity } from '@shared/contracts'
import { isHttpUrl } from '@shared/validate'
import { EMPTY_FORM, type ProfileForm } from '@/components/profile-editor/form-model'

/**
 * A claim's starting form: what the public profile of an imported charity
 * already says about it. The names, registration number, legal form, address,
 * pin, category and public contacts are filled in; the contact person, the
 * description, the needs and the delivery are the claimant's to write, so the
 * register's boilerplate never reaches the new profile unread. A link the
 * form would refuse is left out rather than stopping the claimant at step 1.
 */
const link = (value: string | undefined): string => (value !== undefined && isHttpUrl(value) ? value : '')

export const claimForm = (charity: PublicCharity): ProfileForm => {
  const { organization, address, location, category } = charity.profile
  return {
    ...EMPTY_FORM,
    organization: {
      name: organization.name,
      legalName: organization.legalName,
      regNumber: organization.regNumber,
      legalForm: organization.legalForm,
      publicBenefit: organization.publicBenefit,
      email: organization.email,
      phone: organization.phone,
      website: link(organization.website),
      facebook: link(organization.facebook),
      instagram: link(organization.instagram),
    },
    address: { ...address },
    location: { ...location },
    category,
  }
}
