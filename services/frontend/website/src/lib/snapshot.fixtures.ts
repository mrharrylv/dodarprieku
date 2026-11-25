/**
 * Test data: a small, valid public snapshot. Used by the tests of the map,
 * the charity page and the snapshot helpers; never by the site itself.
 */
import { vi } from 'vitest'

import type { PublicCharity, PublicSnapshot } from '@shared/contracts'

export const PHOTO_KEY = 'uploads/2026/11/abcdef12.webp'
export const LOGO_KEY = 'uploads/2026/11/logo0001.png'

export const shelter: PublicCharity = {
  id: 'c-ulubele',
  slug: 'ulubele',
  publishedAt: '2026-11-01T10:00:00.000Z',
  profile: {
    organization: {
      name: 'Dzīvnieku patversme Ulubele',
      legalName: 'Biedrība "Ulubele"',
      regNumber: '40008000000',
      legalForm: 'biedriba',
      publicBenefit: true,
      email: 'info@ulubele.test',
      phone: '+371 2000 0001',
      website: 'https://ulubele.test',
      facebook: 'javascript:alert(1)',
    },
    address: { street: 'Ulubeles iela 1', city: 'Rīga', postalCode: 'LV-1010' },
    location: { lat: 56.95, lng: 24.1 },
    category: 'dzivnieku-patversme',
    description: 'Mēs rūpējamies par suņiem un kaķiem.',
    photos: [PHOTO_KEY, 'uploads/2026/11/abcdef13.jpg'],
    logo: LOGO_KEY,
    needs: [
      { itemId: 'sausa-bariba-suniem', urgent: false, note: 'tikai bez graudiem' },
      { itemId: 'smiltis', urgent: true },
      { itemId: 'custom', customLabel: 'Suņu būdas', urgent: false },
    ],
    delivery: {
      inPerson: { address: 'Ulubeles iela 1, Rīga', hours: '10:00-18:00' },
      parcelLockers: [{ provider: 'omniva', name: 'Omniva Rimi Ulubele', address: 'Ulubeles iela 3, Rīga' }],
      post: { address: 'Pasta kaste 12, Rīga, LV-1010' },
    },
    sponsors: [{ name: 'SIA Labie', url: 'https://labie.test', logo: LOGO_KEY }, { name: 'AS Bez saites' }],
  },
}

export const childrenHome: PublicCharity = {
  id: 'c-cesis',
  slug: 'cesu-bernu-nams',
  publishedAt: '2026-11-02T10:00:00.000Z',
  profile: {
    organization: {
      name: 'Cēsu bērnu nams',
      legalName: 'Cēsu bērnu nams',
      regNumber: '90000000000',
      legalForm: 'pasvaldibas-iestade',
      publicBenefit: false,
      email: '',
      phone: '',
    },
    address: { street: 'Rīgas iela 5', city: 'Cēsis', postalCode: '' },
    location: { lat: 57.31, lng: 25.27 },
    category: 'bernu-nams',
    description: '',
    photos: [],
    needs: [],
    delivery: { parcelLockers: [] },
    sponsors: [],
  },
}

export const snapshotFixture: PublicSnapshot = {
  generatedAt: '2026-11-20T08:00:00.000Z',
  charities: [shelter, childrenHome],
  sponsorLeaderboard: [
    { name: 'SIA Mazie', charities: 1 },
    { name: 'SIA Labie', url: 'https://labie.test', logo: LOGO_KEY, charities: 3 },
    { name: 'AS Bez saites', charities: 2 },
  ],
}

/** A fetch that answers every URL from `routes`, by path, as JSON. */
export const fakeFetch = (routes: Record<string, { status?: number; body: unknown } | (() => Promise<Response>)>) =>
  vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
    const route = routes[url]
    if (route === undefined) return new Response('{}', { status: 404 })
    if (typeof route === 'function') return route()
    return new Response(JSON.stringify(route.body), { status: route.status ?? 200, headers: { 'Content-Type': 'application/json' } })
  })
