import { describe, expect, it } from 'vitest'

import { ROUTES } from '@/config/site'
import { isFullScreenPage } from './full-screen'

describe('isFullScreenPage', () => {
  it.each([ROUTES.home, ROUTES.about, ROUTES.register, ROUTES.account, ROUTES.setPassword, ROUTES.forgotPassword, ROUTES.charity, '/organizacija/ausma', '/konts/'])(
    'is true for the map at %s',
    (path) => {
      expect(isFullScreenPage(path)).toBe(true)
    },
  )

  it.each([ROUTES.privacy, ROUTES.company, '/no-such-page', '/organizacija/a/b', '/konts/nav'])('is false for %s', (path) => {
    expect(isFullScreenPage(path)).toBe(false)
  })
})
