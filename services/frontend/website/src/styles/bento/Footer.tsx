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
import { Icon } from '@/components/ui/Icon'
import { Tile, TileGrid } from './Tile'
import { MapLink } from '@/components/contact/MapLink'

/**
 * The footer is four tiles and a thin line under them: the same grid as the
 * page, so the page does not change language at the bottom.
 */
export const Footer = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()
  const social = activeSocial()

  return (
    <footer className="mt-auto">
      <Container className="pb-6 pt-10 sm:pt-14">
        <TileGrid>
          <Tile className="sm:col-span-6 lg:col-span-7">
            <p className="font-(family-name:--font-display) text-(length:--text-xl) font-semibold tracking-tight text-(--text-primary)">
              {SITE.name}
            </p>
            <p className="mt-3 max-w-sm text-(--text-secondary)">
              {t('footer.tagline')}
            </p>

            {social.length > 0 && (
              <>
                <p className="mt-6 text-(length:--text-xs) font-semibold uppercase tracking-[0.16em] text-(--text-muted)">
                  {t('footer.followUs')}
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {social.map(([platform, url]) => (
                    <li key={platform}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center rounded-(--radius-md) border border-(--border-subtle) px-3 text-(length:--text-sm) text-(--text-secondary) transition-colors hover:border-(--border-strong) hover:text-(--text-primary)"
                      >
                        {platform}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Tile>

          <Tile className="sm:col-span-6 lg:col-span-5">
            <h2 className="text-(length:--text-xs) font-semibold uppercase tracking-[0.16em] text-(--text-muted)">
              {t('footer.contactHeading')}
            </h2>
            <ul className="mt-3 space-y-1 text-(--text-secondary)">
              <li>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="inline-flex min-h-11 items-center gap-2.5 break-words hover:text-(--text-accent)"
                >
                  <Icon name="mail" className="h-4 w-4 shrink-0" />
                  {CONTACT.email}
                </a>
              </li>
              <li>
                {/* tel: needs the E.164 form; the visible text is the readable one. */}
                <a
                  href={`tel:${CONTACT.phoneE164}`}
                  className="inline-flex min-h-11 items-center gap-2.5 hover:text-(--text-accent)"
                >
                  <Icon name="phone" className="h-4 w-4 shrink-0" />
                  {CONTACT.phone}
                </a>
              </li>
              <li className="flex gap-2.5 pt-1">
                <Icon name="pin" className="mt-1 h-4 w-4 shrink-0" />
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
          </Tile>

          <FooterNav
            className="sm:col-span-3 lg:col-span-5"
            heading={t('footer.navHeading')}
            label={t('a11y.footerNavigation')}
            links={NAV_LINKS.map((link) => ({
              to: localePath(link.to, locale),
              label: t(link.labelKey),
            }))}
          />

          <FooterNav
            className="sm:col-span-3 lg:col-span-7"
            heading={t('footer.legalHeading')}
            links={LEGAL_LINKS.map((link) => ({
              to: localePath(link.to, locale),
              label: t(link.labelKey),
            }))}
          />
        </TileGrid>

        {/* The legal entity appears here and on the company page, not in the
            header, the hero, marketing copy, or a page title. */}
        <div className="mt-6 flex flex-col gap-3 border-t border-(--border-subtle) pt-6 text-(length:--text-xs) text-(--text-muted) sm:flex-row sm:items-center sm:justify-between">
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
  className,
  heading,
  label,
  links,
}: {
  /** Required: both call sites give the tile a width, and the project's
      exactOptionalPropertyTypes makes an optional one a different type. */
  className: string
  heading: string
  label?: string
  links: ReadonlyArray<{ to: string; label: string }>
}) => (
  <Tile className={className}>
    <h2 className="text-(length:--text-xs) font-semibold uppercase tracking-[0.16em] text-(--text-muted)">
      {heading}
    </h2>
    {/* Only the site list is labelled. Two navigation landmarks with the same
        name is worse than one unnamed one: a screen reader lists both and
        neither says which is which. */}
    <nav
      {...(label !== undefined ? { 'aria-label': label } : {})}
      className="mt-2"
    >
      <ul className="flex flex-wrap gap-x-5">
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
  </Tile>
)
