import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES } from '@shared/catalog'
import type { AdminCharitySummary } from '@shared/contracts'
import { IconArrowDown, IconArrowUp, IconSort } from '../components/Icon'
import { Loaded } from '../components/Loaded'
import { EmptyState, PageHeader, StatusBadge, inputClass } from '../components/ui'
import { useApi } from '../context/api'
import { useResource } from '../hooks/useResource'
import { fmt, lv } from '../i18n/lv'
import { DEFAULT_QUERY, applyQuery, toggleSort, type SortKey, type TableQuery } from '../lib/charity-table'
import { categoryLabel, formatDate, formatNumber } from '../lib/format'
import { charityPath } from '../paths'

const STATUS_OPTIONS = ['all', 'pending', 'approved', 'rejected', 'suspended', 'update'] as const
const COLUMNS: readonly SortKey[] = ['name', 'category', 'city', 'status', 'views', 'pledges', 'passwordSet', 'updatedAt']

const SortHeader = ({ col, q, onSort }: { readonly col: SortKey; readonly q: TableQuery; readonly onSort: (k: SortKey) => void }) => {
  const active = q.sort === col
  const label = lv.charities.cols[col]
  return (
    <th scope="col" aria-sort={active ? (q.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-3 py-2 text-left font-medium">
      <button
        type="button"
        onClick={() => onSort(col)}
        className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap"
        aria-label={fmt(lv.charities.sortBy, { col: label })}
      >
        {label}
        {active ? q.dir === 'asc' ? <IconArrowUp className="size-4" /> : <IconArrowDown className="size-4" /> : <IconSort className="size-4 opacity-60" />}
      </button>
    </th>
  )
}

const Row = ({ c }: { readonly c: AdminCharitySummary }) => (
  <tr className="border-t border-[var(--border-subtle)] hover:bg-[var(--surface-sunken)]">
    <td className="px-3 py-2">
      <Link to={charityPath(c.id)} className="inline-flex min-h-11 items-center font-semibold text-[var(--text-accent)] underline">
        {c.name}
      </Link>
    </td>
    <td className="px-3 py-2">{categoryLabel(c.category)}</td>
    <td className="px-3 py-2">{c.city}</td>
    <td className="px-3 py-2">
      <span className="flex flex-wrap gap-1">
        <StatusBadge status={c.status} />
        {c.hasPendingUpdate && <StatusBadge status="update" />}
      </span>
    </td>
    <td className="px-3 py-2 text-right tabular-nums">{formatNumber(c.views)}</td>
    <td className="px-3 py-2 text-right tabular-nums">{formatNumber(c.pledges)}</td>
    <td className="px-3 py-2">{c.passwordSet ? lv.charities.passwordYes : lv.charities.passwordNo}</td>
    <td className="px-3 py-2 whitespace-nowrap">{formatDate(c.updatedAt)}</td>
  </tr>
)

export const CharitiesPage = () => {
  const api = useApi()
  const { resource, reload } = useResource(() => api.charities(), 'charities')
  const [q, setQ] = useState<TableQuery>(DEFAULT_QUERY)

  return (
    <>
      <PageHeader title={lv.charities.title} />
      <div className="mb-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <label htmlFor="org-search" className="block text-sm font-medium">{lv.charities.search}</label>
          <input
            id="org-search"
            type="search"
            value={q.search}
            placeholder={lv.charities.searchPlaceholder}
            onChange={(e) => setQ({ ...q, search: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="org-status" className="block text-sm font-medium">{lv.charities.status}</label>
          <select id="org-status" value={q.status} onChange={(e) => setQ({ ...q, status: e.target.value as TableQuery['status'] })} className={inputClass}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === 'all' ? lv.charities.all : lv.status[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="org-category" className="block text-sm font-medium">{lv.charities.category}</label>
          <select id="org-category" value={q.category} onChange={(e) => setQ({ ...q, category: e.target.value as TableQuery['category'] })} className={inputClass}>
            <option value="all">{lv.charities.all}</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.plural}</option>
            ))}
          </select>
        </div>
      </div>
      <Loaded resource={resource} onRetry={reload} rows={8}>
        {(rows) => {
          const shown = applyQuery(rows, q)
          return (
            <>
              <p className="mb-2 text-sm text-[var(--text-secondary)]" aria-live="polite">
                {fmt(lv.charities.count, { shown: shown.length, total: rows.length })}
              </p>
              {shown.length === 0 ? (
                <EmptyState text={lv.charities.empty} />
              ) : (
                <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
                  <table className="w-full min-w-[56rem] border-collapse text-sm">
                    <thead className="bg-[var(--surface-sunken)] text-[var(--text-secondary)]">
                      <tr>
                        {COLUMNS.map((col) => (
                          <SortHeader key={col} col={col} q={q} onSort={(k) => setQ(toggleSort(q, k))} />
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((c) => (
                        <Row key={c.id} c={c} />
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
