import { Container } from '@/components/ui/Container'

type PageIntroProps = {
  /** The section marker above the title, the way a magazine labels a page. */
  kicker: string
  title: string
  subtitle: string
}

/**
 * The top of every page except home: a kicker on a hairline, then the only
 * `h1` on the page, then one paragraph held to a readable measure.
 *
 * The measures are set in `ch` so they track the font size rather than the
 * viewport: a headline stays at roughly eighteen characters a line whether the
 * clamp has it at 2.25rem or 3.25rem.
 */
export const PageIntro = ({ kicker, title, subtitle }: PageIntroProps) => (
  <section className="border-b border-(--border-subtle)">
    <Container className="py-12 sm:py-16">
      <div className="flex items-center gap-4">
        <p className="text-(length:--text-xs) uppercase tracking-[0.24em] text-(--text-muted)">
          {kicker}
        </p>
        <span aria-hidden="true" className="h-px flex-1 bg-(--border-subtle)" />
      </div>

      <h1 className="mt-8 max-w-[18ch] break-words font-(family-name:--font-display) text-(length:--text-4xl) font-semibold leading-[1.02] tracking-[-0.035em] text-(--text-primary) text-balance">
        {title}
      </h1>

      <p className="mt-6 max-w-[52ch] text-(length:--text-lg) leading-relaxed text-(--text-secondary)">
        {subtitle}
      </p>
    </Container>
  </section>
)
