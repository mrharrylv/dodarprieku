import { useTranslation } from 'react-i18next'

import type { Sponsor } from '@shared/contracts'
import { mediaUrl, safeHref } from '@/lib/snapshot'
import { SectionCard } from './SectionCard'

/** "Atbalstītāji": the companies the charity thanks, logos linking to them. Absent when there are none. */
export const SponsorWall = ({ sponsors }: { sponsors: readonly Sponsor[] }) => {
  const { t } = useTranslation('charity')
  const { t: tc } = useTranslation('common')
  if (sponsors.length === 0) return null

  return (
    <SectionCard title={t('sponsors.title')}>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {sponsors.map((sponsor, i) => {
          const logo = mediaUrl(sponsor.logo)
          const href = safeHref(sponsor.url)
          const face = (
            <>
              {logo !== undefined ? (
                <img src={logo} alt={t('sponsors.logoAlt', { name: sponsor.name })} loading="lazy" referrerPolicy="no-referrer" className="h-12 w-full object-contain" />
              ) : null}
              <span className={logo !== undefined ? 'sr-only' : 'text-center font-semibold text-(--text-primary)'}>{sponsor.name}</span>
            </>
          )
          const box = 'flex min-h-20 flex-col items-center justify-center gap-1 rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-page) p-3'
          return (
            <li key={`${sponsor.name}-${i}`}>
              {href !== undefined ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className={`${box} transition-shadow hover:shadow-(--shadow-card) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)`}>
                  {face}
                  <span className="sr-only">{tc('a11y.opensInNewTab')}</span>
                </a>
              ) : (
                <div className={box}>{face}</div>
              )}
            </li>
          )
        })}
      </ul>
    </SectionCard>
  )
}
