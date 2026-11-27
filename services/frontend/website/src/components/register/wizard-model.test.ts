import { afterEach, describe, expect, it, vi } from 'vitest'

import { STORAGE_KEYS } from '@/config/site'
import { VALID_FORM } from '@/components/profile-editor/fixtures'
import { clearDraft, isRegisterDraft, readDraft, writeDraft } from './draft-storage'
import { REVIEW_STEP, clampStep, mapSubmitErrors, sectionsOfStep, validateReview } from './wizard-steps'

describe('wizard-steps', () => {
  it('maps each step to its section, and the review to none', () => {
    expect(sectionsOfStep(0)).toEqual(['organization'])
    expect(sectionsOfStep(4)).toEqual(['delivery'])
    expect(sectionsOfStep(REVIEW_STEP)).toEqual([])
    expect(sectionsOfStep(99)).toEqual([])
  })

  it('clamps a step into range', () => {
    expect(clampStep(-3)).toBe(0)
    expect(clampStep(2.7)).toBe(2)
    expect(clampStep(40)).toBe(REVIEW_STEP)
  })

  it('checks the login email and the terms', () => {
    expect(validateReview({ accountEmail: '', acceptTerms: false })).toEqual({ accountEmail: 'required', acceptTerms: 'required' })
    expect(validateReview({ accountEmail: 'nav-epasts', acceptTerms: true })).toEqual({ accountEmail: 'invalid' })
    expect(validateReview({ accountEmail: ' a@b.lv ', acceptTerms: true })).toEqual({})
  })

  it('maps API errors back to the earliest step and strips the prefix', () => {
    expect(mapSubmitErrors({ 'profile.needs': 'required', 'profile.address.city': 'required', website: 'invalid' })).toEqual({
      errors: { needs: 'required', 'address.city': 'required' },
      step: 2,
    })
    expect(mapSubmitErrors({ accountEmail: 'invalid' }).step).toBe(REVIEW_STEP)
    expect(mapSubmitErrors({}).step).toBe(REVIEW_STEP)
  })
})

describe('draft-storage', () => {
  afterEach(() => window.sessionStorage.clear())
  const draft = { version: 1 as const, step: 3, form: VALID_FORM, accountEmail: 'a@b.lv' }

  it('writes, reads back and clears the draft', () => {
    expect(writeDraft(draft)).toBe(true)
    expect(window.sessionStorage.getItem(STORAGE_KEYS.registerDraft)).not.toBeNull()
    expect(readDraft()).toEqual(draft)
    clearDraft()
    expect(readDraft()).toBeNull()
  })

  it('ignores a draft of another shape, or one that is not JSON', () => {
    window.sessionStorage.setItem(STORAGE_KEYS.registerDraft, '{"version":1,"step":2,"form":{}}')
    expect(readDraft()).toBeNull()
    window.sessionStorage.setItem(STORAGE_KEYS.registerDraft, 'nope{')
    expect(readDraft()).toBeNull()
  })

  it('checks every part of the form', () => {
    expect(isRegisterDraft(draft)).toBe(true)
    expect(isRegisterDraft({ ...draft, step: -1 })).toBe(false)
    expect(isRegisterDraft({ ...draft, version: 2 })).toBe(false)
    expect(isRegisterDraft({ ...draft, form: { ...VALID_FORM, location: { lat: '1' } } })).toBe(false)
    expect(isRegisterDraft({ ...draft, form: { ...VALID_FORM, needs: [{ itemId: 'a' }] } })).toBe(false)
    expect(isRegisterDraft({ ...draft, form: { ...VALID_FORM, delivery: { ...VALID_FORM.delivery, post: null } } })).toBe(false)
    expect(isRegisterDraft({ ...draft, form: { ...VALID_FORM, location: null } })).toBe(true)
    // A category the catalog no longer has would throw in NeedsSection on render (F1).
    expect(isRegisterDraft({ ...draft, form: { ...VALID_FORM, category: 'animal-shelter' } })).toBe(false)
    expect(isRegisterDraft({ ...draft, form: { ...VALID_FORM, category: '', needs: [] } })).toBe(true)
  })

  it('survives storage that throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(writeDraft(draft)).toBe(false)
    expect(readDraft()).toBeNull()
    expect(() => clearDraft()).not.toThrow()
  })
})
