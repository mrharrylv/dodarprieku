import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import type { PublicCharity } from '@shared/contracts'
import { charityPath } from '@/config/site'
import { useCharityStats } from '@/hooks/useCharityStats'
import { useCountView } from '@/hooks/useCountView'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { buttonClasses } from '@/components/ui/button-styles'
import { Icon } from '@/components/ui/Icon'
import { CharityContacts } from '@/components/charity/CharityContacts'
import { DeliveryOptions } from '@/components/charity/DeliveryOptions'
import { NeedsSection } from '@/components/charity/NeedsSection'

/**
 * The expanded popup's body: the charity page's own needs, pledge flow,
 * delivery and contacts, compact, and the way to the full, shareable page.
 * Mounted only while the card is expanded, so the live counts are fetched
 * (and the view counted) only for a charity someone actually opened.
 */
export const MapPopupDetails = ({ charity }: { charity: PublicCharity }) => {
  const { t } = useTranslation('map')
  const { locale } = useLocale()
  const stats = useCharityStats(charity.id)
  useCountView(charity.id)

  return (
    <div className="dp-details">
      <NeedsSection charity={charity} stats={stats} onPledged={stats.reload} compact />
      <DeliveryOptions delivery={charity.profile.delivery} compact />
      <CharityContacts charity={charity} compact />
      <div className="border-t border-(--border-subtle) p-4">
        <Link to={localePath(charityPath(charity.slug), locale)} className={buttonClasses('secondary', 'sm', 'w-full')}>
          {t('popup.openPage')}
          <Icon name="arrowRight" />
        </Link>
      </div>
    </div>
  )
}
