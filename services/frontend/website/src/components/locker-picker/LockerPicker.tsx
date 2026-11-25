import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PARCEL_PROVIDERS } from '@shared/catalog'
import type { ParcelLockerChoice, ParcelProvider } from '@shared/contracts'

import { Select } from '@/components/profile-editor/controls'
import { CONTROL_CLASS, controlBorder } from '@/components/profile-editor/control-styles'
import { cn } from '@/lib/cn'
import { countForProvider, filterLockers, isProvider, lockerAddress, type Locker } from './locker-filter'
import { ManualLocker } from './ManualLocker'
import { useLockers } from './useLockers'

/**
 * Adds one parcel locker: pick the provider, then search its lockers by name,
 * street or town. The list is fetched only once a provider is picked, shows at
 * most `LOCKER_RESULT_CAP` rows, and falls back to typing the locker in by
 * hand when the list is missing or the provider has none in it.
 */
export const LockerPicker = ({
  chosen,
  onAdd,
}: {
  chosen: readonly ParcelLockerChoice[]
  onAdd: (choice: ParcelLockerChoice) => void
}) => {
  const { t } = useTranslation('register')
  const [provider, setProvider] = useState<ParcelProvider | ''>('')
  const [query, setQuery] = useState('')
  const [manual, setManual] = useState(false)
  const state = useLockers(provider !== '')
  const searchId = useId()

  const pick = (locker: Locker) => {
    onAdd({ provider: locker.provider, lockerId: locker.id, name: locker.name, address: lockerAddress(locker) })
    setQuery('')
  }

  const taken = (locker: Locker) => chosen.some((c) => c.provider === locker.provider && c.lockerId === locker.id)

  const body = () => {
    if (provider === '') return null
    if (manual) return <ManualLocker provider={provider} onAdd={onAdd} onBack={() => setManual(false)} canGoBack={state.kind === 'ready' && countForProvider(state.lockers, provider) > 0} />
    if (state.kind === 'idle' || state.kind === 'loading') return <p className="text-(length:--text-sm) text-(--text-muted)">{t('lockers.loading')}</p>
    if (state.kind === 'error' || countForProvider(state.lockers, provider) === 0) {
      return (
        <div className="space-y-3">
          <p className="text-(length:--text-sm) text-(--text-secondary)">
            {state.kind === 'error' ? t('lockers.loadError') : t('lockers.noList')}
          </p>
          <ManualLocker provider={provider} onAdd={onAdd} onBack={() => undefined} canGoBack={false} />
        </div>
      )
    }
    const { matches, total } = filterLockers(state.lockers, provider, query)
    return (
      <div className="space-y-3">
        <div>
          <label htmlFor={searchId} className="mb-1.5 block text-(length:--text-sm) font-medium text-(--text-primary)">{t('lockers.search')}</label>
          <input id={searchId} type="search" value={query} placeholder={t('lockers.searchPlaceholder')}
            onChange={(e) => setQuery(e.target.value)} aria-controls={`${searchId}-results`}
            className={cn(CONTROL_CLASS, controlBorder(false), 'placeholder:text-(--text-muted)')} />
        </div>
        <p className="text-(length:--text-xs) text-(--text-muted)" aria-live="polite">
          {total === 0 ? t('lockers.noMatches') : t('lockers.showing', { shown: matches.length, total })}
        </p>
        <ul id={`${searchId}-results`} className="max-h-72 space-y-1 overflow-y-auto rounded-(--radius-md) border border-(--border-subtle) p-1">
          {matches.map((locker) => (
            <li key={locker.id}>
              <button type="button" disabled={taken(locker)} onClick={() => pick(locker)}
                className="flex min-h-11 w-full flex-col items-start rounded-(--radius-sm) px-3 py-2 text-left hover:bg-(--surface-sunken) disabled:opacity-50">
                <span className="font-medium text-(--text-primary)">{locker.name}</span>
                <span className="text-(length:--text-sm) text-(--text-secondary)">
                  {lockerAddress(locker)}
                  {taken(locker) && ` (${t('lockers.alreadyAdded')})`}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setManual(true)} className="min-h-11 text-(length:--text-sm) font-medium text-(--text-accent) underline underline-offset-4">
          {t('lockers.manual')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-sunken) p-4">
      <Select label={t('lockers.provider')} value={provider}
        onChange={(e) => {
          setProvider(isProvider(e.target.value) ? e.target.value : '')
          setManual(false)
          setQuery('')
        }}>
        <option value="">{t('lockers.providerPlaceholder')}</option>
        {PARCEL_PROVIDERS.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </Select>
      {body()}
    </div>
  )
}
