import { describe, expect, it } from 'vitest'

import { ROUTES } from '@/config/site'
import { isFullScreenPage } from './full-screen'

describe('isFullScreenPage', () => {
  it('is true for the map, the home page', () => {
    expect(isFullScreenPage(ROUTES.home)).toBe(true)
  })

  it.each([ROUTES.about, ROUTES.register, ROUTES.account, ROUTES.privacy, '/organizacija/ausma', '/no-such-page'])(
    'is false for %s',
    (path) => {
      expect(isFullScreenPage(path)).toBe(false)
    },
  )
})
