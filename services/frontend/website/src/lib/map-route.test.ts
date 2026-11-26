import { describe, expect, it } from 'vitest'

import { ROUTES } from '@/config/site'
import { dockPath, isMapPath, mapRouteOf, sameDock, type Dock } from './map-route'

describe('mapRouteOf', () => {
  it('opens nothing on the home page and on the charity shell', () => {
    expect(mapRouteOf('/')).toEqual({ dock: null, info: false, charitySlug: null })
    expect(mapRouteOf(ROUTES.charity)).toEqual({ dock: null, info: false, charitySlug: null })
  })

  it('opens the registration and the account panel with its views', () => {
    expect(mapRouteOf(ROUTES.register).dock).toEqual({ kind: 'register' })
    expect(mapRouteOf(ROUTES.account).dock).toEqual({ kind: 'account', view: 'main' })
    expect(mapRouteOf(`${ROUTES.account}/`).dock).toEqual({ kind: 'account', view: 'main' })
    expect(mapRouteOf(ROUTES.forgotPassword).dock).toEqual({ kind: 'account', view: 'forgot' })
    expect(mapRouteOf(ROUTES.setPassword).dock).toEqual({ kind: 'account', view: 'set-password' })
  })

  it('opens the info panel on the old about page', () => {
    expect(mapRouteOf(ROUTES.about)).toEqual({ dock: null, info: true, charitySlug: null })
  })

  it('reads a charity slug, decoded, and ignores a malformed one', () => {
    expect(mapRouteOf('/organizacija/ausma').charitySlug).toBe('ausma')
    expect(mapRouteOf('/organizacija/%C4%81bele').charitySlug).toBe('ābele')
    expect(mapRouteOf('/organizacija/%E0%A4%A').charitySlug).toBeNull()
    expect(mapRouteOf('/organizacija/a/b').charitySlug).toBeNull()
  })
})

describe('isMapPath', () => {
  it('knows the map from the legal pages', () => {
    expect(isMapPath('/organizacija/ausma')).toBe(true)
    expect(isMapPath(ROUTES.terms)).toBe(false)
  })
})

describe('dockPath and sameDock', () => {
  it.each<[Dock, string]>([
    [{ kind: 'register' }, ROUTES.register],
    [{ kind: 'account', view: 'main' }, ROUTES.account],
    [{ kind: 'account', view: 'forgot' }, ROUTES.forgotPassword],
    [{ kind: 'account', view: 'set-password' }, ROUTES.setPassword],
  ])('round-trips %o', (dock, path) => {
    expect(dockPath(dock)).toBe(path)
    expect(mapRouteOf(path).dock).toEqual(dock)
  })

  it('treats the account views as one panel', () => {
    expect(sameDock({ kind: 'account', view: 'main' }, { kind: 'account', view: 'forgot' })).toBe(true)
    expect(sameDock({ kind: 'register' }, { kind: 'account', view: 'main' })).toBe(false)
    expect(sameDock(null, null)).toBe(true)
  })
})
