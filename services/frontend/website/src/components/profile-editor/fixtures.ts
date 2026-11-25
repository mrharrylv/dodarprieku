/**
 * Test data shared by the registration and account tests: a form that passes
 * `validateProfile`, and the stored profile it turns into. Not imported by
 * any page.
 */

import type { AccountView, CharityProfile } from '@shared/contracts'

import { EMPTY_FORM, type ProfileForm } from './form-model'

export const PHOTO_KEY = 'uploads/2026/11/abcdef12.webp'
export const PHOTO_KEY_2 = 'uploads/2026/11/12345678.jpg'

export const VALID_FORM: ProfileForm = {
  ...EMPTY_FORM,
  organization: {
    name: 'Patversme Ulubele',
    legalName: 'Biedrība "Ulubele"',
    regNumber: '40008012345',
    legalForm: 'biedriba',
    publicBenefit: true,
    email: 'info@ulubele.lv',
    phone: '+371 26123456',
    website: '',
    facebook: '',
    instagram: '',
  },
  contactPerson: { firstName: 'Anna', lastName: 'Bērziņa', email: 'anna@ulubele.lv', phone: '+371 29123456' },
  address: { street: 'Kalnciema iela 1', city: 'Rīga', postalCode: 'LV-1048' },
  location: { lat: 56.95, lng: 24.1 },
  category: 'dzivnieku-patversme',
  description: 'Mēs rūpējamies par suņiem un kaķiem.',
  photos: [PHOTO_KEY],
  needs: [{ itemId: 'sausa-bariba-suniem', urgent: true, note: 'tikai bez graudiem' }],
  delivery: { ...EMPTY_FORM.delivery, inPerson: { enabled: true, address: 'Kalnciema iela 1, Rīga', hours: '9:00-17:00' } },
}

export const VALID_PROFILE: CharityProfile = {
  organization: {
    name: 'Patversme Ulubele',
    legalName: 'Biedrība "Ulubele"',
    regNumber: '40008012345',
    legalForm: 'biedriba',
    publicBenefit: true,
    email: 'info@ulubele.lv',
    phone: '+371 26123456',
  },
  contactPerson: { firstName: 'Anna', lastName: 'Bērziņa', email: 'anna@ulubele.lv', phone: '+371 29123456' },
  address: { street: 'Kalnciema iela 1', city: 'Rīga', postalCode: 'LV-1048' },
  location: { lat: 56.95, lng: 24.1 },
  category: 'dzivnieku-patversme',
  description: 'Mēs rūpējamies par suņiem un kaķiem.',
  photos: [PHOTO_KEY],
  needs: [
    { itemId: 'sausa-bariba-suniem', urgent: true, note: 'tikai bez graudiem' },
    { itemId: 'custom', customLabel: 'Veļas mašīna', urgent: false },
  ],
  delivery: {
    inPerson: { address: 'Kalnciema iela 1, Rīga', hours: '9:00-17:00' },
    parcelLockers: [{ provider: 'omniva', lockerId: '9595', name: 'Aglonas TOP pakomāts', address: 'Somersētas iela 33, Aglona' }],
  },
  sponsors: [{ name: 'SIA Labie', url: 'https://labie.lv' }],
}

export const ACCOUNT: AccountView = {
  id: 'c1',
  slug: 'patversme-ulubele',
  status: 'approved',
  profile: VALID_PROFILE,
  stats: { views: 1234, pledges: 7, pledgesByNeed: { 'sausa-bariba-suniem': 5, 'custom:1': 2 }, recentSupporters: [], subscribers: 3 },
}
