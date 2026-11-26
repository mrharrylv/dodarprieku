import { useState, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { SubscriberScope } from '@shared/contracts'
import { IconDownload } from '../components/Icon'
import { Loaded } from '../components/Loaded'
import { SubscriberTable } from '../components/SubscriberTable'
import { Button, EmptyState, PageHeader, inputClass } from '../components/ui'
import { useApi } from '../context/api'
import { useToast } from '../context/toast'
import { useResource } from '../hooks/useResource'
import { fmt, lv } from '../i18n/lv'
import { datedFilename, downloadCsv } from '../lib/csv'
import { newestFirst } from '../lib/dashboard'
import { nameLookup } from '../lib/names'
import { allColumns, columnsCsv, generalColumns } from '../lib/subscriber-columns'
import { filterSubscribers } from '../lib/subscribers'

/** `?skats=visi` is the "Visi" tab; without it, the general newsletter's. */
const VIEW = 'skats'
const ALL = 'visi'
const SCOPES: readonly SubscriberScope[] = ['general', 'all']

const tabId = (s: SubscriberScope) => `subscribers-tab-${s}`
const PANEL_ID = 'subscribers-panel'

/**
 * A tab widget the WAI-ARIA way: only the selected tab is in the tab order, the
 * arrow keys (and Home, End) move between tabs and select them, and each tab
 * names the panel it controls.
 */
const Tabs = ({ scope, onChange }: { readonly scope: SubscriberScope; readonly onChange: (next: SubscriberScope) => void }) => {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const at = SCOPES.indexOf(scope)
    const step: Record<string, number> = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: SCOPES.length - 1 }
    const target = step[event.key]
    if (target === undefined) return
    event.preventDefault()
    const next = SCOPES[(target + SCOPES.length) % SCOPES.length]!
    onChange(next)
    document.getElementById(tabId(next))?.focus()
  }
  return (
    <div role="tablist" aria-label={lv.subscribers.tabsLabel} className="mb-4 flex gap-2 border-b border-[var(--border-subtle)]">
      {SCOPES.map((s) => (
        <button
          key={s}
          id={tabId(s)}
          type="button"
          role="tab"
          aria-selected={scope === s}
          aria-controls={PANEL_ID}
          tabIndex={scope === s ? 0 : -1}
          onClick={() => onChange(s)}
          onKeyDown={onKeyDown}
          className={`-mb-px min-h-11 border-b-2 px-4 text-sm font-semibold ${
            scope === s ? 'border-[var(--fill-accent)] text-[var(--text-accent)]' : 'border-transparent text-[var(--text-secondary)]'
          }`}
        >
          {lv.subscribers.tabs[s]}
        </button>
      ))}
    </div>
  )
}

/**
 * "Abonenti": two tabs. "Vispārējie jaunumi" lists who gets the general
 * newsletter (`?scope=general`); "Visi" lists everyone, with a column for each
 * organisation that has subscribers. Each exports what it shows as CSV.
 */
export const SubscribersPage = () => {
  const api = useApi()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const scope: SubscriberScope = params.get(VIEW) === ALL ? 'all' : 'general'
  const [search, setSearch] = useState('')
  const { resource, reload } = useResource(() => Promise.all([api.subscribers(scope), api.charities()]), `subscribers:${scope}`)

  return (
    <>
      <PageHeader title={lv.subscribers.title} intro={lv.subscribers.intro} />
      <Tabs scope={scope} onChange={(next) => setParams(next === 'all' ? { [VIEW]: ALL } : {}, { replace: true })} />
      <div role="tabpanel" id={PANEL_ID} aria-labelledby={tabId(scope)}>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">{lv.subscribers.tabIntro[scope]}</p>
        <Loaded resource={resource} onRetry={reload} rows={6}>
          {([subscribers, charities]) => {
            const names = nameLookup(charities)
            const shown = newestFirst(filterSubscribers(subscribers, search), (s) => s.createdAt)
            const columns = scope === 'all' ? allColumns(shown, names.name) : generalColumns(names.name)
            const exportCsv = () => {
              const stem = scope === 'all' ? lv.subscribers.allFileStem : lv.subscribers.generalFileStem
              downloadCsv(datedFilename(stem, new Date()), columnsCsv(columns, shown))
              toast.show(lv.subscribers.exported)
            }
            return (
              <>
                <div className="mb-4 flex flex-wrap items-end gap-3">
                  <div className="min-w-64 flex-1">
                    <label htmlFor="sub-search" className="block text-sm font-medium">{lv.subscribers.search}</label>
                    <input id="sub-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} className={inputClass} />
                  </div>
                  <Button variant="primary" onClick={exportCsv} disabled={shown.length === 0}>
                    <IconDownload />
                    {lv.subscribers.export}
                  </Button>
                </div>
                <p className="mb-2 text-sm text-[var(--text-secondary)]" aria-live="polite">{fmt(lv.subscribers.count, { n: shown.length })}</p>
                {shown.length === 0 ? <EmptyState text={lv.subscribers.empty} /> : <SubscriberTable columns={columns} rows={shown} />}
              </>
            )
          }}
        </Loaded>
      </div>
    </>
  )
}
