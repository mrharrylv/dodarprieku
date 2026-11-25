import { ButtonLink } from '@/components/ui/Button'
import { Panel } from './Panel'

/**
 * The closing call to action: a tinted strip, heading and button on one line
 * at sm and up. Every page ends with one.
 *
 * It carries its own `<h2>` and is therefore used in a Band with no head of
 * its own. That is the point of the component: a call to action dropped inside
 * another section's band would have to take an `h3`, and the outline would
 * then claim the contact prompt is a subsection of whatever section happened
 * to precede it.
 *
 * The tint comes from `Panel`'s accent tone rather than from a second copy of
 * the border and background classes, so this style has one definition of what
 * a tinted panel looks like.
 */
export const ActionPanel = ({
  title,
  body,
  action,
  to,
}: {
  title: string
  body: string
  action: string
  to: string
}) => (
  <Panel
    tone="accent"
    className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-6"
  >
    <div className="min-w-0">
      <h2 className="text-(length:--text-xl) text-(--text-primary)">{title}</h2>
      <p className="mt-1 text-(length:--text-sm) text-(--text-secondary)">{body}</p>
    </div>

    <div className="shrink-0">
      <ButtonLink to={to}>{action}</ButtonLink>
    </div>
  </Panel>
)
