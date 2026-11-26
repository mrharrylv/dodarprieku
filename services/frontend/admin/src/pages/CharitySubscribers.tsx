import { IconDownload } from '../components/Icon'
import { Loaded } from '../components/Loaded'
import { SubscriberTable } from '../components/SubscriberTable'
import { Button, EmptyState } from '../components/ui'
import { useApi } from '../context/api'
import { useToast } from '../context/toast'
import { useResource } from '../hooks/useResource'
import { fmt, lv } from '../i18n/lv'
import { datedFilename, downloadCsv } from '../lib/csv'
import { newestFirst } from '../lib/dashboard'
import { charityColumns, columnsCsv } from '../lib/subscriber-columns'
import { fileSlug } from '../lib/subscribers'

/** "Abonenti" on an organisation's detail page: who signed up for its news, with a CSV of them. */
export const CharitySubscribers = ({ id, name }: { readonly id: string; readonly name: string }) => {
  const api = useApi()
  const toast = useToast()
  const { resource, reload } = useResource(() => api.charitySubscribers(id), `charity-subscribers:${id}`)

  return (
    <section aria-labelledby="org-subscribers" className="mt-10">
      <h2 id="org-subscribers" className="text-[length:var(--text-xl)] font-semibold">{lv.charitySubscribers.title}</h2>
      <p className="mb-4 mt-1 text-sm text-[var(--text-secondary)]">{lv.charitySubscribers.intro}</p>
      <Loaded resource={resource} onRetry={reload} rows={3}>
        {(rows) => {
          const shown = newestFirst(rows, (s) => s.createdAt)
          const exportCsv = () => {
            downloadCsv(datedFilename(`${lv.subscribers.fileStem}-${fileSlug(name)}`, new Date()), columnsCsv(charityColumns, shown))
            toast.show(fmt(lv.listRequests.exported, { n: shown.length }))
          }
          return shown.length === 0 ? (
            <EmptyState text={lv.charitySubscribers.empty} />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[var(--text-secondary)]" aria-live="polite">{fmt(lv.subscribers.count, { n: shown.length })}</p>
                <Button variant="secondary" onClick={exportCsv}>
                  <IconDownload />
                  {lv.subscribers.export}
                </Button>
              </div>
              <SubscriberTable columns={charityColumns} rows={shown} />
            </>
          )
        }}
      </Loaded>
    </section>
  )
}
