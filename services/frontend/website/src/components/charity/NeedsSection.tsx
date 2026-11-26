import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PublicCharity } from '@shared/contracts'
import { cn } from '@/lib/cn'
import { groupNeeds, type NeedView } from '@/lib/snapshot'
import type { StatsState } from '@/hooks/useCharityStats'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { SectionCard } from './SectionCard'
import { UrgentBadge } from './UrgentBadge'

/**
 * The needs as the catalog groups them, each a tick box, then "Es ziedošu",
 * which hands the ticked needs to `onPledge`: the card turns to its pledge
 * step. The ticks are the card's (`picked`), so they are still there when the
 * visitor comes back from that step. `compact`: one column and no sticky bar,
 * inside the map's expanded card.
 */
export const NeedsSection = ({
  charity,
  stats,
  picked,
  onPick,
  onPledge,
  compact = false,
}: {
  charity: PublicCharity
  stats: StatsState & { reload: () => void }
  picked: readonly string[]
  onPick: (next: readonly string[]) => void
  onPledge: () => void
  compact?: boolean
}) => {
  const { t } = useTranslation('charity')
  const [nudge, setNudge] = useState(false)
  const groups = groupNeeds(charity, t('needs.other'))
  const all = groups.flatMap((g) => g.needs)
  const counts = stats.status === 'ready' ? stats.stats.pledgesByNeed : null

  const toggle = (key: string) => {
    setNudge(false)
    onPick(picked.includes(key) ? picked.filter((k) => k !== key) : [...picked, key])
  }

  const start = () => (picked.length === 0 ? setNudge(true) : onPledge())

  return (
    <SectionCard title={t('needs.title')} compact={compact}>
      {all.length === 0 ? (
        <NoNeeds />
      ) : (
        <>
          <p className={cn('text-(--text-secondary)', compact ? '-mt-1 mb-4 text-(length:--text-sm)' : '-mt-2 mb-5')}>{t('needs.intro')}</p>
          <div className={compact ? 'space-y-4' : 'space-y-6'}>
            {groups.map((group) => (
              <fieldset key={group.id}>
                <legend className="mb-2 text-(length:--text-sm) font-semibold tracking-wide text-(--text-muted) uppercase">{group.label}</legend>
                <ul className={cn('grid gap-2', !compact && 'sm:grid-cols-2')}>
                  {group.needs.map((need) => (
                    <li key={need.key}>
                      <NeedRow need={need} checked={picked.includes(need.key)} count={counts?.[need.key] ?? 0} showCount={counts !== null} onToggle={() => toggle(need.key)} />
                    </li>
                  ))}
                </ul>
              </fieldset>
            ))}
          </div>
          <StatsNote stats={stats} />
          <div
            className={cn(
              'z-10 flex flex-wrap items-center justify-between gap-3 rounded-(--radius-xl) border border-(--border-subtle) bg-(--surface-raised)/95 p-3 shadow-(--shadow-lifted) backdrop-blur',
              compact ? 'mt-4' : 'sticky bottom-4 mt-6',
            )}
          >
            <p className="pl-2 text-(length:--text-sm) text-(--text-secondary)" aria-live="polite">
              {nudge ? t('needs.selectFirst') : t('needs.selected', { count: picked.length })}
            </p>
            <Button onClick={start} size={compact ? 'md' : 'lg'}>
              <Icon name="heart" />
              {t('needs.cta')}
            </Button>
          </div>
        </>
      )}
    </SectionCard>
  )
}

/** No needs listed yet: most imported institutions, until they register or claim their profile. */
const NoNeeds = () => {
  const { t } = useTranslation('charity')
  return (
    <div className="rounded-(--radius-lg) border border-dashed border-(--border-strong) bg-(--surface-sunken) p-4">
      <p className="font-medium text-(--text-primary)">{t('needs.empty')}</p>
      <p className="mt-1 text-(length:--text-sm) text-(--text-secondary)">{t('needs.emptyHint')}</p>
    </div>
  )
}

const NeedRow = ({ need, checked, count, showCount, onToggle }: { need: NeedView; checked: boolean; count: number; showCount: boolean; onToggle: () => void }) => {
  const { t } = useTranslation('charity')
  return (
    <label
      className={cn(
        'flex min-h-11 cursor-pointer items-start gap-3 rounded-(--radius-lg) border p-3 transition-colors duration-150',
        checked ? 'border-(--ring-accent) bg-(--surface-accent-soft)' : 'border-(--border-subtle) bg-(--surface-page) hover:border-(--border-strong)',
      )}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-(--fill-accent)" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-(--text-primary)">{need.label}</span>
          {need.urgent && <UrgentBadge label={t('needs.urgent')} />}
        </span>
        {need.note !== undefined && <span className="mt-0.5 block text-(length:--text-sm) text-(--text-secondary)">{need.note}</span>}
        {showCount && count > 0 && <span className="mt-1 block text-(length:--text-xs) font-medium text-(--text-accent)">{t('needs.pledged', { count })}</span>}
      </span>
    </label>
  )
}

const StatsNote = ({ stats }: { stats: StatsState & { reload: () => void } }) => {
  const { t } = useTranslation('charity')
  if (stats.status !== 'error') return null
  return (
    <p className="mt-4 flex flex-wrap items-center gap-2 text-(length:--text-sm) text-(--text-secondary)" role="status">
      {t('stats.error')}
      <button type="button" onClick={stats.reload} className="min-h-11 font-medium text-(--text-accent) underline underline-offset-2">
        {t('stats.retry')}
      </button>
    </p>
  )
}
