import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PublicCharity } from '@shared/contracts'
import { cn } from '@/lib/cn'
import { groupNeeds, type NeedView } from '@/lib/snapshot'
import type { StatsState } from '@/hooks/useCharityStats'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { PledgeDialog } from '@/components/pledge/PledgeDialog'
import { SectionCard } from './SectionCard'
import { UrgentBadge } from './UrgentBadge'

/** The needs as the catalog groups them, each a tick box, then "Es ziedošu". */
export const NeedsSection = ({ charity, stats, onPledged }: { charity: PublicCharity; stats: StatsState & { reload: () => void }; onPledged: () => void }) => {
  const { t } = useTranslation('charity')
  const [picked, setPicked] = useState<readonly string[]>([])
  const [open, setOpen] = useState(false)
  const [nudge, setNudge] = useState(false)
  const groups = groupNeeds(charity, t('needs.other'))
  const all = groups.flatMap((g) => g.needs)
  const counts = stats.status === 'ready' ? stats.stats.pledgesByNeed : null

  const toggle = (key: string) => {
    setNudge(false)
    setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const start = () => (picked.length === 0 ? setNudge(true) : setOpen(true))

  return (
    <SectionCard title={t('needs.title')}>
      {all.length === 0 ? (
        <p className="text-(--text-secondary)">{t('needs.empty')}</p>
      ) : (
        <>
          <p className="-mt-2 mb-5 text-(--text-secondary)">{t('needs.intro')}</p>
          <div className="space-y-6">
            {groups.map((group) => (
              <fieldset key={group.id}>
                <legend className="mb-2 text-(length:--text-sm) font-semibold tracking-wide text-(--text-muted) uppercase">{group.label}</legend>
                <ul className="grid gap-2 sm:grid-cols-2">
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
          <div className="sticky bottom-4 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-(--radius-xl) border border-(--border-subtle) bg-(--surface-raised)/95 p-3 shadow-(--shadow-lifted) backdrop-blur">
            <p className="pl-2 text-(length:--text-sm) text-(--text-secondary)" aria-live="polite">
              {nudge ? t('needs.selectFirst') : t('needs.selected', { count: picked.length })}
            </p>
            <Button onClick={start} size="lg">
              <Icon name="heart" />
              {t('needs.cta')}
            </Button>
          </div>
        </>
      )}
      {open && (
        <PledgeDialog
          charity={charity}
          needs={all.filter((n) => picked.includes(n.key))}
          allowedKeys={all.map((n) => n.key)}
          onClose={() => setOpen(false)}
          onPledged={() => {
            setPicked([])
            onPledged()
          }}
        />
      )}
    </SectionCard>
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
