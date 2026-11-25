import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { ROUTES, SITE } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { useMobileMenu } from '@/hooks/useMobileMenu'
import { localePath } from '@/lib/locale-path'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Icon } from '@/components/ui/Icon'
import { MobileMenu } from './MobileMenu'
import { Rail } from './Rail'

/**
 * The left half on `lg`, an ordinary top bar below it.
 *
 * The phone menu stays mounted and animates open and closed (`MobileMenu`).
 *
 * One `<header>` element, two layouts. It is the banner landmark either way,
 * which is why the rail lives inside it rather than in the page: a site where
 * the navigation belongs to the home page has no navigation on the other
 * three.
 *
 * `lg:static` matters. On a phone the bar is `sticky` against the top of the
 * viewport; on a large screen the header is the whole left column and it is
 * the rail INSIDE it that sticks. A sticky box inside a sticky box resolves
 * against the wrong scrollport and the rail stops following the page.
 */
export const Header = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()

  const { open: menuOpen, toggle: toggleMenu, close: closeMenu, toggleRef } = useMobileMenu()

  return (
    <header className="sticky top-0 z-50 border-b border-(--border-strong) bg-(--surface-sunken) lg:static lg:col-start-1 lg:row-span-2 lg:border-b-0 lg:border-r">
      <div className="flex h-16 items-center justify-between gap-3 px-5 sm:px-8 lg:hidden">
        <Link
          to={localePath(ROUTES.home, locale)}
          className="font-(family-name:--font-display) text-(length:--text-xl) font-semibold tracking-tight text-(--text-primary)"
        >
          {SITE.name}
        </Link>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            ref={toggleRef}
            type="button"
            onClick={toggleMenu}
            aria-expanded={menuOpen}
            aria-controls="split-menu"
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-(--radius-md) text-(--text-primary) transition-colors hover:bg-(--surface-page)"
          >
            <Icon name={menuOpen ? 'close' : 'menu'} className="h-6 w-6" />
          </button>
        </div>
      </div>

      <MobileMenu id="split-menu" open={menuOpen} locale={locale} onNavigate={closeMenu} />

      <Rail />
    </header>
  )
}
