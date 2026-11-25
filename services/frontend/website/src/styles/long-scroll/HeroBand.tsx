import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { SECTIONS } from './sections'

/**
 * The opening screen, and the page's only h1.
 *
 * Tall on purpose: a one-page site has to look like it begins somewhere, and
 * a hero that ends halfway down the first screen reads as the top of a list
 * rather than the front of a document. `svh` rather than `vh`, because on iOS
 * `100vh` is the height of the viewport with the browser chrome hidden, so a
 * `vh` hero pushes its own buttons under the address bar.
 *
 * The dot grid is decorative and sits behind everything, faded out at the
 * edges by its own mask so it never ends in a hard line.
 */
export const HeroBand = () => {
  const { t } = useTranslation('home')
  const { locale } = useLocale()

  return (
    <section
      id={SECTIONS.hero}
      className="relative flex min-h-[86svh] items-center overflow-hidden bg-(--surface-page)"
    >
      <div
        aria-hidden="true"
        className="bg-dot-grid animate-drift pointer-events-none absolute inset-0 text-(--border-strong) opacity-40"
      />

      <Container className="relative py-24 sm:py-32">
        <p className="animate-fade-in text-(length:--text-sm) font-medium uppercase tracking-[0.24em] text-(--text-accent)">
          {t('hero.eyebrow')}
        </p>

        {/* A short stagger, in tens of milliseconds. The reduced-motion rule
            in the base layer zeroes the DURATION and not the delay, so these
            stay small enough that nothing is ever waiting on a blank line. */}
        <h1
          style={{ animationDelay: '0.06s' }}
          className="animate-rise-in mt-8 max-w-5xl text-balance text-(length:--text-5xl) font-semibold tracking-tight text-(--text-primary)"
        >
          {t('hero.title')}
        </h1>

        <p
          style={{ animationDelay: '0.12s' }}
          className="animate-rise-in mt-8 max-w-2xl text-(length:--text-lg) text-(--text-secondary)"
        >
          {t('hero.subtitle')}
        </p>

        <div
          style={{ animationDelay: '0.18s' }}
          className="animate-rise-in mt-12 flex flex-wrap gap-4"
        >
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

        {/* A scroll cue, decorative. The page below it is the whole site, so
            the one thing the visitor must understand is that there is more. */}
        <div
          aria-hidden="true"
          className="mt-20 flex items-center gap-4 text-(--text-muted)"
        >
          <span className="h-px w-16 bg-(--border-subtle)" />
          <Icon name="chevronDown" className="h-5 w-5" />
        </div>
      </Container>
    </section>
  )
}
