import { useTranslation } from 'react-i18next'

import { useMobileMenu } from '@/hooks/useMobileMenu'
import { Icon } from '@/components/ui/Icon'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Brand } from './Brand'
import { MobileMenu } from './MobileMenu'
import { RailPanel } from './RailPanel'

/** One id, so `aria-controls` on the button and the panel cannot drift apart. */
const MENU_ID = 'sidebar-menu'

/**
 * The banner landmark, in two shapes.
 *
 * On lg it is the rail: a full-height column with its own surface and a border
 * down its right edge. Below lg the same element becomes an ordinary top bar
 * and the navigation moves into an overlay.
 *
 * It is `sticky top-0` at every width. At lg that pins the rail beside the
 * scrolling document; below lg it pins the bar. `h-dvh` (not `h-screen`) so
 * the rail ends at the bottom of the VISIBLE viewport on a phone in landscape,
 * where the browser's own chrome eats part of `100vh`.
 */
export const Header = () => {
  const { t } = useTranslation('common')

  const { open: menuOpen, toggle: toggleMenu, close: closeMenu, toggleRef } = useMobileMenu()

  return (
    <header className="sticky top-0 z-50 border-b border-(--border-subtle) bg-(--surface-raised) lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:h-dvh lg:self-start lg:border-b-0 lg:border-r">
      <div className="flex h-14 items-center justify-between gap-2 px-4 lg:hidden">
        <Brand />

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            ref={toggleRef}
            type="button"
            onClick={toggleMenu}
            aria-expanded={menuOpen}
            aria-controls={MENU_ID}
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-(--radius-md) text-(--text-secondary) transition-colors hover:bg-(--surface-sunken) hover:text-(--text-primary)"
          >
            <Icon name={menuOpen ? 'close' : 'menu'} className="h-6 w-6" />
          </button>
        </div>
      </div>

      <RailPanel />

      <MobileMenu id={MENU_ID} open={menuOpen} onNavigate={closeMenu} />
    </header>
  )
}
