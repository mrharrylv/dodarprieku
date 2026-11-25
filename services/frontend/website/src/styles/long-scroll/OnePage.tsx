import { HeroBand } from './HeroBand'
import { HighlightsBand } from './HighlightsBand'
import { ServicesBand } from './ServicesBand'
import { AboutBand } from './AboutBand'
import { ProcessBand } from './ProcessBand'
import { ContactBand } from './ContactBand'
import { useFocusSection } from './useFocusSection'

/**
 * The site. All of it, in order.
 *
 * All four routes render this, so the composition lives in one file and the
 * page components differ only in their `<Seo>` and where they land the
 * reader. `focus` is the band to scroll to, or null for the home route, which
 * starts at the top anyway. A fragment in the URL beats it, and every
 * navigation scrolls again, including one to the route already open: see
 * useFocusSection.
 *
 * The bands are numbered from one, and the hero is not one of them: it is the
 * cover, not a chapter.
 */
export const OnePage = ({ focus }: { focus: string | null }) => {
  useFocusSection(focus)

  return (
    <>
      <HeroBand />
      <HighlightsBand index={1} />
      <ServicesBand index={2} />
      <AboutBand index={3} />
      <ProcessBand index={4} />
      <ContactBand index={5} />
    </>
  )
}
