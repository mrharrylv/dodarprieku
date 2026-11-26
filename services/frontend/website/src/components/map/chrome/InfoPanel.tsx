import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'
import { AboutTab, HelpTab, UsTab } from './InfoTabs'

const TABS = ['about', 'help', 'us'] as const
type Tab = (typeof TABS)[number]

const NEXT: Readonly<Record<string, (index: number) => number>> = {
  ArrowRight: (i) => (i + 1) % TABS.length,
  ArrowLeft: (i) => (i - 1 + TABS.length) % TABS.length,
  Home: () => 0,
  End: () => TABS.length - 1,
}

/**
 * The info panel: three tabs, "Par projektu", "Kā palīdzēt" and "Par mums".
 * A real ARIA tablist: one tab in the Tab order at a time, the arrow keys,
 * Home and End move between them and select as they go, and each panel is
 * labelled by its tab.
 */
export const InfoContent = () => {
  const { t } = useTranslation('map')
  const base = useId()
  const [tab, setTab] = useState<Tab>('about')
  const refs = useRef(new Map<Tab, HTMLButtonElement>())

  const tabId = (id: Tab) => `${base}-tab-${id}`
  const panelId = (id: Tab) => `${base}-panel-${id}`

  const onKeyDown = (event: KeyboardEvent) => {
    const move = NEXT[event.key]
    if (move === undefined) return
    event.preventDefault()
    const next = TABS[move(TABS.indexOf(tab))] ?? 'about'
    setTab(next)
    refs.current.get(next)?.focus()
  }

  return (
    <div>
      <div role="tablist" aria-label={t('info.tabsLabel')} onKeyDown={onKeyDown} className="sticky top-0 z-10 -mx-1 mb-4 flex gap-1 rounded-full bg-(--surface-sunken) p-1 shadow-[0_-0.5rem_0_0.25rem_var(--surface-raised)]">
        {TABS.map((id) => {
          const selected = id === tab
          return (
            <button
              key={id}
              ref={(element) => {
                if (element === null) refs.current.delete(id)
                else refs.current.set(id, element)
              }}
              id={tabId(id)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId(id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(id)}
              className={cn(
                'min-h-11 flex-1 rounded-full px-3 text-(length:--text-sm) font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)',
                selected ? 'bg-(--surface-raised) text-(--text-primary) shadow-(--shadow-subtle)' : 'text-(--text-secondary) hover:text-(--text-primary)',
              )}
            >
              {t(`info.tabs.${id}`)}
            </button>
          )
        })}
      </div>
      {TABS.map((id) => (
        <div key={id} id={panelId(id)} role="tabpanel" aria-labelledby={tabId(id)} tabIndex={0} hidden={id !== tab} className="dp-tab focus:outline-none">
          {id === tab && (id === 'about' ? <AboutTab /> : id === 'help' ? <HelpTab /> : <UsTab />)}
        </div>
      ))}
    </div>
  )
}
