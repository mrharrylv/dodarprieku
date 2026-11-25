import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { LEGAL_FORMS, PARCEL_PROVIDERS, categoryById, needLabel } from '@shared/catalog'

import type { ProfileForm } from '@/components/profile-editor/form-model'
import { mediaUrl } from '@/components/upload/photo-list'
import { WIZARD_STEPS } from './wizard-steps'

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid gap-1 py-2 sm:grid-cols-[12rem_1fr] sm:gap-4">
    <dt className="text-(length:--text-sm) text-(--text-muted)">{label}</dt>
    <dd className="min-w-0 break-words text-(--text-primary)">{children}</dd>
  </div>
)

const Block = ({ title, onEdit, editLabel, editText, children }: { title: string; onEdit: () => void; editLabel: string; editText: string; children: ReactNode }) => (
  <section className="rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised) p-5">
    <div className="mb-2 flex items-center justify-between gap-3">
      <h3 className="font-display text-(length:--text-lg) text-(--text-primary)">{title}</h3>
      <button type="button" onClick={onEdit} aria-label={editLabel}
        className="min-h-11 rounded-(--radius-md) px-3 font-medium text-(--text-accent) underline underline-offset-4 hover:bg-(--surface-sunken)">
        {/* The visible word is short; the accessible name says which section. */}
        <span aria-hidden="true">{editText}</span>
      </button>
    </div>
    <dl className="divide-y divide-(--border-subtle)">{children}</dl>
  </section>
)

/** Everything the wizard collected, each block with a way back to its step. */
export const ProfileSummary = ({ form, onEdit }: { form: ProfileForm; onEdit: (step: number) => void }) => {
  const { t } = useTranslation('register')
  const none = t('review.none')
  const o = form.organization
  const p = form.contactPerson
  const d = form.delivery
  const edit = (id: (typeof WIZARD_STEPS)[number]) => ({
    onEdit: () => onEdit(WIZARD_STEPS.indexOf(id)),
    editLabel: t('review.edit', { section: t(`steps.${id}`) }),
    editText: t('review.editShort'),
    title: t(`steps.${id}`),
  })
  const or = (v: string) => (v.trim() === '' ? none : v)

  return (
    <div className="space-y-4">
      <Block {...edit('organization')}>
        <Row label={t('organization.name')}>{or(o.name)}</Row>
        <Row label={t('organization.legalName')}>{or(o.legalName)}</Row>
        <Row label={t('organization.regNumber')}>{or(o.regNumber)}</Row>
        <Row label={t('organization.legalForm')}>{LEGAL_FORMS.find((f) => f.id === o.legalForm)?.label ?? none}</Row>
        <Row label={t('organization.publicBenefit')}>{o.publicBenefit ? t('review.yes') : t('review.no')}</Row>
        <Row label={t('review.publicContacts')}>{[o.email, o.phone, o.website, o.facebook, o.instagram].filter((v) => v !== '').join(', ') || none}</Row>
        <Row label={t('review.contactPerson')}>{[`${p.firstName} ${p.lastName}`.trim(), p.email, p.phone].filter((v) => v !== '').join(', ') || none}</Row>
      </Block>

      <Block {...edit('about')}>
        <Row label={t('about.categoryLegend')}>{form.category === '' ? none : categoryById(form.category).label}</Row>
        <Row label={t('about.description')}><span className="whitespace-pre-line">{or(form.description)}</span></Row>
        <Row label={t('about.photosLegend')}>
          {form.photos.length === 0 ? none : (
            <span className="flex flex-wrap gap-2">
              {form.photos.map((key, i) => (
                <img key={key} src={mediaUrl(key)} alt={t('upload.photoAlt', { n: i + 1 })} className="h-14 w-20 rounded-(--radius-sm) object-cover" />
              ))}
            </span>
          )}
        </Row>
      </Block>

      <Block {...edit('location')}>
        <Row label={t('location.addressLegend')}>{or([form.address.street, form.address.city, form.address.postalCode].filter((v) => v !== '').join(', '))}</Row>
        <Row label={t('location.mapLegend')}>{form.location ? t('location.pinAt', { lat: form.location.lat.toFixed(5), lng: form.location.lng.toFixed(5) }) : t('location.noPin')}</Row>
      </Block>

      <Block {...edit('needs')}>
        <Row label={t('needs.legend')}>
          {form.needs.length === 0 || form.category === '' ? none : (
            <ul className="space-y-1">
              {form.needs.map((need, i) => (
                <li key={`${need.itemId}-${i}`}>
                  {needLabel(form.category as Exclude<ProfileForm['category'], ''>, need)}
                  {need.urgent && <strong className="ml-2 text-(--color-danger-600)">{t('needs.urgentBadge')}</strong>}
                  {need.note !== undefined && need.note.trim() !== '' && <span className="text-(--text-secondary)">: {need.note}</span>}
                </li>
              ))}
            </ul>
          )}
        </Row>
      </Block>

      <Block {...edit('delivery')}>
        {d.inPerson.enabled && <Row label={t('delivery.inPerson.title')}>{[d.inPerson.address, d.inPerson.hours].filter((v) => v !== '').join(', ')}</Row>}
        {d.dropOff.enabled && <Row label={t('delivery.dropOff.title')}>{[d.dropOff.address, d.dropOff.hours].filter((v) => v !== '').join(', ')}</Row>}
        {d.lockersEnabled && (
          <Row label={t('delivery.lockers.title')}>
            {d.parcelLockers.length === 0 ? none : d.parcelLockers.map((l) => `${PARCEL_PROVIDERS.find((x) => x.id === l.provider)?.label ?? l.provider}: ${l.name}`).join('; ')}
          </Row>
        )}
        {d.post.enabled && <Row label={t('delivery.post.title')}>{d.post.address}</Row>}
        {!d.inPerson.enabled && !d.dropOff.enabled && !d.lockersEnabled && !d.post.enabled && <Row label={t('delivery.legend')}>{none}</Row>}
      </Block>
    </div>
  )
}
