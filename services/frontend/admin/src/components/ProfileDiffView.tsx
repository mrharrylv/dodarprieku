/** Live vs proposed, field by field and item by item. Status is written out, never colour alone. */
import { useMemo, useState, type ReactNode } from 'react'
import type { CharityProfile } from '@shared/contracts'
import { fmt, lv } from '../i18n/lv'
import { diffProfile, type FieldDiff, type ScalarPath } from '../lib/diff'
import { ChangeBadge, rowTone, type Status } from './ChangeBadge'
import { categoryLabel, legalFormLabel, mediaUrl } from '../lib/format'
import { ItemList, LockerItem, NeedItem, SponsorItem } from './ProfileDiffItems'
import { Card } from './ui'

const showValue = (path: ScalarPath, value: FieldDiff['before']): ReactNode => {
  if (value === undefined || value === '') return <span className="text-[var(--text-muted)]">{lv.app.empty}</span>
  if (typeof value === 'boolean') return value ? lv.app.yes : lv.app.no
  if (path === 'organization.legalForm') return legalFormLabel(String(value))
  if (path === 'category') return categoryLabel(String(value))
  if (path === 'logo') return <img src={mediaUrl(String(value))} alt={lv.fields.logo} className="size-16 object-contain" />
  return <span className="whitespace-pre-line break-words">{String(value)}</span>
}

const FieldsTable = ({ fields }: { readonly fields: readonly FieldDiff[] }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[36rem] border-collapse text-sm">
      <thead>
        <tr className="text-left text-[var(--text-muted)]">
          <th scope="col" className="w-48 py-2 pr-3 font-medium">{lv.updates.field}</th>
          <th scope="col" className="py-2 pr-3 font-medium">{lv.updates.live}</th>
          <th scope="col" className="py-2 font-medium">{lv.updates.proposed}</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((f) => (
          <tr key={f.path} className={`border-t border-[var(--border-subtle)] align-top ${rowTone(f.status)}`} data-status={f.status}>
            <th scope="row" className="py-2 pl-2 pr-3 text-left font-medium text-[var(--text-primary)]">
              <span className="block">{lv.fields[f.path]}</span>
              <ChangeBadge status={f.status} />
            </th>
            <td className={`py-2 pr-3 ${f.status === 'changed' || f.status === 'removed' ? 'line-through decoration-[var(--text-danger)]' : ''}`}>
              {showValue(f.path, f.before)}
            </td>
            <td className="py-2 pr-2">{showValue(f.path, f.after)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export const ProfileDiffView = ({ live, proposed }: { readonly live: CharityProfile; readonly proposed: CharityProfile }) => {
  const diff = useMemo(() => diffProfile(live, proposed), [live, proposed])
  const [onlyChanged, setOnlyChanged] = useState(true)
  const keep = <T extends { status: Status }>(rows: readonly T[]): readonly T[] =>
    onlyChanged ? rows.filter((r) => r.status !== 'unchanged') : rows

  if (diff.changeCount === 0) return <p className="text-[var(--text-secondary)]">{lv.updates.noChanges}</p>

  const fields = keep(diff.fields)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">{fmt(lv.updates.changes, { n: diff.changeCount })}</p>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} className="size-5 accent-[var(--fill-accent)]" />
          {lv.updates.onlyChanged}
        </label>
      </div>
      {fields.length > 0 && (
        <Card>
          <FieldsTable fields={fields} />
        </Card>
      )}
      <ItemList title={lv.fields.needs} items={keep(diff.needs)} render={(n) => <NeedItem category={proposed.category} need={n} />} />
      <ItemList
        title={lv.fields.photos}
        items={keep(diff.photos)}
        render={(key) => <img src={mediaUrl(key)} alt="" className="h-20 w-28 rounded-[var(--radius-sm)] object-cover" />}
        extra={(item) => (item.after !== undefined && proposed.photos[0] === item.after ? lv.updates.cover : undefined)}
      />
      <ItemList title={lv.fields.sponsors} items={keep(diff.sponsors)} render={(s) => <SponsorItem sponsor={s} />} />
      <ItemList title={lv.fields.parcelLockers} items={keep(diff.parcelLockers)} render={(l) => <LockerItem locker={l} />} />
    </div>
  )
}
