import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type AlertTone = 'info' | 'success' | 'warning' | 'error'

const TONES: Record<AlertTone, string> = {
  info: 'border-(--color-brand-300) bg-(--color-brand-50) text-(--color-brand-900)',
  success: 'border-(--color-success-500)/40 bg-(--color-success-500)/10 text-(--text-primary)',
  warning: 'border-(--color-warning-500)/50 bg-(--color-warning-500)/10 text-(--text-primary)',
  error: 'border-(--color-danger-500)/40 bg-(--color-danger-500)/10 text-(--text-primary)',
}

/**
 * A message the visitor needs to read.
 *
 * `role` is chosen from the tone, and it matters: `alert` interrupts a screen
 * reader immediately, which is right for a failure someone must act on and
 * wrong for a confirmation: an over-assertive live region talks over whatever
 * the user was reading.
 *
 * Colour is never the only signal. Each tone also carries its own icon and its
 * own heading text, so the meaning survives a monochrome screen and the ~8% of
 * men with a colour vision deficiency.
 */
export const Alert = ({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: AlertTone
  title: string
  children?: ReactNode
  className?: string
}) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    aria-live={tone === 'error' ? 'assertive' : 'polite'}
    className={cn(
      'flex gap-3 rounded-(--radius-md) border p-4',
      TONES[tone],
      className,
    )}
  >
    <AlertIcon tone={tone} />
    <div className="min-w-0">
      <p className="font-medium">{title}</p>
      {children !== undefined && (
        <div className="mt-1 text-(length:--text-sm) opacity-90">{children}</div>
      )}
    </div>
  </div>
)

const PATHS: Record<AlertTone, string> = {
  info: 'M12 8h.01M11 12h1v4h1',
  success: 'm8.5 12.5 2.5 2.5 4.5-5',
  warning: 'M12 8v5m0 3h.01',
  error: 'm9 9 6 6m0-6-6 6',
}

const AlertIcon = ({ tone }: { tone: AlertTone }) => (
  <svg
    className="mt-0.5 h-5 w-5 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="9" />
    <path d={PATHS[tone]} />
  </svg>
)
