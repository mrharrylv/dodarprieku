import { useState } from 'react'
import { IconDownload } from '../components/Icon'
import { Loaded } from '../components/Loaded'
import { Button, EmptyState, PageHeader, inputClass } from '../components/ui'
import { useApi } from '../context/api'
import { useToast } from '../context/toast'
import { useResource } from '../hooks/useResource'
import { fmt, lv } from '../i18n/lv'
import { datedFilename, downloadCsv, subscribersCsv } from '../lib/csv'
import { newestFirst } from '../lib/dashboard'
import { formatDate } from '../lib/format'
import { nameLookup } from '../lib/names'
import { SUBSCRIBER_HEADER, filterSubscribers } from '../lib/subscribers'


export const SubscribersPage = () => {
  const api = useApi()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const { resource, reload } = useResource(() => Promise.all([api.subscribers(), api.charities()]), 'subscribers')

  return (
    <>
      <PageHeader title={lv.subscribers.title} intro={lv.subscribers.intro} />
      <Loaded resource={resource} onRetry={reload} rows={6}>
        {([subscribers, charities]) => {
          const names = nameLookup(charities)
          const shown = newestFirst(filterSubscribers(subscribers, search), (s) => s.createdAt)
          const exportCsv = () => {
            downloadCsv(datedFilename(lv.subscribers.fileStem, new Date()), subscribersCsv(shown, names.name, SUBSCRIBER_HEADER))
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
              {shown.length === 0 ? (
                <EmptyState text={lv.subscribers.empty} />
              ) : (
                <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
                  <table className="w-full min-w-[40rem] text-sm">
                    <thead className="bg-[var(--surface-sunken)] text-left text-[var(--text-secondary)]">
                      <tr>{SUBSCRIBER_HEADER.map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {shown.map((s) => (
                        <tr key={s.email} className="border-t border-[var(--border-subtle)]">
                          <td className="break-all px-3 py-2">{s.email}</td>
                          <td className="px-3 py-2">{s.name ?? ''}</td>
                          <td className="px-3 py-2">{s.charityIds.length === 0 ? lv.subscribers.general : s.charityIds.map(names.name).join(', ')}</td>
                          <td className="whitespace-nowrap px-3 py-2">{formatDate(s.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )
        }}
      </Loaded>
    </>
  )
}
