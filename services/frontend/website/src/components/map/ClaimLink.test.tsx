import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { PublicCharity } from '@shared/contracts'
import { snapshotFixture } from '@/lib/snapshot.fixtures'
import { renderWithProviders } from '@/test/render'
import { ClaimLink } from './ClaimLink'

const charity = { ...(snapshotFixture.charities[0] as PublicCharity), claimable: true }

describe('ClaimLink', () => {
  it('is the same accent pill as "+ Kļūt par saņēmēju", since it asks for the same thing', () => {
    renderWithProviders(<ClaimLink charity={charity} />)
    const link = screen.getByRole('link', { name: 'Pieprasīt profilu' })
    expect(link).toHaveClass('rounded-full', 'h-11', 'bg-(--fill-accent)', 'text-(--text-on-accent)')
    expect(link).toHaveAttribute('data-dock-trigger', 'register')
  })

  it('is not offered on a charity nobody can claim', () => {
    renderWithProviders(<ClaimLink charity={{ ...charity, claimable: false }} />)
    expect(screen.queryByRole('link', { name: 'Pieprasīt profilu' })).toBeNull()
  })
})
