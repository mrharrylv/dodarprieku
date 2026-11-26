import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import '@/components/profile-editor/needs.css'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'

/** After a successful submit: what happens next, and where the email goes. */
export const SuccessScreen = ({ email, claim = false }: { email: string; claim?: boolean }) => {
  const { t } = useTranslation('register')
  const { locale } = useLocale()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])

  return (
    <section role="status" className="rounded-(--radius-2xl) border border-(--border-subtle) bg-(--surface-raised) p-8 text-center shadow-(--shadow-card) sm:p-12">
      <span aria-hidden="true" className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-(--surface-accent-soft) text-(--text-accent) motion-safe:animate-[need-pop_400ms_ease-out]">
        <Icon name="heart" className="h-8 w-8" />
      </span>
      <h2 ref={heading} tabIndex={-1} className="mt-6 font-display text-(length:--text-3xl) text-(--text-primary) outline-none">
        {t('success.title')}
      </h2>
      <p className="mx-auto mt-3 max-w-prose text-(length:--text-lg) text-(--text-secondary)">{t(claim ? 'claim.successBody' : 'success.body')}</p>
      {email !== '' && <p className="mt-3 text-(--text-secondary)">{t('success.email', { email })}</p>}
      <p className="mx-auto mt-3 max-w-prose text-(length:--text-sm) text-(--text-muted)">{t('success.spam')}</p>
      <div className="mt-8 flex justify-center">
        <ButtonLink to={localePath(ROUTES.home, locale)} variant="secondary">
          {t('success.home')}
        </ButtonLink>
      </div>
    </section>
  )
}
