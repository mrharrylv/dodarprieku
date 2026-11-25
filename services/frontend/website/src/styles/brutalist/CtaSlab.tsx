import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { HARD_EDGE, NUM } from './marks'

/**
 * The last band on three of the four pages. It takes its strings from whichever
 * namespace the page is already using, because `cta.title` / `cta.body` /
 * `cta.button` exist in home, services and about with the same shape.
 *
 * Left aligned, like everything else. A centred call to action would be the
 * one place this style suddenly behaved like a brochure.
 */
export const CtaSlab = ({
  index,
  title,
  body,
  action,
}: {
  index: string
  title: string
  body: string
  action: string
}) => {
  const { locale } = useLocale()

  return (
    <section className="border-b-4 border-(--border-strong) bg-(--surface-sunken)">
      <Container className="py-14 sm:py-20">
        <div className="flex items-baseline gap-4">
          <span aria-hidden="true" className={NUM}>
            {index}
          </span>
          <h2 className="break-words text-(length:--text-3xl) font-bold uppercase leading-[1.05] tracking-[-0.01em] text-(--text-primary)">
            {title}
          </h2>
        </div>

        <p className="mt-6 max-w-2xl text-(length:--text-lg) text-(--text-secondary)">
          {body}
        </p>

        <div className="mt-9">
          <ButtonLink
            to={localePath(ROUTES.contact, locale)}
            size="lg"
            className={HARD_EDGE}
          >
            {action}
          </ButtonLink>
        </div>
      </Container>
    </section>
  )
}
