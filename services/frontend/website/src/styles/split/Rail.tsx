import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { CONTACT, ROUTES, SITE } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { NavList } from './NavList'

/**
 * The left half, on `lg` and up only.
 *
 * `sticky top-0` with `h-dvh` and its own `overflow-y-auto`, deliberately, and
 * this is the decision worth not undoing: the half is pinned to the viewport,
 * so anything taller than the viewport would be CLIPPED and unreachable. The
 * content here is short (a wordmark, a line, four links, one button, two
 * contact lines), but "short" stops being true at 200% browser zoom, in a
 * 600px-tall laptop window, or once a locale turns "Get in touch" into
 * something twice as long. `overflow-y-auto` is the escape hatch for exactly
 * those cases and costs nothing when it is not needed.
 *
 * There is no `overscroll-contain` here on purpose. An element with
 * `overflow-y: auto` whose content FITS is still a scroll container at its
 * boundary, and containing the overscroll would swallow the wheel: a visitor
 * scrolling with the pointer over the left half would find the page frozen.
 * Letting the scroll chain is the correct behaviour for a half that usually
 * has nothing to scroll.
 *
 * None of this applies below `lg`: every class here is `lg:`-prefixed and the
 * rail is `hidden`, so there is no scroll trap on a phone because there is no
 * split on a phone.
 */
export const Rail = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()

  return (
    <div className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto lg:px-10 lg:py-12 xl:px-14">
      <Link
        to={localePath(ROUTES.home, locale)}
        className="font-(family-name:--font-display) text-(length:--text-4xl) font-semibold leading-none tracking-tight text-(--text-primary) transition-colors hover:text-(--text-accent)"
      >
        {SITE.name}
      </Link>

      {/* The style's signature: a short, heavy accent rule. It is the same
          straight line as every section divider, at full strength. */}
      <span aria-hidden="true" className="mt-6 block h-1 w-16 bg-(--fill-accent)" />

      <p className="mt-6 max-w-sm text-(length:--text-lg) text-(--text-secondary)">
        {t('footer.tagline')}
      </p>

      <div className="mt-10">
        <NavList size="rail" />
      </div>

      {/* mt-auto pins the action group to the bottom of the half when there is
          room, and simply follows the navigation when there is not. */}
      <div className="mt-auto pt-12">
        <ButtonLink
          to={localePath(ROUTES.contact, locale)}
          size="lg"
          className="w-full"
        >
          {t('cta.contactUs')}
        </ButtonLink>

        <ul className="mt-6 space-y-1 text-(length:--text-sm)">
          <li>
            <a
              href={`mailto:${CONTACT.email}`}
              className="inline-flex min-h-11 items-center gap-2 text-(--text-secondary) transition-colors hover:text-(--text-accent)"
            >
              <Icon name="mail" className="h-4 w-4" />
              {CONTACT.email}
            </a>
          </li>
          <li>
            {/* tel: needs the E.164 form; the visible text is the readable one. */}
            <a
              href={`tel:${CONTACT.phoneE164}`}
              className="inline-flex min-h-11 items-center gap-2 text-(--text-secondary) transition-colors hover:text-(--text-accent)"
            >
              <Icon name="phone" className="h-4 w-4" />
              {CONTACT.phone}
            </a>
          </li>
        </ul>

        <div className="mt-6 flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
