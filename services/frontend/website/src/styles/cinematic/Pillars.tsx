import { Reveal } from '@/components/ui/Reveal'

export interface Pillar {
  readonly key: string
  readonly title: string
  readonly body: string
}

/**
 * Three (or four) points in a row, with no cards.
 *
 * Cards are the shared primitive and the classic style's signature. Here the
 * separation is a hairline and a lot of air instead, which is what keeps a dark
 * page from turning into a wall of floating boxes.
 *
 * The index numeral is `aria-hidden`: it is typography, not content, and read
 * aloud it prefixes every heading with a number nobody asked for. `<ol>` when
 * the order is part of the meaning, which is the process on the services page,
 * and `<ul>` when it is not.
 */
export const Pillars = ({
  items,
  ordered = false,
}: {
  items: readonly Pillar[]
  ordered?: boolean
}) => {
  const List = ordered ? 'ol' : 'ul'

  return (
    <List className="grid gap-14 sm:grid-cols-2 sm:gap-12 lg:grid-cols-3">
      {items.map((item, index) => (
        <li key={item.key}>
          {/* Later than the band's own heading, and each one after the last, so
              the row assembles left to right instead of flashing in together. */}
          <Reveal delay={0.12 + index * 0.16}>
            <span aria-hidden="true" className="block h-px w-full bg-(--border-subtle)" />
            <span
              aria-hidden="true"
              className="mt-7 block font-(family-name:--font-display) text-(length:--text-xs) font-semibold uppercase tracking-[0.34em] text-(--text-accent)"
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="mt-5 text-(length:--text-2xl) text-(--text-primary)">{item.title}</h3>
            <p className="mt-4 text-(--text-secondary)">{item.body}</p>
          </Reveal>
        </li>
      ))}
    </List>
  )
}
