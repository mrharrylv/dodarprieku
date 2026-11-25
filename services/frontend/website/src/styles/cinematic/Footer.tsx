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
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Glow } from './Decor'
import { MapLink } from '@/components/contact/MapLink'

/**
 * The end title card.
 *
 * It opens with the brand set large and one last call to action, then the
 * columns, then a hairline bottom bar. That order is deliberate: on a phone the
 * columns are a long scroll, and a visitor who has read the whole page should
 * meet the button before the small print rather than after it.
 *
 * No `--text-muted` anywhere, here or on any page in this style. On a dark
 * ground muted grey is the first thing to become unreadable, and everything in
 * this footer is something a customer may need to read.
 */
export const Footer = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()
  const social = activeSocial()

  return (
    <footer className="mt-auto border-t border-(--border-subtle) bg-(--surface-sunken)">
      <Container>
        <div className="grid gap-10 border-b border-(--border-subtle) py-16 sm:py-20 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="font-(family-name:--font-display) text-(length:--text-4xl) font-semibold uppercase tracking-[0.12em] text-(--text-primary)">
              {SITE.name}
            </p>
            <p className="mt-5 max-w-md text-(length:--text-lg) text-(--text-secondary)">
              {t('footer.tagline')}
            </p>
          </div>

          <div className="lg:justify-self-end">
            <Glow>
              <ButtonLink
                to={localePath(ROUTES.contact, locale)}
                size="lg"
                className="uppercase tracking-[0.16em]"
              >
                {t('cta.contactUs')}
              </ButtonLink>
            </Glow>
          </div>
        </div>

        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
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
            <h2 className="text-(length:--text-xs) font-semibold uppercase tracking-[0.3em] text-(--text-accent)">
              {t('footer.contactHeading')}
            </h2>
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
              <li>
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

          {social.length > 0 && (
            <div>
              <h2 className="text-(length:--text-xs) font-semibold uppercase tracking-[0.3em] text-(--text-accent)">
                {t('footer.followUs')}
              </h2>
              <ul className="mt-6 space-y-3 text-(length:--text-sm)">
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
            </div>
          )}
        </div>

        {/* The legal entity appears here and on the company page, not in the
            header, the hero, marketing copy, or a page title. */}
        <div className="flex flex-col gap-3 border-t border-(--border-subtle) py-8 text-(length:--text-xs) uppercase tracking-[0.14em] text-(--text-secondary) sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <CopyrightYear />{' '}
            <Link
              to={localePath(ROUTES.company, locale)}
              className="underline underline-offset-4 hover:text-(--text-accent)"
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
    <h2 className="text-(length:--text-xs) font-semibold uppercase tracking-[0.3em] text-(--text-accent)">
      {heading}
    </h2>
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
