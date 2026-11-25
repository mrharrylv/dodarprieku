import type { AdminCharityDetail, AdminCharitySummary, CharityProfile, Me } from '@shared/contracts'

export const ADMIN: Me = { email: 'admin@example.com', role: 'admin' }

export const profile = (over: Partial<CharityProfile> = {}): CharityProfile => ({
  organization: {
    name: 'Patversme Ulubele',
    legalName: 'Biedrība "Ulubele"',
    regNumber: '40008012345',
    legalForm: 'biedriba',
    publicBenefit: true,
    email: 'info@ulubele.example',
    phone: '+371 26000001',
    website: 'https://ulubele.example',
  },
  contactPerson: { firstName: 'Anna', lastName: 'Bērziņa', email: 'anna@ulubele.example', phone: '+371 26000002' },
  address: { street: 'Ulubeles iela 1', city: 'Ādaži', postalCode: 'LV-2164' },
  location: { lat: 57.07, lng: 24.32 },
  category: 'dzivnieku-patversme',
  description: 'Mēs rūpējamies par suņiem un kaķiem.',
  photos: ['uploads/2026/11/photo-aaaa1111.webp', 'uploads/2026/11/photo-bbbb2222.webp'],
  logo: 'uploads/2026/11/logo-cccc3333.png',
  needs: [
    { itemId: 'sausa-bariba-suniem', urgent: true, note: 'Lielo šķirņu' },
    { itemId: 'custom', customLabel: 'Kaķu mājiņas', urgent: false },
  ],
  delivery: {
    inPerson: { address: 'Ulubeles iela 1, Ādaži', hours: '10:00-17:00' },
    parcelLockers: [{ provider: 'omniva', lockerId: 'om-1', name: 'Ādažu Maxima', address: 'Gaujas iela 13' }],
  },
  sponsors: [{ name: 'SIA Barība', url: 'https://bariba.example' }],
  ...over,
})

export const summary = (over: Partial<AdminCharitySummary> = {}): AdminCharitySummary => ({
  id: 'c1',
  slug: 'patversme-ulubele',
  name: 'Patversme Ulubele',
  category: 'dzivnieku-patversme',
  city: 'Ādaži',
  status: 'approved',
  hasPendingUpdate: false,
  accountEmail: 'anna@ulubele.example',
  passwordSet: true,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-10T10:00:00.000Z',
  views: 10,
  pledges: 2,
  ...over,
})

export const detail = (over: Partial<AdminCharityDetail> = {}): AdminCharityDetail => ({
  ...summary(),
  profile: profile(),
  ...over,
})
