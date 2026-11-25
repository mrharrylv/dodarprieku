/**
 * Fills an in-memory repository and storage for the local dev server: six
 * approved charities, two pending applications, an admin and one charity
 * account, a few pledges, and the snapshot.
 */
import { needKey } from '../../../shared/src/catalog'
import type { CharityProfile } from '../../../shared/src/contracts'
import { validateProfile } from '../../../shared/src/validate'
import { hashPassword } from '../auth/password'
import type { Deps } from '../deps'
import { publishSnapshot } from '../domain/effects'
import { claimUniqueSlug } from '../domain/slug'
import { uploadKey } from '../domain/upload'
import type { CharityStatus } from '../../../shared/src/contracts'
import { CACHE_IMMUTABLE, mediaObjectKey } from '../storage/types'
import { solidPng } from './png'
import { APPROVED_SAMPLES, PENDING_SAMPLES, type Sample } from './sample-data'

export const DEV_PASSWORD = 'dev-password-123'
export const DEV_ADMIN_EMAIL = 'admin@example.com'
export const DEV_CHARITY_EMAIL = 'charity@example.com'

const PHOTO_SIZE = { width: 800, height: 500 } as const

const toProfile = (s: Sample, i: number, photo: string): CharityProfile => {
  const result = validateProfile({
    organization: {
      name: s.name, legalName: s.legalName, regNumber: s.regNumber, legalForm: s.legalForm,
      publicBenefit: s.legalForm !== 'pasvaldibas-iestade',
      email: `info@${s.slugHint}.example.com`, phone: `+371 2000000${i}`,
      website: `https://${s.slugHint}.example.com`,
    },
    contactPerson: { firstName: 'Anna', lastName: 'Bērziņa', email: `anna@${s.slugHint}.example.com`, phone: `+371 2100000${i}` },
    address: { street: s.street, city: s.city, postalCode: s.postalCode },
    location: { lat: s.lat, lng: s.lng },
    category: s.category,
    description: s.description,
    photos: [photo],
    needs: s.needs,
    delivery: s.delivery,
    sponsors: s.sponsors,
  })
  if (!result.ok) throw new Error(`sample "${s.name}" is invalid: ${JSON.stringify(result.fields)}`)
  return result.value
}

const addCharity = async (deps: Deps, s: Sample, i: number, status: CharityStatus, accountEmail: string) => {
  const id = `dev-${String(i + 1).padStart(4, '0')}`
  const photo = uploadKey(deps.now(), `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, 'image/png')
  await deps.storage.put(mediaObjectKey(photo), {
    body: solidPng(PHOTO_SIZE.width, PHOTO_SIZE.height, s.colour),
    contentType: 'image/png',
    cacheControl: CACHE_IMMUTABLE,
  })
  const profile = toProfile(s, i, photo)
  const slug = await claimUniqueSlug(deps.repo, profile.organization.name, id, () => id)
  const at = new Date(deps.now().getTime() - (10 - i) * 86_400_000).toISOString()
  await deps.repo.createCharity({
    id, status, slug, profile, accountEmail, views: status === 'approved' ? 40 + i * 7 : 0, pledges: 0,
    createdAt: at, updatedAt: at, ...(status === 'approved' ? { publishedAt: at } : {}),
  })
  return { id, profile }
}

const addPledges = async (deps: Deps, charityId: string, profile: CharityProfile): Promise<void> => {
  const keys = profile.needs.map((n, i) => needKey(n, i))
  const people = [
    { name: 'Jānis', email: 'janis@example.com' },
    { name: undefined, email: undefined },
    { name: 'Līga un Pēteris', email: undefined },
  ]
  for (const [i, person] of people.entries()) {
    await deps.repo.recordPledge({
      id: `${charityId}-p${i}`,
      charityId,
      needs: keys.slice(0, i + 1),
      anonymous: person.name === undefined,
      ...(person.name ? { name: person.name } : {}),
      ...(person.email ? { email: person.email } : {}),
      createdAt: new Date(deps.now().getTime() - (i + 1) * 3_600_000).toISOString(),
    })
  }
}

export const seedDev = async (deps: Deps): Promise<void> => {
  const now = deps.now().toISOString()
  const passwordHash = await hashPassword(DEV_PASSWORD)
  const approved = []
  for (const [i, s] of APPROVED_SAMPLES.entries()) {
    const email = i === 0 ? DEV_CHARITY_EMAIL : `konts@${s.slugHint}.example.com`
    approved.push(await addCharity(deps, s, i, 'approved', email))
  }
  for (const [j, s] of PENDING_SAMPLES.entries()) {
    await addCharity(deps, s, APPROVED_SAMPLES.length + j, 'pending', `konts@${s.slugHint}.example.com`)
  }
  const first = approved[0]
  if (first) {
    await addPledges(deps, first.id, first.profile)
    await deps.repo.upsertSubscriber({ email: 'janis@example.com', name: 'Jānis', charityId: first.id, consentAt: now, source: 'pledge' })
    await deps.repo.putAccount({
      email: DEV_CHARITY_EMAIL, role: 'charity', charityId: first.id, passwordHash, sessionVersion: 0, createdAt: now, updatedAt: now,
    })
  }
  await deps.repo.putAccount({ email: DEV_ADMIN_EMAIL, role: 'admin', passwordHash, sessionVersion: 0, createdAt: now, updatedAt: now })
  await publishSnapshot(deps, deps.log)
}
