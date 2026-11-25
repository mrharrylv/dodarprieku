import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LIMITS, type Need } from '@shared/contracts'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Fieldset } from './controls'
import { NeedCard } from './NeedCard'
import { addCustomNeed, canAddNeed, customNeeds, removeNeedAt, updateNeedAt } from './needs-selection'

/** The charity's own items: a label and an optional note, added one at a time. */
export const CustomNeeds = ({
  needs,
  onChange,
  error,
}: {
  needs: readonly Need[]
  onChange: (fn: (needs: readonly Need[]) => readonly Need[]) => void
  error: (path: string) => string | undefined
}) => {
  const { t } = useTranslation('register')
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [blank, setBlank] = useState(false)
  const own = customNeeds(needs)

  const add = (event?: { preventDefault: () => void }) => {
    event?.preventDefault()
    if (label.trim() === '') {
      setBlank(true)
      return
    }
    onChange((n) => addCustomNeed(n, label, note))
    setLabel('')
    setNote('')
    setBlank(false)
  }

  return (
    <Fieldset legend={t('needs.customLegend')} hint={t('needs.customHint')}>
      {own.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {own.map(({ need, index }) => (
            <NeedCard
              key={`${index}-${need.customLabel ?? ''}`}
              label={need.customLabel ?? ''}
              need={need}
              noteError={error(`needs.${index}.note`) ?? error(`needs.${index}.customLabel`)}
              onToggle={() => onChange((n) => removeNeedAt(n, index))}
              onNote={(value) => onChange((n) => updateNeedAt(n, index, { note: value }))}
              onUrgent={(urgent) => onChange((n) => updateNeedAt(n, index, { urgent }))}
            />
          ))}
        </ul>
      )}
      {canAddNeed(needs) ? (
        <div className="grid gap-4 rounded-(--radius-lg) border border-dashed border-(--border-strong) p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Input label={t('needs.customLabel')} value={label} maxLength={LIMITS.customNeedLabel}
            placeholder={t('needs.customLabelPlaceholder')} error={blank ? t('needs.customLabelRequired') : undefined}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add(e)
            }} />
          <Input label={t('needs.customNote')} badge={t('common.optional')} value={note} maxLength={LIMITS.needNote}
            placeholder={t('needs.notePlaceholder')} onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add(e)
            }} />
          <Button variant="secondary" onClick={() => add()}>
            {t('needs.add')}
          </Button>
        </div>
      ) : (
        <p className="text-(length:--text-sm) text-(--text-secondary)">{t('needs.limit')}</p>
      )}
      {own.length > 0 && <p className="text-(length:--text-xs) text-(--text-muted)">{t('needs.customRemoveHint')}</p>}
    </Fieldset>
  )
}
