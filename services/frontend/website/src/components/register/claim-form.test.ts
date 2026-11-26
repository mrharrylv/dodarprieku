import { describe, expect, it } from 'vitest'

import { childrenHome, shelter } from '@/lib/snapshot.fixtures'
import { EMPTY_FORM } from '@/components/profile-editor/form-model'
import { claimForm } from './claim-form'

describe('claimForm', () => {
  it('fills in the public profile and leaves the rest to the claimant', () => {
    const form = claimForm(shelter)
    expect(form.organization).toEqual({
      ...shelter.profile.organization,
      website: 'https://ulubele.test',
      // The fixture's "javascript:" link is not one the form would accept: left out.
      facebook: '',
      instagram: '',
    })
    expect(form.address).toEqual(shelter.profile.address)
    expect(form.location).toEqual(shelter.profile.location)
    expect(form.category).toBe(shelter.profile.category)
    expect(form.contactPerson).toEqual(EMPTY_FORM.contactPerson)
    expect(form.description).toBe('')
    expect(form.needs).toEqual([])
    expect(form.delivery).toEqual(EMPTY_FORM.delivery)
  })

  it('turns missing links into empty fields and never shares objects with the snapshot', () => {
    const form = claimForm(childrenHome)
    expect(form.organization.website).toBe('')
    expect(form.organization.instagram).toBe('')
    expect(form.address).not.toBe(childrenHome.profile.address)
    expect(form.location).not.toBe(childrenHome.profile.location)
  })
})
