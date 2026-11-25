import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loaded } from '../components/Loaded'
import { EmptyState, PageHeader, inputClass } from '../components/ui'
import { useApi } from '../context/api'
import { useResource } from '../hooks/useResource'
import { fmt, lv } from '../i18n/lv'
import { newestFirst } from '../lib/dashboard'
import { formatDateTime } from '../lib/format'
import { nameLookup } from '../lib/names'

const H = lv.pledges.cols

export const PledgesPage = () => {
  const api = useApi()
  const [params, setParams] = useSearchParams()
  const [charityId, setCharityId] = useState(params.get('organizacija') ?? '')
  const charities = useResource(() => api.charities(), 'pledge-charities')
  const pledges = useResource(() => api.pledges(charityId || undefined), `pledges:${charityId}`)
  const choose = (id: string) => {
    setCharityId(id)
    setParams(id ? { organizacija: id } : {}, { replace: true })
  }
  const list = charities.resource.state === 'ready' ? charities.resource.data : []
  const names = nameLookup(list)

  return (
    <>
      <PageHeader title={lv.pledges.title} intro={lv.pledges.intro} />
      <div className="mb-4 max-w-md">
        <label htmlFor="pledge-charity" className="block text-sm font-medium">{lv.pledges.filter}</label>
        <select id="pledge-charity" value={charityId} onChange={(e) => choose(e.target.value)} className={inputClass}>
          <option value="">{lv.pledges.all}</option>
          {list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <Loaded resource={pledges.resource} onRetry={pledges.reload} rows={6}>
        {(rows) => {
          const shown = newestFirst(rows, (p) => p.createdAt)
          if (shown.length === 0) return <EmptyState text={lv.pledges.empty} />
          return (
            <>
              <p className="mb-2 text-sm text-[var(--text-secondary)]">{fmt(lv.pledges.count, { n: shown.length })}</p>
              <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
                <table className="w-full min-w-[52rem] text-sm">
                  <thead className="bg-[var(--surface-sunken)] text-left text-[var(--text-secondary)]">
                    <tr>
                      {[H.createdAt, H.charity, H.needs, H.name, H.email, H.message].map((h) => (
                        <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((p) => (
                      <tr key={p.id} className="border-t border-[var(--border-subtle)] align-top">
                        <td className="whitespace-nowrap px-3 py-2">{formatDateTime(p.createdAt)}</td>
                        <td className="px-3 py-2">{names.name(p.charityId)}</td>
                        <td className="px-3 py-2">{p.needs.map((k) => names.need(p.charityId, k)).join(', ')}</td>
                        <td className="px-3 py-2">{p.anonymous ? <span className="text-[var(--text-muted)]">{lv.pledges.anonymous}</span> : p.name}</td>
                        <td className="break-all px-3 py-2">{p.email ?? ''}</td>
                        <td className="px-3 py-2 whitespace-pre-line">{p.message ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        }}
      </Loaded>
    </>
  )
}
