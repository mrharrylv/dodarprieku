import { Container } from '@/components/ui/Container'
import { Reveal } from '@/components/ui/Reveal'
import { Wash } from './Decor'

/**
 * The opening band of every page that is not the home page.
 *
 * Shorter than the hero and carrying the page's one `<h1>`. Same wash, at lower
 * opacity: the inside pages are read, not looked at, and a wash at hero
 * strength behind a paragraph of body copy is exactly the decorative contrast
 * failure a dark site is prone to.
 */
export const PageHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <section className="relative isolate overflow-hidden bg-(--surface-page)">
    <Wash className="opacity-60" />

    <Container className="relative py-24 sm:py-32">
      <Reveal delay={0.1}>
        <span aria-hidden="true" className="block h-px w-16 bg-(--fill-accent)" />
      </Reveal>

      <Reveal
        as="h1"
        delay={0.22}
        className="mt-8 max-w-4xl text-balance text-(length:--text-4xl) font-semibold text-(--text-primary)"
      >
        {title}
      </Reveal>

      <Reveal
        as="p"
        delay={0.38}
        className="mt-6 max-w-2xl text-(length:--text-lg) text-(--text-secondary)"
      >
        {subtitle}
      </Reveal>
    </Container>
  </section>
)
