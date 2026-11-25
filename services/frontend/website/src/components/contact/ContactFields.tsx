import { useTranslation } from 'react-i18next'

import { FIELD_LIMITS } from '@/config/constants'
import type { ContactFormValues, FieldErrors } from '@/lib/validation'
import { Input, Textarea } from '@/components/ui/Field'
import { ConsentCheckbox } from './ConsentCheckbox'

/**
 * The inputs. Presentational: it owns no state and decides nothing.
 *
 * Split out so `ContactForm` reads as the submit logic it actually is, rather
 * than as two hundred lines of markup with a state machine buried at the top.
 */
export const ContactFields = ({
  values,
  errors,
  privacyHref,
  onChange,
}: {
  values: ContactFormValues
  /** Already translated. This component does no key lookup of its own. */
  errors: Partial<Record<keyof FieldErrors, string>>
  privacyHref: string
  onChange: <K extends keyof ContactFormValues>(
    field: K,
    value: ContactFormValues[K],
  ) => void
}) => {
  const { t } = useTranslation('contact')
  const remaining = FIELD_LIMITS.message.max - values.message.length

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label={t('form.name')}
          name="name"
          autoComplete="name"
          required
          maxLength={FIELD_LIMITS.name.max}
          placeholder={t('form.namePlaceholder')}
          value={values.name}
          error={errors.name}
          onChange={(e) => onChange('name', e.target.value)}
        />
        <Input
          label={t('form.email')}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={FIELD_LIMITS.email.max}
          placeholder={t('form.emailPlaceholder')}
          value={values.email}
          error={errors.email}
          onChange={(e) => onChange('email', e.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label={t('form.phone')}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          badge={t('form.phoneOptional')}
          maxLength={FIELD_LIMITS.phone.max}
          placeholder={t('form.phonePlaceholder')}
          value={values.phone}
          error={errors.phone}
          onChange={(e) => onChange('phone', e.target.value)}
        />
        <Input
          label={t('form.subject')}
          name="subject"
          required
          maxLength={FIELD_LIMITS.subject.max}
          placeholder={t('form.subjectPlaceholder')}
          value={values.subject}
          error={errors.subject}
          onChange={(e) => onChange('subject', e.target.value)}
        />
      </div>

      <Textarea
        label={t('form.message')}
        name="message"
        required
        maxLength={FIELD_LIMITS.message.max}
        placeholder={t('form.messagePlaceholder')}
        value={values.message}
        error={errors.message}
        hint={t('form.charactersLeft', { count: remaining })}
        onChange={(e) => onChange('message', e.target.value)}
      />

      <ConsentCheckbox
        checked={values.consent}
        error={errors.consent}
        onChange={(checked) => onChange('consent', checked)}
        privacyHref={privacyHref}
      />
    </>
  )
}
