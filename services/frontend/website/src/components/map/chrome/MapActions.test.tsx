import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ROUTES } from '@/config/site'
import { SIGNED_IN_HINT, resetSignedIn } from '@/hooks/useSignedIn'
import { fakeFetch } from '@/lib/snapshot.fixtures'
import { renderWithProviders } from '@/test/render'
import { HelpTab } from './InfoTabs'
import { MapActions } from './MapActions'

const ME = '/api/auth/me'
/** A browser that has seen a session: the hint is set, and the API confirms it. */
const signedIn = () => {
  window.localStorage.setItem(SIGNED_IN_HINT, '1')
  vi.stubGlobal('fetch', fakeFetch({ [ME]: { body: { ok: true, data: { email: 'a@b.lv', role: 'charity', charityId: 'c1' } } } }))
}
const anonymous = () => vi.stubGlobal('fetch', fakeFetch({ [ME]: { status: 401, body: { ok: false, error: 'unauthorized' } } }))

describe('"+ Kļūt par saņēmēju" and who sees it', () => {
  afterEach(() => resetSignedIn())

  it('is offered to an anonymous visitor, top right and in the info panel', async () => {
    anonymous()
    renderWithProviders(
      <>
        <MapActions />
        <HelpTab />
      </>,
    )
    expect(await screen.findAllByRole('link', { name: /Kļūt par saņēmēju/ })).toHaveLength(2)
    // No hint, no question: an anonymous visitor's page logs no 401.
    expect(fetch).not.toHaveBeenCalled()
  })

  it('is hidden everywhere from someone logged in', async () => {
    signedIn()
    renderWithProviders(
      <>
        <MapActions />
        <HelpTab />
      </>,
    )
    await waitFor(() => expect(screen.queryAllByRole('link', { name: /Kļūt par saņēmēju/ })).toHaveLength(0))
    // The way into the account stays, on the right where its panel opens.
    expect(screen.getByRole('group', { name: 'Pieteikšanās' })).toContainElement(screen.getAllByRole('link', { name: 'Mans konts' })[0] ?? null)
  })

  it('offers "Mans konts" under it, on the right, to everyone', () => {
    anonymous()
    renderWithProviders(<MapActions />)
    const group = screen.getByRole('group', { name: 'Pieteikšanās' })
    const links = within(group).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['Kļūt par saņēmēju', 'Mans konts'])
    expect(links[1]).toHaveAttribute('href', ROUTES.account)
    expect(links[1]).toHaveAttribute('data-dock-trigger', 'account')
  })

  it('fades out under a docked panel rather than vanishing, out of reach meanwhile', () => {
    anonymous()
    renderWithProviders(<MapActions hidden />)
    const group = screen.getByRole('group', { name: 'Pieteikšanās' })
    expect(group).toHaveAttribute('inert')
    expect(group).toHaveClass('opacity-0', 'transition-opacity')
  })

  it('stacks the two on a phone, so the row stays narrow and clear of the zoom buttons at the bottom right', () => {
    anonymous()
    renderWithProviders(<MapActions />)
    const group = screen.getByRole('group', { name: 'Pieteikšanās' })
    const classes = group.className.split(/\s+/)
    expect(classes).toContain('flex-col')
    expect(classes).not.toContain('justify-center')
  })
})
