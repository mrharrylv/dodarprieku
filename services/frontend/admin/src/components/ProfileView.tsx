/** Every field of a profile, presented for reading. */
import type { ReactNode } from 'react'
import type { CharityProfile } from '@shared/contracts'
import { fmt, lv } from '../i18n/lv'
import { categoryLabel, legalFormLabel, mediaUrl } from '../lib/format'
import { MapPin } from './MapPin'
import { DeliveryView, NeedsView, SponsorsView } from './ProfileViewLists'
import { Card } from './ui'

type FieldKey = keyof typeof lv.fields

export const Row = ({ label, children }: { readonly label: string; readonly children: ReactNode }) => (
  <div className="grid gap-1 py-2 sm:grid-cols-[12rem_1fr] sm:gap-4">
    <dt className="text-sm text-[var(--text-muted)]">{label}</dt>
    <dd className="min-w-0 break-words text-[var(--text-primary)]">{children}</dd>
  </div>
)

const Value = ({ value }: { readonly value: string | undefined }) =>
  value ? <>{value}</> : <span className="text-[var(--text-muted)]">{lv.app.empty}</span>

const Link = ({ href }: { readonly href: string | undefined }) =>
  href ? (
    <a href={href} target="_blank" rel="noreferrer" className="text-[var(--text-accent)] underline">
      {href}
    </a>
  ) : (
    <Value value={undefined} />
  )

export const Section = ({ title, note, children }: { readonly title: string; readonly note?: string; readonly children: ReactNode }) => (
  <Card>
    <h2 className="text-[length:var(--text-lg)]">{title}</h2>
    {note && <p className="mt-1 text-sm text-[var(--text-muted)]">{note}</p>}
    <div className="mt-3">{children}</div>
  </Card>
)

const f = (key: FieldKey): string => lv.fields[key]

export const ProfileView = ({ profile }: { readonly profile: CharityProfile }) => {
  const o = profile.organization
  const cp = profile.contactPerson
  return (
    <div className="space-y-4">
      <Section title={lv.sections.organization}>
        <dl className="divide-y divide-[var(--border-subtle)]">
          <Row label={f('organization.name')}>{o.name}</Row>
          <Row label={f('organization.legalName')}>{o.legalName}</Row>
          <Row label={f('organization.regNumber')}>{o.regNumber}</Row>
          <Row label={f('organization.legalForm')}>{legalFormLabel(o.legalForm)}</Row>
          <Row label={f('organization.publicBenefit')}>{o.publicBenefit ? lv.app.yes : lv.app.no}</Row>
          <Row label={f('organization.email')}>
            <a href={`mailto:${o.email}`} className="text-[var(--text-accent)] underline">{o.email}</a>
          </Row>
          <Row label={f('organization.phone')}>{o.phone}</Row>
          <Row label={f('organization.website')}><Link href={o.website} /></Row>
          <Row label={f('organization.facebook')}><Link href={o.facebook} /></Row>
          <Row label={f('organization.instagram')}><Link href={o.instagram} /></Row>
        </dl>
      </Section>

      <Section title={lv.sections.contactPerson} note={lv.sections.contactPrivate}>
        <dl className="divide-y divide-[var(--border-subtle)]">
          <Row label={f('contactPerson.firstName')}>{cp.firstName} {cp.lastName}</Row>
          <Row label={f('contactPerson.email')}>
            <a href={`mailto:${cp.email}`} className="text-[var(--text-accent)] underline">{cp.email}</a>
          </Row>
          <Row label={f('contactPerson.phone')}>{cp.phone}</Row>
        </dl>
      </Section>

      <Section title={lv.sections.address}>
        <p className="mb-3">
          {profile.address.street}, {profile.address.city}, {profile.address.postalCode}
        </p>
        <MapPin location={profile.location} />
      </Section>

      <Section title={lv.sections.category}>
        <p className="font-semibold">{categoryLabel(profile.category)}</p>
        <p className="mt-2 whitespace-pre-line text-[var(--text-secondary)]">{profile.description}</p>
      </Section>

      <Section title={lv.sections.media}>
        <MediaView profile={profile} />
      </Section>

      <Section title={lv.sections.needs}>
        <NeedsView profile={profile} />
      </Section>

      <Section title={lv.sections.delivery}>
        <DeliveryView delivery={profile.delivery} />
      </Section>

      <Section title={lv.sections.sponsors}>
        <SponsorsView sponsors={profile.sponsors} />
      </Section>
    </div>
  )
}

const MediaView = ({ profile }: { readonly profile: CharityProfile }) => {
  const name = profile.organization.name
  return (
    <div className="space-y-4">
      {profile.logo && (
        <img src={mediaUrl(profile.logo)} alt={fmt(lv.view.logoAlt, { name })} className="size-24 rounded-[var(--radius-md)] border border-[var(--border-subtle)] object-contain" />
      )}
      {profile.photos.length === 0 ? (
        <p className="text-[var(--text-muted)]">{lv.view.noPhotos}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {profile.photos.map((key, i) => (
            <li key={key} className="relative">
              <img
                src={mediaUrl(key)}
                alt={fmt(lv.view.photoAlt, { name, n: i + 1 })}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-[var(--radius-md)] object-cover"
              />
              {i === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-semibold">
                  {lv.view.cover}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
