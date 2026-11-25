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
import { MapLink } from '@/components/contact/MapLink'

/**
 * The foot of the RIGHT half.
 *
 * It sits in column two, under the content, so the left half runs past it to
 * the bottom of the page. That is the point of the split: the brand and the
 * one call to action are still on screen while the visitor reads the small
 * print.
 */
export const Footer = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()
  const social = activeSocial()

  return (
    <footer className="border-t border-(--border-strong) bg-(--surface-page) lg:col-start-2 lg:row-start-2">
      <div className="px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2">
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

          <div className="sm:col-span-2">
            <h2 className="border-b border-(--border-subtle) pb-3 text-(length:--text-xs) font-semibold uppercase tracking-[0.18em] text-(--text-muted)">
              {t('footer.contactHeading')}
            </h2>
            <ul className="mt-4 grid gap-1 text-(length:--text-sm) text-(--text-secondary) sm:grid-cols-2">
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
              <li className="sm:col-span-2">
                <MapLink>
                  <address className="not-italic">
                    {CONTACT.address.street}, {CONTACT.address.postalCode}{' '}
                    {CONTACT.address.city}, {CONTACT.address.country}
                  </address>
                </MapLink>
              </li>
            </ul>

            {social.length > 0 && (
              <>
                <h2 className="mt-8 border-b border-(--border-subtle) pb-3 text-(length:--text-xs) font-semibold uppercase tracking-[0.18em] text-(--text-muted)">
                  {t('footer.followUs')}
                </h2>
                <ul className="mt-2 flex flex-wrap gap-5 text-(length:--text-sm)">
                  {social.map(([platform, url]) => (
                    <li key={platform}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center text-(--text-secondary) underline underline-offset-4 transition-colors hover:text-(--text-accent)"
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

        {/* The legal entity appears here and on the company page, never in the
            header, the hero, marketing copy or a page title. */}
        <div className="mt-12 flex flex-col gap-3 border-t border-(--border-subtle) pt-6 text-(length:--text-xs) text-(--text-muted) sm:flex-row sm:items-center sm:justify-between">
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
      </div>
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
    <h2 className="border-b border-(--border-subtle) pb-3 text-(length:--text-xs) font-semibold uppercase tracking-[0.18em] text-(--text-muted)">
      {heading}
    </h2>
    <ul className="mt-2">
      {links.map((link) => (
        <li key={link.to}>
          <Link
            to={link.to}
            className="inline-flex min-h-11 items-center text-(length:--text-sm) text-(--text-secondary) transition-colors hover:text-(--text-accent)"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
)
