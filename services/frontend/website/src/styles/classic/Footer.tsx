import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { COMPANY, LEGAL_LINKS, NAV_LINKS, ROUTES, SITE, activeSocial } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { BrandMark } from '@/components/layout/BrandMark'
import { CompanyDetails } from '@/components/layout/CompanyDetails'
import { CopyrightYear } from '@/components/layout/CopyrightYear'
import { DevelopedBy } from '@/components/layout/DevelopedBy'
import { OtherProjects } from '@/components/layout/OtherProjects'
import { Container } from '@/components/ui/Container'

export const Footer = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()
  const social = activeSocial()

  return (
    // Its own band: a shade below the page, under a line of the accent colour.
    <footer
      className="mt-auto border-t-2 border-(--fill-accent) bg-(--surface-sunken) text-(--text-secondary)"
    >
      <Container>
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="inline-flex items-center gap-2 font-(family-name:--font-display) text-(length:--text-xl) font-semibold text-(--text-primary)">
              <BrandMark />
              <span>{SITE.wordmark}</span>
            </p>
            <p className="mt-3 max-w-xs text-(length:--text-sm) text-(--text-secondary)">
              {t('footer.tagline')}
            </p>

            {social.length > 0 && (
              <ul className="mt-5 flex gap-3">
                {social.map(([platform, url]) => (
                  <li key={platform}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-(length:--text-sm) text-(--text-secondary) underline underline-offset-4 hover:text-(--text-accent)"
                    >
                      {platform}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <FooterNav
            heading={t('footer.navHeading')}
            label={t('a11y.footerNavigation')}
            links={NAV_LINKS.map((link) => ({
              to: localePath(link.to, locale),
              label: t(link.labelKey),
            }))}
          />

          <FooterNav
            heading={t('footer.legalHeading')}
            links={LEGAL_LINKS.map((link) => ({
              to: localePath(link.to, locale),
              label: t(link.labelKey),
            }))}
          />

          <CompanyDetails />
        </div>

        <OtherProjects className="border-t border-(--border-subtle) py-6" />

        <div className="flex flex-col gap-3 border-t border-(--border-subtle) py-6 text-(length:--text-xs) text-(--text-muted) sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <CopyrightYear />{' '}
            <Link
              to={localePath(ROUTES.company, locale)}
              className="underline underline-offset-4 hover:text-(--text-secondary)"
            >
              {COMPANY.legalName}
            </Link>
            . {t('footer.rights')}
          </p>
          <DevelopedBy />
        </div>
      </Container>
    </footer>
  )
}

const FooterNav = ({
  heading,
  label,
  links,
}: {
  heading: string
  label?: string
  links: ReadonlyArray<{ to: string; label: string }>
}) => (
  <nav {...(label !== undefined ? { 'aria-label': label } : {})}>
    <h2 className="text-(length:--text-sm) font-semibold uppercase tracking-wide text-(--text-muted)">
      {heading}
    </h2>
    <ul className="mt-4 space-y-1">
      {links.map((link) => (
        <li key={link.to}>
          <Link
            to={link.to}
            className="inline-flex min-h-11 items-center text-(length:--text-sm) text-(--text-secondary) hover:text-(--text-accent)"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
)
