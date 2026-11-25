import { useState } from 'react'
import type { ListRequestRecord } from '@shared/contracts'
import { IconDownload } from '../components/Icon'
import { Loaded } from '../components/Loaded'
import { Button, EmptyState, PageHeader } from '../components/ui'
import { useApi } from '../context/api'
import { useCounts } from '../context/counts'
import { useToast } from '../context/toast'
import { useResource } from '../hooks/useResource'
import { fmt, lv } from '../i18n/lv'
import { datedFilename, downloadCsv, subscribersCsv } from '../lib/csv'
import { newestFirst } from '../lib/dashboard'
import { errorMessage } from '../lib/errors'
import { formatDateTime } from '../lib/format'
import { SUBSCRIBER_HEADER, fileSlug, subscribersOf } from '../lib/subscribers'

const H = lv.listRequests.cols

export const ListRequestsPage = () => {
  const api = useApi()
  const toast = useToast()
  const { refresh } = useCounts()
  const [showDone, setShowDone] = useState(false)
  const [busy, setBusy] = useState<string>()
  const { resource, reload, replace } = useResource(() => api.listRequests(), 'list-requests')

  const markDone = async (all: readonly ListRequestRecord[], r: ListRequestRecord) => {
    setBusy(r.id)
    try {
      const updated = await api.listRequestDone(r.charityId, r.id)
      replace(all.map((x) => (x.id === r.id ? updated : x)))
      toast.show(lv.listRequests.marked)
      refresh()
    } catch (e) {
      toast.show(errorMessage(e), 'error')
    } finally {
      setBusy(undefined)
    }
  }

  const exportFor = async (r: ListRequestRecord) => {
    try {
      const mine = subscribersOf(await api.subscribers(), r.charityId)
      if (mine.length === 0) {
        toast.show(lv.listRequests.noSubscribers, 'info')
        return
      }
      const stem = `${lv.subscribers.fileStem}-${fileSlug(r.charityName)}`
      downloadCsv(datedFilename(stem, new Date()), subscribersCsv(mine, () => r.charityName, SUBSCRIBER_HEADER))
      toast.show(fmt(lv.listRequests.exported, { n: mine.length }))
    } catch (e) {
      toast.show(errorMessage(e), 'error')
    }
  }

  return (
    <>
      <PageHeader title={lv.listRequests.title} intro={lv.listRequests.intro} />
      <label className="mb-4 inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="size-5 accent-[var(--fill-accent)]" />
        {lv.listRequests.showDone}
      </label>
      <Loaded resource={resource} onRetry={reload}>
        {(all) => {
          const shown = newestFirst(all.filter((r) => showDone || r.status === 'open'), (r) => r.createdAt)
          if (shown.length === 0) return <EmptyState text={lv.listRequests.empty} />
          return (
            <ul className="space-y-3">
              {shown.map((r) => (
                <li key={r.id} className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex-1 font-semibold">{r.charityName}</span>
                    <span className="text-sm text-[var(--text-muted)]">{formatDateTime(r.createdAt)}</span>
                    <span className="text-sm font-semibold">{r.status === 'open' ? lv.listRequests.open : lv.listRequests.done}</span>
                  </div>
                  {r.message && (
                    <p className="mt-2 whitespace-pre-line text-sm text-[var(--text-secondary)]">
                      <span className="sr-only">{H.message}: </span>
                      {r.message}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => void exportFor(r)}>
                      <IconDownload />
                      {lv.listRequests.exportCsv}
                    </Button>
                    {r.status === 'open' && (
                      <Button variant="primary" disabled={busy === r.id} onClick={() => void markDone(all, r)}>
                        {lv.listRequests.markDone}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )
        }}
      </Loaded>
    </>
  )
}
