import { useTranslation } from 'react-i18next'

import { needKey, needLabel } from '@shared/catalog'
import type { AccountView } from '@shared/contracts'

import { Icon, type IconName } from '@/components/ui/Icon'
import { formatNumber } from './format'

const Stat = ({ icon, label, value }: { icon: IconName; label: string; value: number }) => (
  <div className="flex items-center gap-4 rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised) p-5 shadow-(--shadow-subtle)">
    <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-(--surface-accent-soft) text-(--text-accent)">
      <Icon name={icon} className="h-6 w-6" />
    </span>
    <div>
      <p className="font-display text-(length:--text-3xl) leading-none text-(--text-primary)">{formatNumber(value)}</p>
      <p className="mt-1 text-(length:--text-sm) text-(--text-secondary)">{label}</p>
    </div>
  </div>
)

/** Views, pledges and subscribers, then how many pledges each published need has had. */
export const StatsPanel = ({ account }: { account: AccountView }) => {
  const { t } = useTranslation('account')
  const { stats, profile } = account
  const rows = profile.needs
    .map((need, index) => ({ key: needKey(need, index), label: needLabel(profile.category, need), count: stats.pledgesByNeed[needKey(need, index)] ?? 0 }))
    .sort((a, b) => b.count - a.count)
  const top = Math.max(1, ...rows.map((r) => r.count))

  return (
    <section aria-labelledby="stats-title" className="space-y-5">
      <h2 id="stats-title" className="font-display text-(length:--text-2xl) text-(--text-primary)">{t('stats.title')}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon="sparkle" label={t('stats.views')} value={stats.views} />
        <Stat icon="heart" label={t('stats.pledges')} value={stats.pledges} />
        <Stat icon="mail" label={t('stats.subscribers')} value={stats.subscribers} />
      </div>
      <div className="rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised) p-5">
        <h3 className="font-medium text-(--text-primary)">{t('stats.byNeed')}</h3>
        {rows.length === 0 ? (
          <p className="mt-2 text-(--text-secondary)">{t('stats.byNeedEmpty')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {rows.map((row) => (
              <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1">
                <span className="truncate text-(--text-primary)">{row.label}</span>
                <span className="text-(length:--text-sm) font-medium text-(--text-secondary)">{t('stats.pledgeCount', { count: row.count })}</span>
                <span aria-hidden="true" className="col-span-2 h-1.5 overflow-hidden rounded-full bg-(--surface-sunken)">
                  <span className="block h-full rounded-full bg-(--fill-accent)" style={{ width: `${(row.count / top) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
