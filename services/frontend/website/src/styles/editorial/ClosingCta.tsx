import { CONTACT, ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'

type ClosingCtaProps = {
  title: string
  body: string
  action: string
}

/**
 * The last thing on every page: the ask, and the two ways to act on it.
 *
 * The phone number is set as large as the heading beside it and is a real
 * `tel:` link, because the visitor who has read to the bottom of a page about
 * a trade usually wants to talk to somebody, and hunting for the number in the
 * colophon is where that intention goes to die.
 */
export const ClosingCta = ({ title, body, action }: ClosingCtaProps) => {
  const { locale } = useLocale()

  return (
    <section className="border-t-2 border-(--border-strong)">
      <Container className="py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-14">
          <div>
            <h2 className="max-w-[18ch] break-words font-(family-name:--font-display) text-(length:--text-3xl) font-semibold leading-[1.05] tracking-[-0.03em] text-(--text-primary)">
              {title}
            </h2>
            <p className="mt-4 max-w-[52ch] leading-relaxed text-(--text-secondary)">{body}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 lg:justify-end">
            <a
              href={`tel:${CONTACT.phoneE164}`}
              className="inline-flex min-h-11 items-center break-words font-(family-name:--font-display) text-(length:--text-2xl) font-semibold tracking-[-0.02em] text-(--text-primary) underline-offset-[6px] transition-colors hover:text-(--text-accent) hover:underline"
            >
              {CONTACT.phone}
            </a>
            <ButtonLink to={localePath(ROUTES.contact, locale)} size="lg">
              {action}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  )
}
