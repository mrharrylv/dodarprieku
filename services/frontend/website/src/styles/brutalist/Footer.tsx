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
import { Container } from '@/components/ui/Container'
import { FOCUS, LABEL } from './marks'
import { MapLink } from '@/components/contact/MapLink'

// Block-level flex, and wrapping: the email address is the longest string in
// the footer and the cells are narrow at 320px.
const LINK = cn(
  'flex min-h-11 max-w-full items-center break-words text-(length:--text-sm) text-(--text-primary) hover:underline hover:decoration-2 hover:underline-offset-4',
  FOCUS,
)

/**
 * A dense block, not a spacious one. Everything a visitor might want at the
 * end of a page is here at one size, in four cells divided by their own rules.
 *
 * No top border: the last section on every page already ends in a 4px rule,
 * and adding one here would stack two.
 */
export const Footer = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()
  const social = activeSocial()

  return (
    <footer className="bg-(--surface-sunken)">
      <Container className="py-10 sm:py-14">
        <div className="grid gap-[2px] border-2 border-(--border-strong) bg-(--border-strong) sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-(--surface-page) p-5">
            <p className="break-words text-(length:--text-lg) font-bold uppercase tracking-[0.2em] text-(--text-primary)">
              {SITE.name}
            </p>
            <p className="mt-4 text-(length:--text-sm) text-(--text-secondary)">
              {t('footer.tagline')}
            </p>

            {social.length > 0 && (
              <>
                <h2 className={cn(LABEL, 'mt-6')}>{t('footer.followUs')}</h2>
                <ul className="mt-1 flex flex-wrap gap-x-4">
                  {social.map(([platform, url]) => (
                    <li key={platform}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(LINK, 'underline underline-offset-4')}
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

          <div className="bg-(--surface-page) p-5">
            <h2 className={LABEL}>{t('footer.contactHeading')}</h2>
            <ul className="mt-1 text-(length:--text-sm) text-(--text-secondary)">
              <li>
                <a href={`mailto:${CONTACT.email}`} className={LINK}>
                  {CONTACT.email}
                </a>
              </li>
              <li>
                {/* tel: needs the E.164 form; the visible text is the readable one. */}
                <a href={`tel:${CONTACT.phoneE164}`} className={LINK}>
                  {CONTACT.phone}
                </a>
              </li>
              <li className="pt-3">
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
              <li className="pt-3">
                {t('contactDetails.weekdays')}: {CONTACT.hours.weekdays}
              </li>
            </ul>
          </div>
        </div>

        {/* The legal entity appears here and on the company page, not in the
            header, the hero, marketing copy or a page title. */}
        <div className="mt-8 flex flex-col gap-3 border-t-2 border-(--border-subtle) pt-6 text-(length:--text-xs) text-(--text-secondary) sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p>
            © <CopyrightYear />{' '}
            <Link
              to={localePath(ROUTES.company, locale)}
              className={cn('underline underline-offset-4', FOCUS)}
            >
              {COMPANY.legalName}
            </Link>
            . {t('footer.rights')}
          </p>
          <DevelopedBy />
          <p className="uppercase tracking-[0.14em]">{SITE.domain}</p>
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
  <nav
    {...(label !== undefined ? { 'aria-label': label } : {})}
    className="bg-(--surface-page) p-5"
  >
    <h2 className={LABEL}>{heading}</h2>
    <ul className="mt-1">
      {links.map((link) => (
        <li key={link.to}>
          <Link to={link.to} className={LINK}>
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
)
