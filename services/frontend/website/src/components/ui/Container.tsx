import type { ElementType, ReactNode } from 'react'

import { cn } from '@/lib/cn'

type Width = 'content' | 'prose' | 'full'

const WIDTHS: Record<Width, string> = {
  content: 'max-w-(--container-content)',
  prose: 'max-w-(--container-prose)',
  full: 'max-w-none',
}

/**
 * Horizontal gutter and max width. Every full-width band on the site wraps its
 * contents in one of these, so the text column lines up from section to section.
 */
export const Container = ({
  as: Tag = 'div',
  width = 'content',
  className,
  children,
}: {
  as?: ElementType
  width?: Width
  className?: string
  children: ReactNode
}) => (
  <Tag className={cn('mx-auto w-full px-5 sm:px-8', WIDTHS[width], className)}>
    {children}
  </Tag>
)
