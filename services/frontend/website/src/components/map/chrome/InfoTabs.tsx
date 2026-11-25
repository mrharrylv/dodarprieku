import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { COMPANY, CONTACT, HA_GROUP_PROJECTS, REGISTER_CTA, ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Icon, type IconName } from '@/components/ui/Icon'
import { BrandMark } from '@/components/layout/BrandMark'
import { ProjectCards } from '@/components/layout/ProjectLogo'
import { buttonClasses } from '@/components/ui/button-styles'

const DONOR_STEPS: ReadonlyArray<{ readonly key: 'find' | 'choose' | 'deliver'; readonly icon: IconName }> = [
  { key: 'find', icon: 'pin' },
  { key: 'choose', icon: 'check' },
  { key: 'deliver', icon: 'heart' },
]

/** Register, we approve, on the map: `about.json`'s first three institution steps. */
const INSTITUTION_STEPS = ['register', 'approve', 'map'] as const

const Heading = ({ children }: { children: ReactNode }) => (
  <h3 className="text-(length:--text-base) font-semibold text-(--text-primary)">{children}</h3>
)

/** "Par projektu": what Dod ar prieku is and how it works. */
export const AboutTab = () => {
  const { t } = useTranslation('map')
  const { t: ta } = useTranslation('about')
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <BrandMark className="h-11 w-11 shrink-0" />
        <div>
          <p className="font-(family-name:--font-display) text-(length:--text-lg) leading-snug font-semibold text-(--text-primary)">{ta('title')}</p>
          <p className="mt-1.5 text-(length:--text-sm) text-(--text-secondary)">{ta('lead')}</p>
        </div>
      </div>
      <section className="space-y-1.5">
        <Heading>{t('info.how.title')}</Heading>
        <p className="text-(length:--text-sm) text-(--text-secondary)">{t('info.how.body')}</p>
      </section>
      <section className="space-y-1.5 rounded-(--radius-lg) bg-(--surface-sunken) p-4">
        <Heading>{ta('principles.free.title')}</Heading>
        <p className="text-(length:--text-sm) text-(--text-secondary)">{ta('principles.free.body')}</p>
      </section>
    </div>
  )
}

/** "Kā palīdzēt": a donor's three steps, then, emphasised, how an institution joins. */
export const HelpTab = () => {
  const { t } = useTranslation('map')
  const { t: ta } = useTranslation('about')
  const { t: tc } = useTranslation('common')
  const { locale } = useLocale()
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <Heading>{t('info.donors')}</Heading>
        <ol className="space-y-3">
          {DONOR_STEPS.map(({ key, icon }) => (
            <li key={key} className="flex gap-3">
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--surface-accent-soft) text-(--text-accent)">
                <Icon name={icon} />
              </span>
              <span>
                <span className="block font-medium text-(--text-primary)">{ta(`how.steps.${key}.title`)}</span>
                <span className="block text-(length:--text-sm) text-(--text-secondary)">{ta(`how.steps.${key}.body`)}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
      <section className="rounded-(--radius-xl) border border-(--border-accent-soft) bg-(--surface-accent-soft) p-4">
        <p className="text-(length:--text-xs) font-semibold tracking-wide text-(--text-accent) uppercase">{ta('institutions.eyebrow')}</p>
        <h3 className="mt-1 text-(length:--text-lg) font-semibold text-(--text-primary)">{ta('institutions.title')}</h3>
        <p className="mt-1.5 text-(length:--text-sm) text-(--text-secondary)">{ta('institutions.body')}</p>
        <p className="mt-4 text-(length:--text-sm) font-semibold text-(--text-primary)">{t('info.institutionSteps')}</p>
        <ol className="mt-2 space-y-2.5">
          {INSTITUTION_STEPS.map((key, index) => (
            <li key={key} className="flex gap-3">
              <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--fill-accent) text-(length:--text-sm) font-semibold text-(--text-on-accent)">
                {index + 1}
              </span>
              <span className="text-(length:--text-sm)">
                <span className="font-medium text-(--text-primary)">{ta(`institutions.steps.${key}.title`)}. </span>
                <span className="text-(--text-secondary)">{ta(`institutions.steps.${key}.body`)}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link to={localePath(REGISTER_CTA.to, locale)} className={buttonClasses('primary', 'sm', 'rounded-full')}>
            <Icon name="plus" />
            {tc(REGISTER_CTA.labelKey)}
          </Link>
          <Link to={localePath(ROUTES.account, locale)} className="inline-flex min-h-11 items-center text-(length:--text-sm) font-medium text-(--text-accent) underline underline-offset-2">
            {ta('institutions.account')}
          </Link>
        </div>
      </section>
    </div>
  )
}

/** "Par mums": who maintains it, the company details, and HA Group's other projects. */
export const UsTab = () => {
  const { t } = useTranslation('map')
  const { t: tc } = useTranslation('common')
  return (
    <div className="space-y-6">
      <section className="rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-sunken) p-4">
        <Heading>{t('info.maintainer', { name: COMPANY.legalName })}</Heading>
        <address className="mt-2 space-y-0.5 text-(length:--text-sm) text-(--text-secondary) not-italic">
          <p>{tc('footer.registrationNumber', { value: COMPANY.registrationNumber })}</p>
          <p>{tc('footer.vatNumber', { value: COMPANY.vatNumber })}</p>
          <p>{t('info.address', { value: `${CONTACT.address.street}, ${CONTACT.address.city}, ${CONTACT.address.postalCode}` })}</p>
          <p>
            <a href={`mailto:${CONTACT.email}`} className="inline-flex min-h-11 items-center font-medium text-(--text-accent) underline underline-offset-2">
              {CONTACT.email}
            </a>
          </p>
        </address>
      </section>
      <section className="space-y-3">
        <Heading>{t('info.projects')}</Heading>
        <ProjectCards projects={HA_GROUP_PROJECTS} />
      </section>
    </div>
  )
}
