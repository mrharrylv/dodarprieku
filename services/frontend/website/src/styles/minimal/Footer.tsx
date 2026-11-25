import type { ReactNode } from 'react'
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
 * The footer carries the phone number and the email on every page, which is
 * the safety net for a style this sparse: whatever a visitor failed to find
 * above, the way to reach a human is at the bottom of every page.
 *
 * One hairline, at the top. Everything else is separated by space.
 */
export const Footer = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()
  const social = activeSocial()

  return (
    <footer className="mt-auto border-t border-(--border-subtle)">
      <Container>
        <div className="pt-16">
          <p className="text-(length:--text-base) font-semibold tracking-tight text-(--text-primary)">
            {SITE.name}
          </p>
          <p className="mt-3 max-w-[42ch] text-(length:--text-sm) leading-relaxed text-(--text-secondary)">
            {t('footer.tagline')}
          </p>
        </div>

        <div className="mt-14 grid gap-12 sm:grid-cols-3">
          <FooterBlock heading={t('footer.contactHeading')}>
            <ul className="space-y-1">
              <li>
                <FooterLink href={`mailto:${CONTACT.email}`}>{CONTACT.email}</FooterLink>
              </li>
              <li>
                {/* tel: needs the E.164 form; the visible text is the readable one. */}
                <FooterLink href={`tel:${CONTACT.phoneE164}`}>{CONTACT.phone}</FooterLink>
              </li>
            </ul>
            <MapLink>
              <address className="mt-4 not-italic text-(length:--text-sm) leading-relaxed text-(--text-secondary)">
                {CONTACT.address.street}
                <br />
                {CONTACT.address.postalCode} {CONTACT.address.city}
                <br />
                {CONTACT.address.country}
              </address>
            </MapLink>
          </FooterBlock>

          <FooterNavBlock
            heading={t('footer.navHeading')}
            label={t('a11y.footerNavigation')}
          >
            <ul>
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <FooterRouteLink to={localePath(link.to, locale)}>
                    {t(link.labelKey)}
                  </FooterRouteLink>
                </li>
              ))}
            </ul>
          </FooterNavBlock>

          <FooterBlock heading={t('footer.legalHeading')}>
            <ul>
              {LEGAL_LINKS.map((link) => (
                <li key={link.to}>
                  <FooterRouteLink to={localePath(link.to, locale)}>
                    {t(link.labelKey)}
                  </FooterRouteLink>
                </li>
              ))}
            </ul>
          </FooterBlock>
        </div>

        {social.length > 0 && (
          <div className="mt-12">
            <FooterHeading>{t('footer.followUs')}</FooterHeading>
            <ul className="mt-2 flex flex-wrap gap-x-6">
              {social.map(([platform, url]) => (
                <li key={platform}>
                  <FooterLink href={url} external>
                    {platform}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* The legal entity appears here and on the company page, not in the
            header, the hero, marketing copy or a page title. */}
        <div className="mt-16 flex flex-col gap-2 pb-12 text-(length:--text-xs) text-(--text-muted) sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8">
          <p>
            © <CopyrightYear />{' '}
            <Link
              to={localePath(ROUTES.company, locale)}
              className="underline decoration-1 underline-offset-4 hover:text-(--text-primary)"
            >
              {COMPANY.legalName}
            </Link>
            . {t('footer.rights')}
          </p>
          <DevelopedBy />
          <p className="sm:ml-auto">{SITE.domain}</p>
        </div>
      </Container>
    </footer>
  )
}

const FooterHeading = ({ children }: { children: ReactNode }) => (
  <h2 className="text-(length:--text-xs) uppercase tracking-[0.22em] text-(--text-muted)">
    {children}
  </h2>
)

const FooterBlock = ({ heading, children }: { heading: string; children: ReactNode }) => (
  <div>
    <FooterHeading>{heading}</FooterHeading>
    <div className="mt-3">{children}</div>
  </div>
)

// The site links are a navigation landmark and the contact block is not, so
// they are two components rather than one with a flag.
const FooterNavBlock = ({
  heading,
  label,
  children,
}: {
  heading: string
  label: string
  children: ReactNode
}) => (
  <nav aria-label={label}>
    <FooterHeading>{heading}</FooterHeading>
    <div className="mt-3">{children}</div>
  </nav>
)

const linkClass =
  'inline-flex min-h-11 items-center break-words text-(length:--text-sm) text-(--text-secondary) transition-colors hover:text-(--text-primary)'

const FooterRouteLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className={linkClass}>
    {children}
  </Link>
)

const FooterLink = ({
  href,
  external = false,
  children,
}: {
  href: string
  external?: boolean
  children: ReactNode
}) => (
  <a
    href={href}
    className={linkClass}
    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
  >
    {children}
  </a>
)
