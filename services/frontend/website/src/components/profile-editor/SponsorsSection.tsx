import { useTranslation } from 'react-i18next'

import { LIMITS, type Sponsor } from '@shared/contracts'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Input } from '@/components/ui/Field'
import { LogoUploader } from '@/components/upload/LogoUploader'
import { Fieldset } from './controls'
import type { SectionProps } from './form-model'
import { addSponsor, canAddSponsor, moveSponsor, removeSponsor, updateSponsor } from './sponsors'
import { useFieldError } from './useFieldError'

const ICON_BUTTON =
  'grid h-11 w-11 place-items-center rounded-(--radius-md) border border-(--border-strong) bg-(--surface-raised) text-(--text-primary) hover:text-(--text-accent) disabled:opacity-40'

/**
 * The sponsor wall: companies and people who support the charity, shown on
 * its public page in this order and counted in the sponsor leaderboard.
 */
export const SponsorsSection = ({ form, update, errors }: SectionProps) => {
  const { t } = useTranslation('register')
  const error = useFieldError(errors)
  const set = (fn: (s: readonly Sponsor[]) => readonly Sponsor[]) => update((f) => ({ ...f, sponsors: fn(f.sponsors) }))
  const count = form.sponsors.length

  return (
    <Fieldset legend={t('sponsors.legend')} hint={t('sponsors.intro')} error={error('sponsors')}>
      {count === 0 && <p className="text-(--text-secondary)">{t('sponsors.empty')}</p>}
      <ol className="space-y-4">
        {form.sponsors.map((sponsor, index) => {
          const n = index + 1
          const name = sponsor.name.trim() === '' ? t('sponsors.item', { n }) : sponsor.name
          return (
            <li key={index} className="space-y-4 rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised) p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-(length:--text-lg) text-(--text-primary)">{t('sponsors.item', { n })}</p>
                <div className="flex gap-2">
                  <button type="button" className={ICON_BUTTON} disabled={index === 0}
                    aria-label={t('sponsors.moveUp', { name })} onClick={() => set((s) => moveSponsor(s, index, -1))}>
                    <Icon name="arrowUp" />
                  </button>
                  <button type="button" className={ICON_BUTTON} disabled={index === count - 1}
                    aria-label={t('sponsors.moveDown', { name })} onClick={() => set((s) => moveSponsor(s, index, 1))}>
                    <Icon name="arrowUp" className="rotate-180" />
                  </button>
                  <button type="button" className={ICON_BUTTON} aria-label={t('sponsors.remove', { name })}
                    onClick={() => set((s) => removeSponsor(s, index))}>
                    <Icon name="close" />
                  </button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('sponsors.name')} required value={sponsor.name} maxLength={LIMITS.sponsorName}
                  error={error(`sponsors.${index}.name`)} onChange={(e) => set((s) => updateSponsor(s, index, 'name', e.target.value))} />
                <Input label={t('sponsors.url')} type="url" badge={t('common.optional')} value={sponsor.url ?? ''}
                  maxLength={LIMITS.url} placeholder={t('organization.websitePlaceholder')} error={error(`sponsors.${index}.url`)}
                  onChange={(e) => set((s) => updateSponsor(s, index, 'url', e.target.value))} />
              </div>
              <div>
                <p className="mb-2 text-(length:--text-sm) font-medium text-(--text-primary)">
                  {t('sponsors.logo')} <span className="font-normal text-(--text-muted)">({t('common.optional')})</span>
                </p>
                <LogoUploader compact value={sponsor.logo ?? ''} alt={t('sponsors.logoAlt', { name })}
                  onChange={(key) => set((s) => updateSponsor(s, index, 'logo', key))} />
              </div>
            </li>
          )
        })}
      </ol>
      {canAddSponsor(form.sponsors) ? (
        <Button variant="secondary" onClick={() => set(addSponsor)}>
          <Icon name="plus" />
          {t('sponsors.add')}
        </Button>
      ) : (
        <p className="text-(length:--text-sm) text-(--text-secondary)">{t('sponsors.limit', { max: LIMITS.maxSponsors })}</p>
      )}
    </Fieldset>
  )
}
