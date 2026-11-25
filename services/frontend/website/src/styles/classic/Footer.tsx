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

export const Footer = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()
  const social = activeSocial()

  return (
    // Its own band in both themes (Harry, 2026-11-06: the footer blended into
    // the last section): always dark, like a site's header usually is, scoped
    // with data-theme so every token inside takes its dark value and keeps
    // its contrast, under a line of the accent colour. In the dark theme it
    // sits a shade below the page, and the accent line still separates it
    // from a sunken last section.
    <footer
      data-theme="dark"
      className="mt-auto border-t-2 border-(--fill-accent) bg-(--surface-sunken) text-(--text-secondary)"
    >
      <Container>
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="font-(family-name:--font-display) text-(length:--text-xl) font-semibold text-(--text-primary)">
              {SITE.name}
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

          <div>
            <h2 className="text-(length:--text-sm) font-semibold uppercase tracking-wide text-(--text-muted)">
              {t('footer.contactHeading')}
            </h2>
            <ul className="mt-4 space-y-2 text-(length:--text-sm) text-(--text-secondary)">
              <li>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="hover:text-(--text-accent)"
                >
                  {CONTACT.email}
                </a>
              </li>
              <li>
                {/* tel: needs the E.164 form; the visible text is the readable one. */}
                <a
                  href={`tel:${CONTACT.phoneE164}`}
                  className="hover:text-(--text-accent)"
                >
                  {CONTACT.phone}
                </a>
              </li>
              <li className="pt-1">
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
          </div>
        </div>

        {/* The legal entity appears here and on the company page, not in the
            header, the hero, marketing copy, or a page title. */}
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
    <h2 className="text-(length:--text-sm) font-semibold uppercase tracking-wide text-(--text-muted)">
      {heading}
    </h2>
    <ul className="mt-4 space-y-2">
      {links.map((link) => (
        <li key={link.to}>
          <Link
            to={link.to}
            className="text-(length:--text-sm) text-(--text-secondary) hover:text-(--text-accent)"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
)
