import { useTranslation } from 'react-i18next'

import type { PublicCharity } from '@shared/contracts'
import { safeHref } from '@/lib/snapshot'
import { Icon, type IconName } from '@/components/ui/Icon'
import { SectionCard } from './SectionCard'

interface Row {
  readonly key: string
  readonly icon: IconName
  readonly label: string
  readonly text: string
  readonly href: string
  readonly external: boolean
}

const display = (url: string): string => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

/** The charity's public contacts: only what it chose to publish, every one a link. */
export const CharityContacts = ({ charity, compact = false }: { charity: PublicCharity; compact?: boolean }) => {
  const { t } = useTranslation('charity')
  const { t: tc } = useTranslation('common')
  const org = charity.profile.organization
  const web = (key: 'website' | 'facebook' | 'instagram', icon: IconName): Row[] => {
    const href = safeHref(org[key])
    return href === undefined ? [] : [{ key, icon, label: t(`contacts.${key}`), text: display(href), href, external: true }]
  }
  const rows: readonly Row[] = [
    ...(org.email !== '' ? [{ key: 'email', icon: 'mail' as const, label: t('contacts.email'), text: org.email, href: `mailto:${org.email}`, external: false }] : []),
    ...(org.phone !== ''
      ? [{ key: 'phone', icon: 'phone' as const, label: t('contacts.phone'), text: org.phone, href: `tel:${org.phone.replace(/[^+\d]/g, '')}`, external: false }]
      : []),
    ...web('website', 'arrowRight'),
    ...web('facebook', 'arrowRight'),
    ...web('instagram', 'arrowRight'),
  ]

  if (compact && rows.length === 0) return null

  return (
    <SectionCard title={t('contacts.title')} compact={compact}>
      <dl className="space-y-3">
        {rows.map((row) => (
          <div key={row.key} className="flex items-start gap-3">
            <span aria-hidden="true" className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--surface-accent-soft) text-(--text-accent)">
              <Icon name={row.icon} />
            </span>
            <div className="min-w-0">
              <dt className="text-(length:--text-xs) text-(--text-muted)">{row.label}</dt>
              <dd>
                <a
                  href={row.href}
                  className="break-words font-medium text-(--text-primary) underline-offset-4 hover:text-(--text-accent) hover:underline"
                  {...(row.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {row.text}
                  {row.external && <span className="sr-only"> {tc('a11y.opensInNewTab')}</span>}
                </a>
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </SectionCard>
  )
}
