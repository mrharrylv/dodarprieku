import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CategoryId } from '@shared/catalog'
import { LIMITS } from '@shared/contracts'

import { Textarea } from '@/components/ui/Field'
import { LogoUploader } from '@/components/upload/LogoUploader'
import { PhotoUploader } from '@/components/upload/PhotoUploader'
import { CategoryGrid } from './CategoryGrid'
import { ConfirmPanel } from './ConfirmPanel'
import { ErrorText, Fieldset } from './controls'
import type { SectionProps } from './form-model'
import { useFieldError } from './useFieldError'

/** Step 2 / tab 2: category, description, logo and photos. */
export const AboutSection = ({ form, update, errors }: SectionProps) => {
  const { t } = useTranslation('register')
  const error = useFieldError(errors)
  const [askingFor, setAskingFor] = useState<CategoryId | null>(null)
  const categoryErrorId = useId()
  const categoryError = error('category')

  const choose = (id: CategoryId) => {
    if (id === form.category) return
    if (form.category !== '' && form.needs.length > 0) {
      setAskingFor(id)
      return
    }
    update((f) => ({ ...f, category: id }))
  }

  const confirmChange = () => {
    if (askingFor !== null) update((f) => ({ ...f, category: askingFor, needs: [] }))
    setAskingFor(null)
  }

  return (
    <div className="space-y-10">
      <Fieldset legend={t('about.categoryLegend')} hint={t('about.categoryHint')}>
        {categoryError !== undefined && <ErrorText id={categoryErrorId}>{categoryError}</ErrorText>}
        {askingFor !== null && (
          <ConfirmPanel
            title={t('categoryChange.title')}
            body={t('categoryChange.body', { count: form.needs.length })}
            confirmLabel={t('categoryChange.confirm')}
            cancelLabel={t('categoryChange.cancel')}
            onConfirm={confirmChange}
            onCancel={() => setAskingFor(null)}
          />
        )}
        <CategoryGrid
          name="category"
          value={form.category}
          onSelect={choose}
          describedBy={categoryError === undefined ? undefined : categoryErrorId}
        />
      </Fieldset>

      <div>
        <Textarea
          label={t('about.description')}
          hint={t('about.descriptionHint')}
          required
          rows={7}
          maxLength={LIMITS.description}
          value={form.description}
          error={error('description')}
          onChange={(e) => update((f) => ({ ...f, description: e.target.value }))}
        />
        <p className="mt-1 text-right text-(length:--text-xs) text-(--text-muted)">
          {t('about.counter', { len: form.description.length, max: LIMITS.description })}
        </p>
      </div>

      <Fieldset legend={t('about.logoLegend')} hint={t('about.logoHint')} error={error('logo')}>
        <LogoUploader
          value={form.logo}
          alt={t('about.logoAlt', { name: form.organization.name })}
          onChange={(logo) => update((f) => ({ ...f, logo }))}
        />
      </Fieldset>

      <Fieldset legend={t('about.photosLegend')} hint={t('about.photosHint', { max: LIMITS.maxPhotos })} error={error('photos')}>
        <PhotoUploader photos={form.photos} onChange={(fn) => update((f) => ({ ...f, photos: fn(f.photos) }))} />
      </Fieldset>
    </div>
  )
}
