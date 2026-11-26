import { flightKey } from './useCharityPopup'

describe('flightKey', () => {
  // A fly-to planned for the small card must not stop the expanded card from
  // moving its pin down: a shared ?vajadzibas=1 link otherwise opened the tall
  // card under the top bar (live, 2026-11-26).
  it('tells the small and the expanded card of one charity apart', () => {
    expect(flightKey('c1', false)).not.toBe(flightKey('c1', true))
    expect(flightKey('c1', true)).toBe(flightKey('c1', true))
    expect(flightKey('c1', true)).not.toBe(flightKey('c2', true))
  })
})
