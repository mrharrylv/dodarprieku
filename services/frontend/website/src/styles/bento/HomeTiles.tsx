import { useTranslation } from 'react-i18next'

import { CONTACT, ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Tile, TileEyebrow } from './Tile'
import { SPAN_BESIDE_HERO, SPAN_HERO } from './spans'

/**
 * The tile the page opens on, and the only h1 on it.
 *
 * Two rows tall on a desktop so the two tiles beside it stack to the same
 * height. On a phone it is simply the first row of one column, which is why
 * the row span is only applied from `lg` up.
 */
export const HeroTile = () => {
  const { t } = useTranslation('home')
  const { locale } = useLocale()

  return (
    <Tile className={cn(SPAN_HERO, 'relative overflow-hidden justify-center sm:p-10')}>
      {/* The dot field is drawn in currentColor, so the text colour on this
          element is what tints it. Border colour keeps it at the strength of a
          hairline in both themes instead of a grey that only works in one. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-dot-grid text-(--border-subtle)"
      />

      <div className="relative animate-rise-in">
        <TileEyebrow>{t('hero.eyebrow')}</TileEyebrow>
        <h1 className="mt-4 max-w-2xl text-balance text-(length:--text-4xl) font-semibold tracking-tight text-(--text-primary)">
          {t('hero.title')}
        </h1>
        <p className="mt-5 max-w-xl text-(length:--text-lg) text-(--text-secondary)">
          {t('hero.subtitle')}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink to={localePath(ROUTES.contact, locale)} size="lg">
            {t('hero.primaryCta')}
          </ButtonLink>
          <ButtonLink
            to={localePath(ROUTES.services, locale)}
            size="lg"
            variant="secondary"
          >
            {t('hero.secondaryCta')}
          </ButtonLink>
        </div>
      </div>
    </Tile>
  )
}

/**
 * The phone number and the email, in the accent tile, above the fold.
 *
 * Not a link tile: the two numbers themselves are the destinations, and a
 * plumber's customer phoning from the home page should not have to load the
 * contact page first. Each is a full-height row, so both clear 44px.
 */
export const ContactTile = () => {
  const { t } = useTranslation('common')

  return (
    <Tile tone="accent" className={SPAN_BESIDE_HERO}>
      {/* No eyebrow above this heading. `nav.contact` and
          `footer.contactHeading` are the same word in all three locales, so an
          eyebrow here printed it twice, stacked. The heading names the tile on
          its own. */}
      <h2 className="text-(length:--text-xl) font-semibold tracking-tight text-(--text-primary)">
        {t('footer.contactHeading')}
      </h2>

      <ul className="mt-4 space-y-1">
        <li className="min-w-0">
          {/* tel: needs the E.164 form; the visible text is the readable one. */}
          <a
            href={`tel:${CONTACT.phoneE164}`}
            className="inline-flex min-h-11 items-center gap-3 text-(length:--text-xl) font-semibold tracking-tight text-(--text-primary) transition-colors hover:text-(--text-accent)"
          >
            <Icon name="phone" className="h-5 w-5 shrink-0 text-(--text-accent)" />
            {CONTACT.phone}
          </a>
        </li>
        <li className="min-w-0">
          <a
            href={`mailto:${CONTACT.email}`}
            className="inline-flex min-h-11 items-center gap-3 break-words text-(--text-secondary) transition-colors hover:text-(--text-accent)"
          >
            <Icon name="mail" className="h-5 w-5 shrink-0 text-(--text-accent)" />
            {CONTACT.email}
          </a>
        </li>
      </ul>

      <p className="mt-auto pt-6 text-(length:--text-sm) text-(--text-secondary)">
        {t('contactDetails.weekdays')}: {CONTACT.hours.weekdays}
      </p>
    </Tile>
  )
}
