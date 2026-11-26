import { useTranslation } from 'react-i18next'

import type { PublicCharity } from '@shared/contracts'
import type { StatsState } from '@/hooks/useCharityStats'
import { CharityContacts } from '@/components/charity/CharityContacts'
import { DeliveryOptions } from '@/components/charity/DeliveryOptions'
import { NeedsSection } from '@/components/charity/NeedsSection'
import { RecentSupporters } from '@/components/charity/RecentSupporters'
import { SectionCard } from '@/components/charity/SectionCard'
import { SponsorWall } from '@/components/charity/SponsorWall'
import { SubscribeBox } from '@/components/pledge/SubscribeBox'
import { ClaimLink } from './ClaimLink'
import { ShareLink } from './ShareLink'

/**
 * The expanded card's first step, everything there is to know about one
 * charity: what it is, its needs with notes, urgent badges, live pledge
 * counts and "Es ziedošu" (which turns the card to its pledge step), delivery,
 * contacts, the people and companies who help, the newsletter sign-up (tied
 * to this charity), its shareable link and, for an unclaimed imported
 * charity, "Pieprasīt profilu".
 */
export const MapPopupDetails = ({
  charity,
  stats,
  picked,
  onPick,
  onPledge,
}: {
  charity: PublicCharity
  stats: StatsState & { reload: () => void }
  picked: readonly string[]
  onPick: (next: readonly string[]) => void
  onPledge: () => void
}) => {
  const { t } = useTranslation('charity')
  const { profile } = charity

  return (
    <div className="dp-details">
      {profile.description.trim() !== '' && (
        <SectionCard title={t('about.title')} compact>
          <p className="text-(length:--text-sm) whitespace-pre-line text-(--text-primary)">{profile.description}</p>
        </SectionCard>
      )}
      <NeedsSection charity={charity} stats={stats} picked={picked} onPick={onPick} onPledge={onPledge} compact />
      <DeliveryOptions delivery={profile.delivery} compact />
      <CharityContacts charity={charity} compact />
      <RecentSupporters stats={stats} compact />
      <SponsorWall sponsors={profile.sponsors} compact />
      <div className="border-t border-(--border-subtle) p-4">
        <SubscribeBox charityId={charity.id} className="shadow-none" />
      </div>
      <div className="space-y-3 border-t border-(--border-subtle) p-4">
        <ShareLink slug={charity.slug} />
        <ClaimLink charity={charity} />
      </div>
    </div>
  )
}
