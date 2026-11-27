import { useTranslation } from 'react-i18next'

import { categoryById, needItemIds } from '@shared/catalog'
import type { Need } from '@shared/contracts'

import { CustomNeeds } from './CustomNeeds'
import { Fieldset } from './controls'
import type { SectionProps } from './form-model'
import { NeedCard } from './NeedCard'
import { canAddNeed, indexOfItem, orphanNeeds, removeNeedAt, tickedInGroup, toggleNeed, updateItem, updateNeedAt } from './needs-selection'
import { useFieldError } from './useFieldError'

/** Step 4 / tab 4: the category's catalog as grouped tick cards, plus the charity's own items. */
export const NeedsSection = ({ form, update, errors }: SectionProps) => {
  const { t } = useTranslation('register')
  const error = useFieldError(errors)

  if (form.category === '') {
    return (
      <Fieldset legend={t('needs.legend')} error={error('needs')}>
        <p className="text-(--text-secondary)">{t('needs.chooseCategoryFirst')}</p>
      </Fieldset>
    )
  }

  const category = categoryById(form.category)
  const setNeeds = (fn: (needs: readonly Need[]) => readonly Need[]) => update((f) => ({ ...f, needs: fn(f.needs) }))
  const full = !canAddNeed(form.needs)
  const orphans = orphanNeeds(form.needs, needItemIds(form.category))

  return (
    <div className="space-y-10">
      <Fieldset legend={t('needs.legend')} hint={t('needs.hint')} error={error('needs')}>
        <p className="text-(length:--text-sm) font-medium text-(--text-accent)" aria-live="polite">
          {t('needs.tickedCount', { count: form.needs.length })}
        </p>
        {full && <p className="text-(length:--text-sm) text-(--text-secondary)">{t('needs.limit')}</p>}
        {category.needs.map((group) => {
          const ids = group.items.map((i) => i.id)
          return (
            <fieldset key={group.id} className="min-w-0 rounded-(--radius-xl) border border-(--border-subtle) bg-(--surface-sunken) p-4 sm:p-5">
              <legend className="sr-only">{group.label}</legend>
              <div aria-hidden="true" className="mb-3 flex items-baseline justify-between gap-3">
                <span className="font-display text-(length:--text-lg) text-(--text-primary)">{group.label}</span>
                <span className="text-(length:--text-sm) text-(--text-muted)">
                  {t('needs.groupCount', { ticked: tickedInGroup(form.needs, ids), total: ids.length })}
                </span>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {group.items.map((item) => {
                  const index = indexOfItem(form.needs, item.id)
                  return (
                    <NeedCard
                      key={item.id}
                      label={item.label}
                      need={index === -1 ? undefined : form.needs[index]}
                      disabled={full}
                      noteError={index === -1 ? undefined : error(`needs.${index}.note`)}
                      onToggle={() => setNeeds((n) => toggleNeed(n, item.id))}
                      onNote={(note) => setNeeds((n) => updateItem(n, item.id, { note }))}
                      onUrgent={(urgent) => setNeeds((n) => updateItem(n, item.id, { urgent }))}
                    />
                  )
                })}
              </ul>
            </fieldset>
          )
        })}
        {orphans.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2">
            {orphans.map(({ need, index }) => (
              <NeedCard
                key={`${index}-${need.itemId}`}
                label={need.customLabel ?? need.itemId}
                need={need}
                noteError={error(`needs.${index}.itemId`) ?? error(`needs.${index}.note`)}
                onToggle={() => setNeeds((n) => removeNeedAt(n, index))}
                onNote={(note) => setNeeds((n) => updateNeedAt(n, index, { note }))}
                onUrgent={(urgent) => setNeeds((n) => updateNeedAt(n, index, { urgent }))}
              />
            ))}
          </ul>
        )}
      </Fieldset>

      <CustomNeeds needs={form.needs} onChange={setNeeds} error={error} />
    </div>
  )
}
