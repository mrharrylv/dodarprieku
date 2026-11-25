import { useTranslation } from 'react-i18next'

import { LEGAL_FORMS } from '@shared/catalog'
import { LIMITS, type LegalForm } from '@shared/contracts'

import { Input } from '@/components/ui/Field'
import { Fieldset, Select, Toggle } from './controls'
import { patchContact, patchOrganization, type SectionProps } from './form-model'
import { useFieldError } from './useFieldError'

const GRID = 'grid gap-5 sm:grid-cols-2'

/** Step 1 / tab 1: the organisation, its public contacts and the private contact person. */
export const OrganizationSection = ({ form, update, errors }: SectionProps) => {
  const { t } = useTranslation('register')
  const error = useFieldError(errors)
  const org = form.organization
  const person = form.contactPerson
  const optional = t('common.optional')

  const setOrg = (patch: Parameters<typeof patchOrganization>[1]) => update((f) => patchOrganization(f, patch))
  const setPerson = (patch: Parameters<typeof patchContact>[1]) => update((f) => patchContact(f, patch))

  return (
    <div className="space-y-10">
      <Fieldset legend={t('organization.legend')} hint={t('organization.hint')}>
        <div className={GRID}>
          <Input label={t('organization.name')} hint={t('organization.nameHint')} required value={org.name}
            maxLength={LIMITS.orgName} autoComplete="organization" error={error('organization.name')}
            onChange={(e) => setOrg({ name: e.target.value })} />
          <Input label={t('organization.legalName')} hint={t('organization.legalNameHint')} required value={org.legalName}
            maxLength={LIMITS.legalName} error={error('organization.legalName')}
            onChange={(e) => setOrg({ legalName: e.target.value })} />
          <Input label={t('organization.regNumber')} hint={t('organization.regNumberHint')} required value={org.regNumber}
            maxLength={LIMITS.regNumber} inputMode="numeric" error={error('organization.regNumber')}
            onChange={(e) => setOrg({ regNumber: e.target.value })} />
          <Select label={t('organization.legalForm')} required value={org.legalForm} error={error('organization.legalForm')}
            onChange={(e) => setOrg({ legalForm: e.target.value as LegalForm | '' })}>
            <option value="">{t('organization.legalFormPlaceholder')}</option>
            {LEGAL_FORMS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </Select>
        </div>
        <Toggle label={t('organization.publicBenefit')} description={t('organization.publicBenefitHint')}
          checked={org.publicBenefit} onChange={(publicBenefit) => setOrg({ publicBenefit })} />
      </Fieldset>

      <Fieldset legend={t('organization.contactsLegend')} hint={t('organization.contactsHint')}>
        <div className={GRID}>
          <Input label={t('organization.email')} type="email" required value={org.email} maxLength={LIMITS.email}
            autoComplete="email" error={error('organization.email')} onChange={(e) => setOrg({ email: e.target.value })} />
          <Input label={t('organization.phone')} type="tel" required value={org.phone} maxLength={LIMITS.phone}
            autoComplete="tel" hint={t('organization.phoneHint')} error={error('organization.phone')}
            onChange={(e) => setOrg({ phone: e.target.value })} />
          <Input label={t('organization.website')} type="url" badge={optional} value={org.website} maxLength={LIMITS.url}
            placeholder={t('organization.websitePlaceholder')} error={error('organization.website')} onChange={(e) => setOrg({ website: e.target.value })} />
          <Input label={t('organization.facebook')} type="url" badge={optional} value={org.facebook} maxLength={LIMITS.url}
            placeholder={t('organization.facebookPlaceholder')} error={error('organization.facebook')}
            onChange={(e) => setOrg({ facebook: e.target.value })} />
          <Input label={t('organization.instagram')} type="url" badge={optional} value={org.instagram} maxLength={LIMITS.url}
            placeholder={t('organization.instagramPlaceholder')} error={error('organization.instagram')}
            onChange={(e) => setOrg({ instagram: e.target.value })} />
        </div>
      </Fieldset>

      <Fieldset legend={t('organization.personLegend')} hint={t('organization.personHint')}>
        <div className={GRID}>
          <Input label={t('organization.firstName')} required value={person.firstName} maxLength={LIMITS.personName}
            autoComplete="given-name" error={error('contactPerson.firstName')}
            onChange={(e) => setPerson({ firstName: e.target.value })} />
          <Input label={t('organization.lastName')} required value={person.lastName} maxLength={LIMITS.personName}
            autoComplete="family-name" error={error('contactPerson.lastName')}
            onChange={(e) => setPerson({ lastName: e.target.value })} />
          <Input label={t('organization.personEmail')} type="email" required value={person.email} maxLength={LIMITS.email}
            autoComplete="email" error={error('contactPerson.email')} onChange={(e) => setPerson({ email: e.target.value })} />
          <Input label={t('organization.personPhone')} type="tel" required value={person.phone} maxLength={LIMITS.phone}
            autoComplete="tel" error={error('contactPerson.phone')} onChange={(e) => setPerson({ phone: e.target.value })} />
        </div>
      </Fieldset>
    </div>
  )
}
