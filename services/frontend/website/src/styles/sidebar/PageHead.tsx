import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { Container } from '@/components/ui/Container'

/**
 * The title bar every page opens with: a label, the page's only `<h1>`, one
 * paragraph, and whatever actions belong there.
 *
 * It sits on `--surface-raised` against the sunken canvas below, so the
 * content column starts with a distinct header block the way an application
 * screen does, rather than with a full-bleed hero.
 *
 * The heading stays at `--text-4xl` on every page, home included. The column
 * here is already narrower than a full-width layout by the width of the rail,
 * and a display size that has to wrap three times stops reading as confident.
 */
export const PageHead = ({
  label,
  title,
  subtitle,
  hero = false,
  children,
}: {
  label: string
  title: string
  subtitle: string
  /** Roomier padding and a faint dot grid. The home page only. */
  hero?: boolean
  children?: ReactNode
}) => (
  <div className="relative overflow-hidden border-b border-(--border-subtle) bg-(--surface-raised)">
    {hero && (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-dot-grid text-(--border-strong) opacity-50"
      />
    )}

    <Container className={cn('relative', hero ? 'py-12 sm:py-16' : 'py-8 sm:py-11')}>
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-(--fill-accent)" />
        <p className="text-(length:--text-xs) font-semibold uppercase tracking-[0.18em] text-(--text-muted)">
          {label}
        </p>
      </div>

      <h1 className="mt-4 max-w-3xl text-(length:--text-4xl) text-(--text-primary)">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-(length:--text-lg) text-(--text-secondary)">
        {subtitle}
      </p>

      {children !== undefined && (
        <div className="mt-7 flex flex-wrap items-center gap-3">{children}</div>
      )}
    </Container>
  </div>
)
