import { CUSTOM_NEED_ID, categoryById } from '@shared/catalog'
import { LIMITS, type Need } from '@shared/contracts'
import { Button } from '../components/ui'
import { lv } from '../i18n/lv'
import { fieldErrorMessage } from '../lib/errors'
import { useEditor } from './context'
import { Check, Fieldset, TextInput } from './inputs'

const NeedDetails = ({ index, need }: { readonly index: number; readonly need: Need }) => {
  const { set } = useEditor()
  return (
    <div className="grid gap-2 pl-7 sm:grid-cols-[1fr_auto]">
      <TextInput path={`needs.${index}.note`} label={lv.fields.note} max={LIMITS.needNote} optional />
      <div className="self-end">
        <Check checked={need.urgent} onChange={(v) => set(`needs.${index}.urgent`, v)}>{lv.fields.urgent}</Check>
      </div>
    </div>
  )
}

export const NeedsEditor = () => {
  const { profile, set, error } = useEditor()
  const needs = profile.needs
  const groups = categoryById(profile.category).needs
  const indexOf = (itemId: string): number => needs.findIndex((n) => n.itemId === itemId)
  const toggle = (itemId: string, on: boolean) =>
    set('needs', on ? [...needs, { itemId, urgent: false }] : needs.filter((n) => n.itemId !== itemId))
  const customs = needs.map((n, i) => ({ n, i })).filter(({ n }) => n.itemId === CUSTOM_NEED_ID)
  const known = new Set(groups.flatMap((g) => g.items.map((i) => i.id)))
  const orphans = needs.map((n, i) => ({ n, i })).filter(({ n }) => n.itemId !== CUSTOM_NEED_ID && !known.has(n.itemId))
  const listError = error('needs')

  return (
    <Fieldset legend={lv.sections.needs} error={listError}>
      <div className="space-y-5 sm:col-span-2">
        {groups.map((group) => (
          <div key={group.id}>
            <h3 className="mb-1 text-sm font-semibold text-[var(--text-secondary)]">{group.label}</h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const i = indexOf(item.id)
                const need = needs[i]
                return (
                  <li key={item.id}>
                    <Check checked={i >= 0} onChange={(on) => toggle(item.id, on)}>{item.label}</Check>
                    {need && <NeedDetails index={i} need={need} />}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        {orphans.map(({ n, i }) => (
          <p key={`orphan-${i}`} role="alert" className="text-sm text-[var(--text-danger)]">
            {n.itemId}: {fieldErrorMessage('invalid')}{' '}
            <Button variant="ghost" onClick={() => set(`needs.${i}`, undefined)}>{lv.editor.remove}</Button>
          </p>
        ))}
        <div>
          <h3 className="mb-1 text-sm font-semibold text-[var(--text-secondary)]">{lv.editor.customNeed}</h3>
          <ul className="space-y-3">
            {customs.map(({ n, i }) => (
              <li key={`custom-${i}`} className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <TextInput path={`needs.${i}.customLabel`} label={lv.editor.customNeed} max={LIMITS.customNeedLabel} />
                  <div className="self-end">
                    <Button variant="ghost" onClick={() => set(`needs.${i}`, undefined)}>{lv.editor.remove}</Button>
                  </div>
                </div>
                <NeedDetails index={i} need={n} />
              </li>
            ))}
          </ul>
          {needs.length < LIMITS.maxNeeds && (
            <Button className="mt-2" onClick={() => set('needs', [...needs, { itemId: CUSTOM_NEED_ID, customLabel: '', urgent: false }])}>
              {lv.editor.add}
            </Button>
          )}
        </div>
      </div>
    </Fieldset>
  )
}
