import { describe, expect, it } from 'vitest'

import { LIMITS, type Need, type Sponsor } from '@shared/contracts'
import { validateProfile } from '@shared/validate'

import { VALID_FORM, VALID_PROFILE } from './fixtures'
import { EMPTY_FORM, addressLine, formToProfileInput, profileToForm } from './form-model'
import {
  addCustomNeed,
  canAddNeed,
  customNeeds,
  isTicked,
  removeNeedAt,
  tickedInGroup,
  toggleNeed,
  updateItem,
  updateNeedAt,
} from './needs-selection'
import { errorKeys, errorsInSection, sectionOf, validateSections, validateWholeForm } from './sections'
import { addSponsor, canAddSponsor, moveSponsor, removeSponsor, updateSponsor } from './sponsors'

describe('form-model', () => {
  it('turns a valid form into a profile the shared validator accepts', () => {
    const result = validateProfile(formToProfileInput(VALID_FORM))
    expect(result.ok).toBe(true)
  })

  it('leaves out switched-off delivery options, an empty logo and a missing pin', () => {
    const input = formToProfileInput({ ...EMPTY_FORM, delivery: { ...EMPTY_FORM.delivery, parcelLockers: [{ provider: 'omniva', name: 'a', address: 'b' }] } })
    expect(input).not.toHaveProperty('logo')
    expect(input).not.toHaveProperty('location')
    expect(input.delivery).toEqual({ parcelLockers: [] })
  })

  it('round-trips a stored profile', () => {
    const form = profileToForm(VALID_PROFILE)
    expect(form.delivery.lockersEnabled).toBe(true)
    expect(form.delivery.dropOff.enabled).toBe(false)
    expect(form.organization.website).toBe('')
    const back = validateProfile(formToProfileInput(form))
    expect(back.ok && back.value).toEqual(VALID_PROFILE)
  })

  it('keeps a stored post address and a logo', () => {
    const form = profileToForm({ ...VALID_PROFILE, logo: 'uploads/2026/11/logo1234.png', delivery: { parcelLockers: [], post: { address: 'Pasts 1' } } })
    expect(form.logo).toBe('uploads/2026/11/logo1234.png')
    expect(form.delivery.post).toEqual({ enabled: true, address: 'Pasts 1' })
    expect(formToProfileInput(form).logo).toBe('uploads/2026/11/logo1234.png')
  })

  it('joins the address into one line, skipping blanks', () => {
    expect(addressLine({ street: ' Iela 1 ', city: '', postalCode: 'LV-1000' })).toBe('Iela 1, LV-1000')
  })
})

describe('sections', () => {
  it('knows which section owns a field path', () => {
    expect(sectionOf('organization.email')).toBe('organization')
    expect(sectionOf('contactPerson.phone')).toBe('organization')
    expect(sectionOf('photos')).toBe('about')
    expect(sectionOf('location')).toBe('location')
    expect(sectionOf('needs.3.note')).toBe('needs')
    expect(sectionOf('delivery')).toBe('delivery')
    expect(sectionOf('sponsors.0.url')).toBe('sponsors')
    expect(sectionOf('accountEmail')).toBeUndefined()
    expect(sectionOf('organizationX')).toBeUndefined()
  })

  it('validates one step at a time', () => {
    const errors = validateSections(EMPTY_FORM, ['organization'])
    expect(errors['organization.name']).toBe('required')
    expect(errors['contactPerson.email']).toBe('required')
    expect(Object.keys(errors).every((path) => sectionOf(path) === 'organization')).toBe(true)
  })

  it('finds nothing wrong in a valid form', () => {
    expect(validateSections(VALID_FORM, ['organization', 'about', 'location', 'needs', 'delivery'])).toEqual({})
  })

  it('reports the first section with a problem', () => {
    const result = validateWholeForm({ ...VALID_FORM, location: null, needs: [] })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.firstSection).toBe('location')
    expect(validateWholeForm(VALID_FORM).ok).toBe(true)
  })

  it('filters errors by section', () => {
    expect(errorsInSection({ 'needs.0.note': 'too_long', 'organization.name': 'required' }, 'needs')).toEqual({ 'needs.0.note': 'too_long' })
  })

  it('builds copy keys from the most specific to the generic', () => {
    expect(errorKeys('needs.12.customLabel', 'required')).toEqual([
      'errors.fields.needs.n.customLabel.required',
      'errors.required',
      'errors.invalid',
    ])
  })
})

