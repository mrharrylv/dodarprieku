import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
    // The way into the account stays.
    expect(screen.getByRole('link', { name: /konts|kontā/i })).toBeInTheDocument()
  })

  it('is hidden while a panel is docked', () => {
    anonymous()
    renderWithProviders(<MapActions hidden />)
    expect(screen.queryByRole('link', { name: /Kļūt par saņēmēju/ })).toBeNull()
  })
})
