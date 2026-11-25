import { useTranslation } from 'react-i18next'

import { MAP_ID } from '@/config/dom'
import { CONTACT, MAP, SITE } from '@/config/site'
import { Container } from '@/components/ui/Container'
import { Reveal } from '@/components/ui/Reveal'

/**
 * Where the business is: a Google map shown straight away, not behind a click
 * (Harry's standing choice, 2026-11-06), inside a card with the address and an
 * "Open in Google Maps" link.
 *
 * Renders nothing while `MAP` in `config/site.ts` is null, which is the
 * default: the map is a third-party request, so a site turns it on together
 * with the CSP's `frame_origins` and its cookie and privacy copy.
 *
 * The frame loads lazily, so Google is contacted only once the map is near
 * the screen. A drawn street plan with a pin sits behind it while it loads,
 * and the address and the link work without it. The footer address links here
 * (`MapLink`), so the card carries `MAP_ID` and a scroll margin that clears
 * the sticky header.
 */
export const LocationMap = () => {
  const { t } = useTranslation('contact')
  if (MAP === null) return null
  const { street, postalCode, city } = CONTACT.address

  return (
    <section aria-labelledby={`${MAP_ID}-title`} className="py-12 sm:py-16">
      <Container>
        <Reveal>
          <div
            id={MAP_ID}
            className="relative scroll-mt-28 overflow-hidden rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised) shadow-(--shadow-card)"
          >
            <div className="relative aspect-[4/3] sm:aspect-[21/9]">
              <StreetPlan />
              <iframe
                src={MAP.embedUrl}
                title={t('map.frameTitle', { name: SITE.name })}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>

            <div className="flex flex-col gap-5 border-t border-(--border-subtle) p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <h2
                  id={`${MAP_ID}-title`}
                  className="text-(length:--text-2xl) text-(--text-primary)"
                >
                  {t('map.title')}
                </h2>
                <address className="mt-2 not-italic text-(--text-primary)">
                  {SITE.name}, {street}, {postalCode} {city}
                </address>
              </div>
              <a
                href={MAP.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 shrink-0 items-center self-start rounded-(--radius-md) border border-(--border-strong) px-4 font-medium text-(--text-primary) transition-colors hover:border-(--ring-accent) hover:text-(--text-accent) sm:self-auto"
              >
                {t('map.open')}
              </a>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}

/**
 * A drawn, not real, street plan: a few roads and blocks and a pulsing pin,
 * shown while the map loads and if it cannot. Pure decoration in token
 * colours, so it suits both themes and costs no request.
 */
const StreetPlan = () => (
  <div aria-hidden="true" className="absolute inset-0 bg-(--surface-sunken)">
    <svg
      viewBox="0 0 800 340"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full text-(--border-strong)"
      fill="none"
    >
      <g className="text-(--surface-raised)" fill="currentColor">
        <rect x="40" y="30" width="180" height="110" rx="10" />
        <rect x="250" y="30" width="230" height="110" rx="10" />
        <rect x="510" y="30" width="250" height="110" rx="10" />
        <rect x="40" y="185" width="260" height="125" rx="10" />
        <rect x="330" y="185" width="150" height="125" rx="10" />
        <rect x="510" y="185" width="250" height="125" rx="10" />
      </g>
      <g stroke="currentColor" strokeWidth="2" strokeDasharray="10 12" opacity="0.6">
        <path d="M0 162h800" />
        <path d="M235 0v340M495 0v340" />
      </g>
    </svg>
    <span className="absolute top-[47%] left-1/2 -translate-x-1/2 -translate-y-full">
      <span className="absolute top-full left-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-(--fill-accent) opacity-30 motion-reduce:animate-none" />
      <svg viewBox="0 0 24 32" className="relative h-12 w-9 text-(--fill-accent) drop-shadow-md">
        <path
          fill="currentColor"
          d="M12 0C5.4 0 0 5.2 0 11.7 0 20.4 12 32 12 32s12-11.6 12-20.3C24 5.2 18.6 0 12 0z"
        />
        <circle cx="12" cy="11.5" r="4.5" className="fill-(--text-on-accent)" />
      </svg>
    </span>
  </div>
)
