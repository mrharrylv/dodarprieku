import { describe, expect, it } from 'vitest'

import { buildPledge, buildSubscribe, EMPTY_DRAFT, isBot } from './pledge-form'

const KEYS = ['smiltis', 'custom:2']

describe('buildPledge', () => {
  it('accepts an anonymous pledge with nothing else', () => {
    expect(buildPledge(EMPTY_DRAFT, ['smiltis'], KEYS)).toEqual({
      ok: true,
      value: { needs: ['smiltis'], anonymous: true, subscribe: false, consent: false },
    })
  })

  it('drops the name of an anonymous pledge', () => {
    const r = buildPledge({ ...EMPTY_DRAFT, name: 'Slepens' }, ['smiltis'], KEYS)
    expect(r.ok ? r.value.name : 'failed').toBeUndefined()
  })

  it.each([
    [{ ...EMPTY_DRAFT }, [], { needs: 'required' }],
    [{ ...EMPTY_DRAFT }, ['nav-saraksta'], { needs: 'invalid' }],
    [{ ...EMPTY_DRAFT, anonymous: false }, ['smiltis'], { name: 'required' }],
    [{ ...EMPTY_DRAFT, anonymous: false, name: 'x'.repeat(81) }, ['smiltis'], { name: 'too_long' }],
    [{ ...EMPTY_DRAFT, email: 'nav-epasts' }, ['smiltis'], { email: 'invalid' }],
    [{ ...EMPTY_DRAFT, email: 'a@b.lv' }, ['smiltis'], { consent: 'required' }],
    [{ ...EMPTY_DRAFT, subscribe: true, consent: true }, ['smiltis'], { email: 'required' }],
    [{ ...EMPTY_DRAFT, message: 'x'.repeat(501) }, ['smiltis'], { message: 'too_long' }],
  ])('refuses %j for %j', (draft, needs, fields) => {
    expect(buildPledge(draft, needs, KEYS)).toEqual({ ok: false, fields: expect.objectContaining(fields) })
  })

  it('normalises the email and flags a filled honeypot', () => {
    const r = buildPledge({ ...EMPTY_DRAFT, email: ' A@B.LV ', consent: true }, ['custom:2'], KEYS)
    expect(r.ok && r.value.email).toBe('a@b.lv')
    const bot = buildPledge({ ...EMPTY_DRAFT, website: 'spam' }, ['smiltis'], KEYS)
    expect(!bot.ok && isBot(bot.fields)).toBe(true)
  })
})

describe('buildSubscribe', () => {
  it('needs an email and consent, and carries the charity', () => {
    expect(buildSubscribe({ email: '', name: '', consent: false, website: '' })).toEqual({
      ok: false,
      fields: { email: 'required', consent: 'required' },
    })
    expect(buildSubscribe({ email: 'a@b.lv', name: 'Ilze', consent: true, website: '' }, 'c1')).toEqual({
      ok: true,
      value: { email: 'a@b.lv', name: 'Ilze', consent: true, charityId: 'c1' },
    })
  })
})
