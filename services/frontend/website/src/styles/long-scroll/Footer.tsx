import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import {
  COMPANY,
  CONTACT,
  LEGAL_LINKS,
  NAV_LINKS,
  ROUTES,
  SITE,
  activeSocial,
} from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { CopyrightYear } from '@/components/layout/CopyrightYear'
import { DevelopedBy } from '@/components/layout/DevelopedBy'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { MapLink } from '@/components/contact/MapLink'

/**
 * The end of the scroll, and the only place the page stops moving.
 *
 * It opens with the wordmark at display scale because after six bands the
 * reader has travelled a long way from the header, and the footer is where
 * they find out whose site this was.
 */
export const Footer = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()
  const social = activeSocial()

  return (
    <footer className="mt-auto border-t border-(--border-subtle) bg-(--surface-page)">
      <Container>
        <div className="flex flex-col gap-8 py-16 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-(family-name:--font-display) text-(length:--text-4xl) font-semibold uppercase tracking-tight text-(--text-primary)">
              {SITE.name}
            </p>
            <p className="mt-4 max-w-md text-(length:--text-lg) text-(--text-secondary)">
              {t('footer.tagline')}
            </p>
          </div>

          <ButtonLink to={localePath(ROUTES.contact, locale)} size="lg">
            {t('cta.contactUs')}
          </ButtonLink>
        </div>

        <div className="grid gap-10 border-t border-(--border-subtle) py-14 sm:grid-cols-2 lg:grid-cols-3">
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

          <div>
            <FooterHeading>{t('footer.contactHeading')}</FooterHeading>
            <ul className="mt-6 space-y-3 text-(length:--text-sm) text-(--text-secondary)">
              <li>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="inline-flex min-h-11 items-center hover:text-(--text-accent)"
                >
                  {CONTACT.email}
                </a>
              </li>
              <li>
                {/* tel: needs the E.164 form; the visible text is the readable one. */}
                <a
                  href={`tel:${CONTACT.phoneE164}`}
                  className="inline-flex min-h-11 items-center hover:text-(--text-accent)"
                >
                  {CONTACT.phone}
                </a>
              </li>
              <li className="pt-2">
                <MapLink>
                  <address className="not-italic">
                    {CONTACT.address.street}
                    <br />
                    {CONTACT.address.postalCode} {CONTACT.address.city}
                    <br />
                    {CONTACT.address.country}
                  </address>
                </MapLink>
              </li>
            </ul>

            {social.length > 0 && (
              <>
                <FooterHeading className="mt-10">{t('footer.followUs')}</FooterHeading>
                <ul className="mt-4 flex flex-wrap gap-4">
                  {social.map(([platform, url]) => (
                    <li key={platform}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center text-(length:--text-sm) text-(--text-secondary) underline underline-offset-4 hover:text-(--text-accent)"
                      >
                        {platform}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {/* The legal entity appears here and on the company page. Never in the
            header, the hero, marketing copy, or a page title. */}
        <div className="flex flex-col gap-3 border-t border-(--border-subtle) py-8 text-(length:--text-xs) text-(--text-muted) sm:flex-row sm:items-center sm:justify-between">
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
          <p>{SITE.domain}</p>
        </div>
      </Container>
    </footer>
  )
}

const FooterHeading = ({
  className,
  children,
}: {
  className?: string
  children: string
}) => (
  <h2
    className={cn(
      'text-(length:--text-xs) font-semibold uppercase tracking-[0.2em] text-(--text-muted)',
      className,
    )}
  >
    {children}
  </h2>
)

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
    <FooterHeading>{heading}</FooterHeading>
    <ul className="mt-6 space-y-3">
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
