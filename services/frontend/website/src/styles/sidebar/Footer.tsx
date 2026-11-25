import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { COMPANY, LEGAL_LINKS, ROUTES, SITE, activeSocial } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { CopyrightYear } from '@/components/layout/CopyrightYear'
import { DevelopedBy } from '@/components/layout/DevelopedBy'
import { Container } from '@/components/ui/Container'

/**
 * A status bar, not a sitemap.
 *
 * The navigation and the contact details already live in the rail, on every
 * route and at every scroll position, so repeating them here in four columns
 * would be furniture for its own sake. What is left is what only the footer
 * carries: the legal links, the entity, the developer credit.
 *
 * The legal entity appears here and on the company page, not in the header,
 * the hero, marketing copy or a page title.
 */
export const Footer = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()
  const social = activeSocial()

  return (
    <footer className="border-t border-(--border-subtle) bg-(--surface-raised) lg:col-start-2 lg:row-start-2">
      <Container className="flex flex-col gap-x-8 gap-y-1 py-2 text-(length:--text-xs) text-(--text-muted) lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label={t('a11y.footerNavigation')}>
          <ul className="flex flex-wrap items-center gap-x-5">
            {LEGAL_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={localePath(link.to, locale)}
                  className="inline-flex min-h-11 items-center transition-colors hover:text-(--text-primary)"
                >
                  {t(link.labelKey)}
                </Link>
              </li>
            ))}
            {social.map(([platform, url]) => (
              <li key={platform}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center transition-colors hover:text-(--text-primary)"
                >
                  {platform}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pb-3 lg:pb-0">
          <p>
            © <CopyrightYear />{' '}
            <Link
              to={localePath(ROUTES.company, locale)}
              className="underline underline-offset-4 hover:text-(--text-primary)"
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
