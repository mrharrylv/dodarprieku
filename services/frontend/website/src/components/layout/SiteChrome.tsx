import { useTranslation } from 'react-i18next'

import { CONTACT } from '@/config/site'
import { useVisitTracker } from '@/hooks/useVisitTracker'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { BackToTop } from './BackToTop'
import { PageTransition } from './PageTransition'
import { ScrollProgress } from './ScrollProgress'
import { ScrollRestoration } from './ScrollRestoration'
import { WhatsAppBubble } from './WhatsAppBubble'

/**
 * The fixed elements every style renders, in one import.
 *
 * A shell mounts `<SiteChrome />` once, anywhere inside its root element, and
 * gets scroll restoration on navigation, a fade between pages, the scroll progress bar, the
 * back-to-top button, the WhatsApp bubble and the visit statistics sent to
 * HA Group's CRM (`useVisitTracker`, which renders nothing). Keeping them here rather than in
 * each shell means a style cannot forget one, and a change to any of them is
 * made once.
 *
 * Back-to-top sits above the bubble only when the bubble is there, so a site
 * without a WhatsApp number does not get a button floating in mid-air.
 *
 * The two floating buttons sit in their own labelled landmark. Fixed in a
 * corner, they belong to no header, main or footer, and content outside every
 * landmark is skipped by a screen-reader user moving landmark to landmark
 * (axe `region`). The wrapper has no box of its own; each button still
 * positions itself.
 */
export const SiteChrome = () => {
  const { t } = useTranslation('common')
  const whatsapp = CONTACT.whatsapp.trim().length > 0
  useVisitTracker()

  return (
    <>
      <ScrollRestoration />
      <PageTransition />
      <ScrollProgress />
      <GoogleAnalytics />
      <aside aria-label={t('a11y.quickActions')}>
        <BackToTop raised={whatsapp} />
        {whatsapp && <WhatsAppBubble />}
      </aside>
    </>
  )
}
