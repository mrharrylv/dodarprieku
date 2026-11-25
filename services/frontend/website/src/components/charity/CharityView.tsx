import { useTranslation } from 'react-i18next'

import type { PublicCharity, SponsorLeaderboardEntry } from '@shared/contracts'
import { useCharityStats } from '@/hooks/useCharityStats'
import { useCountView } from '@/hooks/useCountView'
import { SponsorLeaderboard } from '@/components/map/SponsorLeaderboard'
import { SubscribeBox } from '@/components/pledge/SubscribeBox'
import { CharityContacts } from './CharityContacts'
import { CharityGallery } from './CharityGallery'
import { DeliveryOptions } from './DeliveryOptions'
import { NeedsSection } from './NeedsSection'
import { RecentSupporters } from './RecentSupporters'
import { SectionCard } from './SectionCard'
import { SponsorWall } from './SponsorWall'

/** One charity below its header: what it is, what it needs, how to bring it, who helps. */
export const CharityView = ({ charity, leaderboard }: { charity: PublicCharity; leaderboard: readonly SponsorLeaderboardEntry[] }) => {
  const { t } = useTranslation('charity')
  const stats = useCharityStats(charity.id)
  useCountView(charity.id)
  const { profile } = charity

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-8">
          <CharityGallery charity={charity} />
          {profile.description.trim() !== '' && (
            <SectionCard title={t('about.title')}>
              <p className="whitespace-pre-line text-(--text-primary)">{profile.description}</p>
            </SectionCard>
          )}
          <NeedsSection charity={charity} stats={stats} onPledged={stats.reload} />
          <DeliveryOptions delivery={profile.delivery} />
        </div>
        <aside className="min-w-0 space-y-6">
          <CharityContacts charity={charity} />
          <RecentSupporters stats={stats} />
          <SponsorWall sponsors={profile.sponsors} />
          <SubscribeBox charityId={charity.id} />
          {leaderboard.length > 0 && (
            <div className="rounded-(--radius-2xl) border border-(--border-subtle) bg-(--surface-raised) p-5 shadow-(--shadow-subtle)">
              <SponsorLeaderboard entries={leaderboard} />
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
