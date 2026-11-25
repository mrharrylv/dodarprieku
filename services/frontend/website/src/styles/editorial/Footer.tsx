import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import {
  CONTACT,
  COMPANY,
  LEGAL_LINKS,
  NAV_LINKS,
  ROUTES,
  SITE,
  activeSocial,
} from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { CopyrightYear } from '@/components/layout/CopyrightYear'
import { DevelopedBy } from '@/components/layout/DevelopedBy'
import { Container } from '@/components/ui/Container'
import { MapLink } from '@/components/contact/MapLink'

/**
 * A colophon rather than a sitemap: the nameplate again, then the addresses,
 * then the two link columns, all under one heavy rule. No background band,
 * because nothing on this page has one.
 */
export const Footer = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()
  const social = activeSocial()

  return (
    <footer className="mt-auto border-t-2 border-(--border-strong)">
      <Container>
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
          <div>
            <p className="font-(family-name:--font-display) text-(length:--text-2xl) font-semibold tracking-[-0.03em] text-(--text-primary)">
              {SITE.name}
            </p>
            <p className="mt-3 max-w-[38ch] font-(family-name:--font-display) text-(length:--text-base) italic text-(--text-secondary)">
              {t('footer.tagline')}
            </p>

            <ul className="mt-6 text-(length:--text-sm) text-(--text-secondary)">
              <li>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="inline-flex min-h-11 items-center transition-colors hover:text-(--text-accent)"
                >
                  {CONTACT.email}
                </a>
              </li>
              <li>
                {/* tel: needs the E.164 form; the visible text is the readable one. */}
                <a
                  href={`tel:${CONTACT.phoneE164}`}
                  className="inline-flex min-h-11 items-center transition-colors hover:text-(--text-accent)"
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
                <h2 className="mt-8 text-(length:--text-xs) uppercase tracking-[0.24em] text-(--text-muted)">
                  {t('footer.followUs')}
                </h2>
                <ul className="flex flex-wrap gap-x-6">
                  {social.map(([platform, url]) => (
                    <li key={platform}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center text-(length:--text-sm) text-(--text-secondary) underline underline-offset-4 transition-colors hover:text-(--text-accent)"
                      >
                        {platform}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
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
        </div>

        {/* The legal entity appears here and on the company page, not in the
            header, the hero, marketing copy or a page title. */}
        <div className="flex flex-col gap-2 border-t border-(--border-subtle) py-6 text-(length:--text-xs) uppercase tracking-[0.12em] text-(--text-muted) sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <CopyrightYear />{' '}
            <Link
              to={localePath(ROUTES.company, locale)}
              className="underline underline-offset-4 transition-colors hover:text-(--text-secondary)"
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
    <h2 className="text-(length:--text-xs) uppercase tracking-[0.24em] text-(--text-muted)">
      {heading}
    </h2>
    <ul className="mt-2">
      {links.map((link) => (
        <li key={link.to} className="border-b border-(--border-subtle) last:border-b-0">
          <Link
            to={link.to}
            className="flex min-h-11 items-center font-(family-name:--font-display) text-(length:--text-base) text-(--text-secondary) transition-colors hover:text-(--text-accent)"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
)
