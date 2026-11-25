import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Brand } from './Brand'
import { NavList } from './NavList'
import { RailContact } from './RailContact'

/**
 * The rail's contents, on lg and up: brand, navigation, contact, controls.
 *
 * The navigation is the only part allowed to scroll (`flex-1 overflow-y-auto`)
 * so that the brand stays pinned at the top and the phone number and the
 * theme and language controls stay pinned at the bottom, whatever the
 * viewport height. A rail that scrolls as one block hides its own controls on
 * a laptop in a video call.
 */
export const RailPanel = () => (
  <div className="hidden h-full flex-col lg:flex">
    <div className="border-b border-(--border-subtle) px-4 py-3">
      <Brand />
    </div>

    <div className="flex-1 overflow-y-auto p-3">
      <NavList />
    </div>

    <RailContact />

    <div className="flex items-center justify-between gap-2 border-t border-(--border-subtle) px-3 py-2">
      <LanguageSwitcher />
      <ThemeToggle />
    </div>
  </div>
)
