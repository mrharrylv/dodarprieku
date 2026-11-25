import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

type PanelTone = 'page' | 'sunken' | 'inverted'

const TONES: Record<PanelTone, string> = {
  page: 'bg-(--surface-page) text-(--text-primary)',
  sunken: 'bg-(--surface-sunken) text-(--text-primary)',
  inverted: 'bg-(--surface-inverted) text-(--text-inverted)',
}

/**
 * One screen of the deck.
 *
 * `paged-panel` in tokens.css carries the height, the snap alignment and the
 * scroll margin that clears the sticky header. It sets a MIN height, never a
 * fixed one: a screen whose content is taller than the viewport has to grow and
 * scroll normally, or a phone held sideways loses the bottom of every screen.
 *
 * The wide side padding from sm up is the dot indicator's lane. It is applied
 * to both sides so the composition stays optically centred.
 */
export const Panel = ({
  id,
  tone = 'page',
  className,
  children,
}: {
  id: string
  tone?: PanelTone
  className?: string
  children: ReactNode
}) => (
  <section
    id={id}
    className={cn(
      'paged-panel flex flex-col justify-center px-6 py-24 sm:px-16',
      TONES[tone],
      className,
    )}
  >
    <div className="mx-auto w-full max-w-(--container-content) text-center">{children}</div>
  </section>
)
