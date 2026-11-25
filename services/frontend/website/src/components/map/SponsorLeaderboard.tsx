import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import type { SponsorLeaderboardEntry } from '@shared/contracts'
import { mediaUrl, safeHref, topSponsors } from '@/lib/snapshot'

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter((w) => /\p{L}/u.test(w))
    .slice(0, 2)
    .map((w) => w.match(/\p{L}/u)?.[0] ?? '')
    .join('')
    .toUpperCase()

/** "Lielākie atbalstītāji": the companies on the most sponsor walls, top ten. */
/**
 * `titled={false}` leaves the heading out, inside a panel whose own heading
 * already says it.
 */
export const SponsorLeaderboard = ({
  entries,
  headingLevel = 2,
  titled = true,
}: {
  entries: readonly SponsorLeaderboardEntry[]
  headingLevel?: 2 | 3
  titled?: boolean
}) => {
  const { t } = useTranslation('map')
  const { t: tc } = useTranslation('common')
  const headingId = useId()
  const top = topSponsors(entries)
  const Heading = headingLevel === 2 ? 'h2' : 'h3'

  return (
    <section aria-labelledby={titled ? headingId : undefined} className="space-y-3">
      <div>
        {titled && (
          <Heading id={headingId} className="text-(length:--text-lg) font-semibold text-(--text-primary)">
            {t('leaderboard.title')}
          </Heading>
        )}
        <p className="text-(length:--text-sm) text-(--text-secondary)">{t('leaderboard.intro')}</p>
      </div>
      {top.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--text-muted)">{t('leaderboard.empty')}</p>
      ) : (
        <ol className="space-y-1.5">
          {top.map((entry, index) => {
            const logo = mediaUrl(entry.logo)
            const href = safeHref(entry.url)
            const body = (
              <>
                <span className="w-6 shrink-0 text-center text-(length:--text-sm) font-semibold text-(--text-muted) tabular-nums">
                  <span className="sr-only">{t('leaderboard.rank', { rank: index + 1 })}</span>
                  <span aria-hidden="true">{index + 1}</span>
                </span>
                {logo !== undefined ? (
                  <img src={logo} alt={t('leaderboard.logoAlt', { name: entry.name })} loading="lazy" referrerPolicy="no-referrer" className="h-10 w-10 shrink-0 rounded-(--radius-md) bg-(--surface-raised) object-contain p-1 shadow-(--shadow-subtle)" />
                ) : (
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-(--radius-md) bg-(--surface-accent-soft) text-(length:--text-sm) font-semibold text-(--text-accent)">
                    {initials(entry.name)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-(--text-primary)">{entry.name}</span>
                  <span className="block text-(length:--text-xs) text-(--text-secondary)">
                    {t('leaderboard.charities', { count: entry.charities })}
                  </span>
                </span>
              </>
            )
            return (
              <li key={`${entry.name}-${index}`}>
                {href !== undefined ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-3 rounded-(--radius-md) p-1.5 hover:bg-(--surface-sunken) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)">
                    {body}
                    <span className="sr-only">{tc('a11y.opensInNewTab')}</span>
                  </a>
                ) : (
                  <div className="flex min-h-11 items-center gap-3 p-1.5">{body}</div>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
