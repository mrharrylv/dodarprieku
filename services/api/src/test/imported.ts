/** A valid imported charity, as the converter writes one. */
import type { ImportedCharity } from '../domain/imported'

export const SOURCE = 'import:charity-map-2026-11-25'

export const importedItem = (n: number, over: Partial<ImportedCharity> = {}): ImportedCharity => ({
  id: `imp-L${String(n).padStart(4, '0')}`,
  slug: `dienas-centrs-${n}`,
  source: SOURCE,
  profile: {
    organization: {
      name: `Dienas centrs ${n}`, legalName: 'Rīgas Sociālais dienests', regNumber: '', legalForm: 'pasvaldibas-iestade',
      publicBenefit: false, email: '', phone: '+371 67000000',
    },
    contactPerson: { firstName: 'Nav norādīts', lastName: '', email: '', phone: '' },
    address: { street: `Iela ${n}`, city: 'Rīga', postalCode: 'LV-1013' },
    location: { lat: 56.95, lng: 24.1 },
    category: 'cits',
    description: 'Dienas centrs, Rīga. Dati no publiskajiem reģistriem; iestāde savu profilu vēl nav papildinājusi.',
    photos: [],
    needs: [],
    delivery: { parcelLockers: [], inPerson: { address: `Iela ${n}, Rīga, LV-1013` } },
    sponsors: [],
  },
  ...over,
})
