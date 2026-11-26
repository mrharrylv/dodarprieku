import { useTranslation } from 'react-i18next'

import type { PublicCharity } from '@shared/contracts'
import { useCharityStats } from '@/hooks/useCharityStats'
import { useCountView } from '@/hooks/useCountView'
import { CharityContacts } from '@/components/charity/CharityContacts'
import { DeliveryOptions } from '@/components/charity/DeliveryOptions'
import { NeedsSection } from '@/components/charity/NeedsSection'
import { RecentSupporters } from '@/components/charity/RecentSupporters'
import { SectionCard } from '@/components/charity/SectionCard'
import { SponsorWall } from '@/components/charity/SponsorWall'
import { SubscribeBox } from '@/components/pledge/SubscribeBox'
import { ShareLink } from './ShareLink'

/**
 * The expanded card's body, everything there is to know about one charity
 * now that the map is the only page: what it is, its needs with notes, urgent
 * badges, live pledge counts and "Es ziedošu", delivery, contacts, the people
 * and companies who help, the newsletter sign-up (tied to this charity) and
 * its shareable link. Mounted only while the card is expanded, so the live
 * counts are fetched (and the view counted) only for a charity someone opened.
 */
export const MapPopupDetails = ({ charity }: { charity: PublicCharity }) => {
  const { t } = useTranslation('charity')
  const stats = useCharityStats(charity.id)
  useCountView(charity.id)
  const { profile } = charity

  return (
    <div className="dp-details">
      {profile.description.trim() !== '' && (
        <SectionCard title={t('about.title')} compact>
          <p className="text-(length:--text-sm) whitespace-pre-line text-(--text-primary)">{profile.description}</p>
        </SectionCard>
      )}
      <NeedsSection charity={charity} stats={stats} onPledged={stats.reload} compact />
      <DeliveryOptions delivery={profile.delivery} compact />
      <CharityContacts charity={charity} compact />
      <RecentSupporters stats={stats} compact />
      <SponsorWall sponsors={profile.sponsors} compact />
      <div className="border-t border-(--border-subtle) p-4">
        <SubscribeBox charityId={charity.id} className="shadow-none" />
      </div>
      <div className="border-t border-(--border-subtle) p-4">
        <ShareLink slug={charity.slug} />
      </div>
    </div>
  )
}
