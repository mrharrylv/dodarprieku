/** Inputs bound to a dotted profile path through the editor context. */
import type { ReactNode } from 'react'
import { Field, inputClass } from '../components/ui'
import { getPath } from '../lib/diff'
import { useEditor } from './context'

interface TextProps {
  readonly path: string
  readonly label: string
  readonly max?: number
  readonly type?: 'text' | 'email' | 'tel' | 'url'
  readonly multiline?: boolean
  /** Empty input removes the key (an optional field), rather than storing "". */
  readonly optional?: boolean
}

export const TextInput = ({ path, label, max, type = 'text', multiline = false, optional = false }: TextProps) => {
  const { profile, set, error } = useEditor()
  const raw = getPath(profile, path)
  const value = typeof raw === 'string' ? raw : ''
  const change = (next: string) => set(path, optional && next === '' ? undefined : next)
  return (
    <Field label={label} error={error(path)}>
      {(p) =>
        multiline ? (
          <textarea {...p} rows={6} maxLength={max} value={value} onChange={(e) => change(e.target.value)} className={inputClass} />
        ) : (
          <input {...p} type={type} maxLength={max} value={value} onChange={(e) => change(e.target.value)} className={inputClass} />
        )
      }
    </Field>
  )
}

export const NumberInput = ({ path, label }: { readonly path: string; readonly label: string }) => {
  const { profile, set, error } = useEditor()
  const raw = getPath(profile, path)
  return (
    <Field label={label} error={error(path)}>
      {(p) => (
        <input
          {...p}
          type="number"
          step="0.000001"
          value={typeof raw === 'number' && Number.isFinite(raw) ? raw : ''}
          onChange={(e) => set(path, e.target.value === '' ? Number.NaN : Number(e.target.value))}
          className={inputClass}
        />
      )}
    </Field>
  )
}

export const SelectInput = ({
  path,
  label,
  options,
}: {
  readonly path: string
  readonly label: string
  readonly options: readonly { readonly id: string; readonly label: string }[]
}) => {
  const { profile, set, error } = useEditor()
  const raw = getPath(profile, path)
  return (
    <Field label={label} error={error(path)}>
      {(p) => (
        <select {...p} value={typeof raw === 'string' ? raw : ''} onChange={(e) => set(path, e.target.value)} className={inputClass}>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      )}
    </Field>
  )
}

export const Check = ({ checked, onChange, children }: { readonly checked: boolean; readonly onChange: (v: boolean) => void; readonly children: ReactNode }) => (
  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-[var(--fill-accent)]" />
    <span>{children}</span>
  </label>
)

export const Fieldset = ({ legend, note, error, children }: { readonly legend: string; readonly note?: string; readonly error?: string | undefined; readonly children: ReactNode }) => (
  <fieldset className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5">
    <legend className="px-1 font-[family-name:var(--font-display)] text-[length:var(--text-lg)] font-semibold">{legend}</legend>
    {note && <p className="mb-3 text-sm text-[var(--text-muted)]">{note}</p>}
    {error && <p role="alert" className="mb-3 text-sm font-medium text-[var(--text-danger)]">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  </fieldset>
)
