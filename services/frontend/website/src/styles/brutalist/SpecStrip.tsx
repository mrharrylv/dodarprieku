import { useTranslation } from 'react-i18next'

import { CONTACT } from '@/config/site'
import { cn } from '@/lib/cn'
import { Container } from '@/components/ui/Container'
import { FOCUS, LABEL } from './marks'

/**
 * Block-level flex, not inline-flex: an inline-flex box is max-content wide, so
 * a long email address would push the column sideways instead of wrapping in
 * it. `max-w-full` is the same guarantee stated twice, deliberately.
 */
const VALUE = cn(
  'flex min-h-11 max-w-full items-center break-words text-(length:--text-base) font-bold text-(--text-primary)',
  FOCUS,
)

/**
 * The facts a customer actually came for, directly under the heading and
 * before any marketing: how to phone, how to write, when someone answers.
 *
 * A `dl` rather than a table because the pairs stack at 320px, and `div`
 * wrappers are legal inside a definition list.
 */
export const SpecStrip = () => {
  const { t } = useTranslation('common')

  return (
    <section className="border-b-4 border-(--border-strong) bg-(--surface-sunken)">
      <Container className="py-8 sm:py-10">
        <dl className="grid gap-[2px] border-2 border-(--border-strong) bg-(--border-strong) sm:grid-cols-3">
          <div className="bg-(--surface-page) p-5">
            <dt className={LABEL}>{t('contactDetails.phone')}</dt>
            <dd>
              {/* tel: needs the E.164 form; the visible text is the readable one. */}
              <a href={`tel:${CONTACT.phoneE164}`} className={cn(VALUE, 'hover:underline hover:decoration-2 hover:underline-offset-4')}>
                {CONTACT.phone}
              </a>
            </dd>
          </div>

          <div className="bg-(--surface-page) p-5">
            <dt className={LABEL}>{t('contactDetails.email')}</dt>
            <dd>
              <a href={`mailto:${CONTACT.email}`} className={cn(VALUE, 'hover:underline hover:decoration-2 hover:underline-offset-4')}>
                {CONTACT.email}
              </a>
            </dd>
          </div>

          <div className="bg-(--surface-page) p-5">
            <dt className={LABEL}>{t('contactDetails.weekdays')}</dt>
            <dd className={VALUE}>{CONTACT.hours.weekdays}</dd>
          </div>
        </dl>
      </Container>
    </section>
  )
}
