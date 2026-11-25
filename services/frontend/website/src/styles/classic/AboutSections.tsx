import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { HA_GROUP_PROJECTS, ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { legalValues } from '@/components/legal/legal-values'
import { ProjectCards } from '@/components/layout/ProjectLogo'
import { RegisterButton } from '@/components/layout/RegisterButton'
import { Card } from '@/components/ui/Card'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Section } from '@/components/ui/Section'

/** A donor's three steps, in order: `how.steps.<key>` in `about.json`. */
const DONOR_STEPS: ReadonlyArray<{ readonly key: 'find' | 'choose' | 'deliver'; readonly icon: IconName }> = [
  { key: 'find', icon: 'pin' },
  { key: 'choose', icon: 'check' },
  { key: 'deliver', icon: 'heart' },
]

/** An institution's four steps, in order: `institutions.steps.<key>`. */
const INSTITUTION_STEPS = ['register', 'approve', 'map', 'help'] as const

const PRINCIPLES = ['free', 'operator'] as const

const IconBubble = ({ name }: { name: IconName }) => (
  <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-(--surface-accent-soft) text-(length:--text-xl) text-(--text-accent)">
    <Icon name={name} />
  </span>
)

/** "Kā palīdzēt": find, tick "Es ziedošu", deliver. */
export const DonorSteps = () => {
  const { t } = useTranslation('about')
  return (
    <Section tone="sunken" title={t('how.title')} subtitle={t('how.subtitle')}>
      <ol className="grid gap-5 sm:grid-cols-3">
        {DONOR_STEPS.map(({ key, icon }, index) => (
          <li key={key}>
            <Card className="h-full">
              <div className="flex items-center justify-between">
                <IconBubble name={icon} />
                <span aria-hidden="true" className="font-(family-name:--font-display) text-(length:--text-3xl) font-semibold text-(--text-muted)">
                  {index + 1}
                </span>
              </div>
              <h3 className="mt-5 text-(length:--text-xl) text-(--text-primary)">{t(`how.steps.${key}.title`)}</h3>
              <p className="mt-2 text-(--text-secondary)">{t(`how.steps.${key}.body`)}</p>
            </Card>
          </li>
        ))}
      </ol>
    </Section>
  )
}

/** "Vai jūsu iestādei vajadzīga palīdzība?": the four steps from application to help, and the way in. */
export const Institutions = () => {
  const { t } = useTranslation('about')
  const { locale } = useLocale()
  return (
    <Section>
      <div className="overflow-hidden rounded-(--radius-2xl) border border-(--border-accent-soft) bg-(--surface-accent-soft) p-6 sm:p-10 lg:p-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div>
            <p className="text-(length:--text-sm) font-semibold tracking-wide text-(--text-accent) uppercase">{t('institutions.eyebrow')}</p>
            <h2 className="mt-3 text-(length:--text-3xl) text-(--text-primary)">{t('institutions.title')}</h2>
            <p className="mt-4 text-(length:--text-lg) text-(--text-secondary)">{t('institutions.body')}</p>
            <div className="mt-8 flex flex-col items-start gap-3">
              <RegisterButton size="lg" />
              <Link to={localePath(ROUTES.account, locale)} className="inline-flex min-h-11 items-center font-medium text-(--text-accent) underline underline-offset-2">
                {t('institutions.account')}
              </Link>
            </div>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2">
            {INSTITUTION_STEPS.map((key, index) => (
              <li key={key} className="rounded-(--radius-lg) bg-(--surface-raised) p-5 shadow-(--shadow-subtle)">
                <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-(--fill-accent) font-semibold text-(--text-on-accent)">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-(length:--text-lg) font-semibold text-(--text-primary)">{t(`institutions.steps.${key}.title`)}</h3>
                <p className="mt-1.5 text-(length:--text-sm) text-(--text-secondary)">{t(`institutions.steps.${key}.body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  )
}

/** No money and no fee, and who runs it. */
export const Principles = () => {
  const { t } = useTranslation('about')
  const v = legalValues()
  return (
    <Section tone="sunken" title={t('principles.title')}>
      <div className="grid gap-5 md:grid-cols-2">
        {PRINCIPLES.map((key) => (
          <Card key={key} className="h-full">
            <h3 className="text-(length:--text-xl) text-(--text-primary)">{t(`principles.${key}.title`)}</h3>
            <p className="mt-2 text-(--text-secondary)">{t(`principles.${key}.body`, v)}</p>
          </Card>
        ))}
      </div>
    </Section>
  )
}

/** "Citi HA Group projekti": each one a card with its logo that opens the project in a new tab. */
export const OtherProjectsSection = () => {
  const { t } = useTranslation('about')
  return (
    <Section title={t('projects.title')} subtitle={t('projects.subtitle')}>
      <ProjectCards projects={HA_GROUP_PROJECTS} className="sm:grid-cols-2 lg:grid-cols-4" />
    </Section>
  )
}
