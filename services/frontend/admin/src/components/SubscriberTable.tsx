import type { SubscriberRecord } from '@shared/contracts'
import type { SubscriberColumn } from '../lib/subscriber-columns'

/** A table of subscribers, its columns from `lib/subscriber-columns`, scrolling sideways when there are many. */
export const SubscriberTable = ({ columns, rows }: { readonly columns: readonly SubscriberColumn[]; readonly rows: readonly SubscriberRecord[] }) => (
  <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
    <table className="w-full min-w-[40rem] text-sm">
      <thead className="bg-[var(--surface-sunken)] text-left text-[var(--text-secondary)]">
        <tr>
          {columns.map((c) => (
            <th key={c.key} scope="col" className="px-3 py-2 font-medium">{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((s) => (
          <tr key={s.email} className="border-t border-[var(--border-subtle)]">
            {columns.map((c) => (
              <td key={c.key} className={c.key === 'email' ? 'whitespace-nowrap px-3 py-2' : 'px-3 py-2'}>{c.cell(s)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
