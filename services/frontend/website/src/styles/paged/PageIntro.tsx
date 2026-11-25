import { cn } from '@/lib/cn'
import { Container } from '@/components/ui/Container'

/**
 * The opening screen of a conventional page: the h1, one paragraph, nothing
 * else.
 *
 * 60dvh rather than a full screen. A page that is meant to be read should show
 * that it continues, and a full-height title on a page with no snapping just
 * costs the reader a scroll.
 *
 * It is a <section>, not a <header>: a <header> here would be a second banner
 * landmark on the page, and the site header already holds that.
 */
export const PageIntro = ({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  className?: string
}) => (
  <section
    className={cn('border-b border-(--border-subtle) bg-(--surface-page)', className)}
  >
    <Container className="flex min-h-[60dvh] flex-col justify-center py-24 text-center">
      {eyebrow ? (
        <p className="text-(length:--text-xs) font-semibold uppercase tracking-[0.32em] text-(--text-accent)">
          {eyebrow}
        </p>
      ) : null}

      <h1 className="mt-6 text-(length:--text-4xl) font-semibold leading-[1.06] tracking-tight text-balance break-words text-(--text-primary)">
        {title}
      </h1>

      {subtitle ? (
        <p className="mx-auto mt-6 max-w-(--container-prose) text-(length:--text-lg) text-(--text-secondary)">
          {subtitle}
        </p>
      ) : null}
    </Container>
  </section>
)
