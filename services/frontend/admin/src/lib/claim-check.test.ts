import { describe, expect, it } from 'vitest'
import { profile } from '../test/fixtures'
import { checkClaim } from './claim-check'

const imported = (email: string, website: string) =>
  profile({ organization: { ...profile().organization, email, website } })

describe('checkClaim', () => {
  it('matches the exact public email, its domain, or the website host', () => {
    expect(checkClaim('Info@Ulubele.lv', imported('info@ulubele.lv', ''))).toEqual({ kind: 'match', via: 'info@ulubele.lv' })
    expect(checkClaim('vadiba@ulubele.lv', imported('info@ulubele.lv', ''))).toEqual({ kind: 'match', via: 'ulubele.lv' })
    expect(checkClaim('a@ulubele.lv', imported('', 'https://www.ulubele.lv/par'))).toEqual({ kind: 'match', via: 'ulubele.lv' })
  })

  it('flags a webmail claimant unless it is the exact public address', () => {
    expect(checkClaim('someone@gmail.com', imported('ulubele@gmail.com', ''))).toEqual({ kind: 'mismatch', claimant: 'gmail.com' })
    expect(checkClaim('ulubele@gmail.com', imported('ulubele@gmail.com', ''))).toMatchObject({ kind: 'match' })
  })

  it('flags another domain, and says when the register gave no contacts to compare', () => {
    expect(checkClaim('a@cits.lv', imported('info@ulubele.lv', 'https://ulubele.lv'))).toEqual({ kind: 'mismatch', claimant: 'cits.lv' })
    expect(checkClaim('a@cits.lv', imported('', ''))).toEqual({ kind: 'no-contacts' })
  })
})