describe('needs-selection', () => {
  const base: readonly Need[] = [{ itemId: 'a', urgent: false }]

  it('ticks and unticks a catalog item', () => {
    const ticked = toggleNeed(base, 'b')
    expect(ticked).toEqual([...base, { itemId: 'b', urgent: false }])
    expect(isTicked(ticked, 'b')).toBe(true)
    expect(toggleNeed(ticked, 'a')).toEqual([{ itemId: 'b', urgent: false }])
    expect(base).toHaveLength(1)
  })

  it('never ticks "custom" as a catalog item', () => {
    expect(toggleNeed(base, 'custom')).toBe(base)
    expect(isTicked([{ itemId: 'custom', customLabel: 'x', urgent: false }], 'custom')).toBe(false)
  })

  it('sets a note and the urgent flag', () => {
    const noted = updateItem(base, 'a', { note: 'tikai jauni' })
    expect(updateItem(noted, 'a', { urgent: true })).toEqual([{ itemId: 'a', note: 'tikai jauni', urgent: true }])
    expect(updateItem(base, 'missing', { urgent: true })).toBe(base)
    expect(updateNeedAt(base, 5, { urgent: true })).toBe(base)
  })

  it('adds, lists and removes custom items', () => {
    const added = addCustomNeed(base, '  Veļas mašīna ', ' jauna ')
    expect(added[1]).toEqual({ itemId: 'custom', customLabel: 'Veļas mašīna', note: 'jauna', urgent: false })
    expect(addCustomNeed(base, 'Gulta', '   ')[1]).toEqual({ itemId: 'custom', customLabel: 'Gulta', urgent: false })
    expect(addCustomNeed(base, '   ', 'x')).toBe(base)
    expect(customNeeds(added)).toEqual([{ need: added[1], index: 1 }])
    expect(removeNeedAt(added, 1)).toEqual(base)
  })

  it('stops at the limit', () => {
    const full: Need[] = Array.from({ length: LIMITS.maxNeeds }, (_, i) => ({ itemId: `i${i}`, urgent: false }))
    expect(canAddNeed(full)).toBe(false)
    expect(toggleNeed(full, 'new')).toBe(full)
    expect(addCustomNeed(full, 'x', '')).toBe(full)
    expect(toggleNeed(full, 'i0')).toHaveLength(LIMITS.maxNeeds - 1)
  })

  it('counts the ticked items of a group', () => {
    expect(tickedInGroup([{ itemId: 'a', urgent: false }, { itemId: 'c', urgent: false }], ['a', 'b', 'c'])).toBe(2)
  })
})

describe('sponsors', () => {
  const list: readonly Sponsor[] = [{ name: 'A' }, { name: 'B', url: 'https://b.lv' }, { name: 'C' }]

  it('adds an empty sponsor and stops at the limit', () => {
    expect(addSponsor(list)).toHaveLength(4)
    const full = Array.from({ length: LIMITS.maxSponsors }, (_, i) => ({ name: `S${i}` }))
    expect(canAddSponsor(full)).toBe(false)
    expect(addSponsor(full)).toBe(full)
  })

  it('removes by index', () => {
    expect(removeSponsor(list, 1).map((s) => s.name)).toEqual(['A', 'C'])
  })

  it('updates a field, and drops an emptied url or logo', () => {
    expect(updateSponsor(list, 0, 'name', 'AA')[0]).toEqual({ name: 'AA' })
    expect(updateSponsor(list, 1, 'url', '')[1]).toEqual({ name: 'B' })
    expect(updateSponsor(list, 2, 'logo', 'uploads/2026/11/abcdefgh.png')[2]).toEqual({ name: 'C', logo: 'uploads/2026/11/abcdefgh.png' })
  })

  it('moves up and down, and ignores a move off the end', () => {
    expect(moveSponsor(list, 2, -1).map((s) => s.name)).toEqual(['A', 'C', 'B'])
    expect(moveSponsor(list, 0, 1).map((s) => s.name)).toEqual(['B', 'A', 'C'])
    expect(moveSponsor(list, 0, -1)).toBe(list)
    expect(moveSponsor(list, 2, 1)).toBe(list)
  })
})
