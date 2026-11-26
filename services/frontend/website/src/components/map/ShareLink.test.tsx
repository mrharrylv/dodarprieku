import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { ShareLink } from './ShareLink'

describe('ShareLink', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('copies the absolute address that opens this card expanded', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    renderWithProviders(<ShareLink slug="ulubele" />)
    fireEvent.click(screen.getByRole('button', { name: 'Kopēt saiti uz šo organizāciju' }))
    expect(await screen.findByText('Saite nokopēta')).toBeInTheDocument()
    const copied = String(writeText.mock.calls[0]?.[0])
    expect(copied).toMatch(/^https?:\/\/[^/]+\/organizacija\/ulubele\?vajadzibas=1$/)
  })

  it('says what to do when the browser will not copy', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    renderWithProviders(<ShareLink slug="ulubele" />)
    fireEvent.click(screen.getByRole('button', { name: 'Kopēt saiti uz šo organizāciju' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Nokopējiet adresi no pārlūka adreses joslas.')
  })
})
