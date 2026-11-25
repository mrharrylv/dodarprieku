import { useTranslation } from 'react-i18next'

import type { StatsState } from '@/hooks/useCharityStats'
import { SectionCard } from './SectionCard'

/** People who pledged under their own name, newest first. Nothing private is ever shown. */
export const RecentSupporters = ({ stats }: { stats: StatsState }) => {
  const { t } = useTranslation('charity')
  if (stats.status !== 'ready') return null
  const people = stats.stats.recentSupporters

  return (
    <SectionCard title={t('supporters.title')}>
      {people.length === 0 ? (
        <p className="text-(--text-secondary)">{t('supporters.empty')}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {people.map((person, i) => (
            <li key={`${person.name}-${person.at}-${i}`} className="inline-flex items-center gap-2 rounded-full bg-(--surface-accent-soft) py-1 pr-3.5 pl-1 text-(length:--text-sm) font-medium text-(--text-primary)">
              <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-(--fill-accent) text-(length:--text-xs) font-semibold text-(--text-on-accent)">
                {person.name.trim().charAt(0).toUpperCase()}
              </span>
              {person.name}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
