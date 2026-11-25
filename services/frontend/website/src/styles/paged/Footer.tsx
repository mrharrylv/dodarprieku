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
import { localePath } from '@/lib/locale-path'
import { CopyrightYear } from '@/components/layout/CopyrightYear'
import { DevelopedBy } from '@/components/layout/DevelopedBy'
import { Container } from '@/components/ui/Container'
import { MapLink } from '@/components/contact/MapLink'

/**
 * A coda, not a sitemap.
 *
 * The deck ends on its call to action, so the footer's job is only to be the
 * place the legal links and the address live. Everything is centred and set in
 * one column, which is also why it does not need to become a grid on a phone.
 */
export const Footer = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()
  const social = activeSocial()

  return (
    <footer className="border-t border-(--border-subtle) bg-(--surface-page)">
      <Container className="py-16 text-center">
        <p className="break-words font-(family-name:--font-display) text-(length:--text-sm) font-semibold uppercase tracking-[0.28em] text-(--text-primary)">
          {SITE.name}
        </p>
        <p className="mx-auto mt-4 max-w-(--container-prose) text-(length:--text-sm) text-(--text-secondary)">
          {t('footer.tagline')}
        </p>

        <nav aria-label={t('a11y.footerNavigation')} className="mt-10">
          <FooterLinks
            links={NAV_LINKS.map((link) => ({
              to: localePath(link.to, locale),
              label: t(link.labelKey),
            }))}
          />
        </nav>

        {/* A navigation landmark of its own, named: it is a second row of
            links that looks exactly like the one above it, and an unnamed row
            beside a named one is announced as ordinary text. */}
        <nav aria-label={t('footer.legalHeading')} className="mt-2">
          <FooterLinks
            links={LEGAL_LINKS.map((link) => ({
              to: localePath(link.to, locale),
              label: t(link.labelKey),
            }))}
          />
        </nav>

        <ul className="mt-10 flex flex-wrap justify-center gap-x-8 text-(length:--text-sm) text-(--text-secondary)">
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
        </ul>

        <MapLink>
          <address className="mt-2 text-(length:--text-sm) not-italic text-(--text-muted)">
            {CONTACT.address.street}, {CONTACT.address.postalCode} {CONTACT.address.city},{' '}
            {CONTACT.address.country}
          </address>
        </MapLink>

        {social.length > 0 && (
          <ul className="mt-6 flex flex-wrap justify-center gap-x-6 text-(length:--text-sm)">
            {social.map(([platform, url]) => (
              <li key={platform}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center text-(--text-secondary) underline underline-offset-4 hover:text-(--text-accent)"
                >
                  {platform}
                </a>
              </li>
            ))}
          </ul>
        )}

        {/* The legal entity appears here and on the company page, not in the
            header, the hero, marketing copy, or a page title. */}
        <div className="mt-12 flex flex-col items-center gap-3 border-t border-(--border-subtle) pt-8 text-(length:--text-xs) text-(--text-muted) sm:flex-row sm:justify-between">
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

const FooterLinks = ({
  links,
}: {
  links: ReadonlyArray<{ to: string; label: string }>
}) => (
  <ul className="flex flex-wrap justify-center gap-x-1">
    {links.map((link) => (
      <li key={link.to}>
        <Link
          to={link.to}
          className="inline-flex min-h-11 items-center px-3 text-(length:--text-xs) font-medium uppercase tracking-[0.18em] text-(--text-secondary) transition-colors hover:text-(--text-accent)"
        >
          {link.label}
        </Link>
      </li>
    ))}
  </ul>
)
