import { fireEvent, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { LIMITS } from '@shared/contracts'

import { fail, mockApi, ok } from '@/components/profile-editor/fetch-mock'
import { renderWithProviders } from '@/test/render'
import { PhotoUploader } from './PhotoUploader'

const resizeImage = vi.hoisted(() => vi.fn())
vi.mock('@/lib/image-resize', () => ({ resizeImage }))

const harness = (initial: readonly string[]) => {
  const seen = { photos: initial }
  const Harness = () => {
    const [photos, setPhotos] = useState(initial)
    seen.photos = photos
    return <PhotoUploader photos={photos} onChange={(fn) => setPhotos((p) => fn(p))} />
  }
  renderWithProviders(<Harness />)
  return seen
}

const drop = (files: File[]) => {
  const zone = screen.getByText('Ievelciet attēlus šeit').parentElement as HTMLElement
  fireEvent.dragOver(zone)
  fireEvent.drop(zone, { dataTransfer: { files } })
}

describe('PhotoUploader', () => {
  it('uploads dropped files, each on its own, and shows the failures', async () => {
    resizeImage.mockImplementation(async (file: File) =>
      file.name === 'pdf.pdf'
        ? { ok: false, error: 'unsupported' }
        : { ok: true, image: { contentType: 'image/webp', dataBase64: 'AA==', bytes: 1, width: 1, height: 1 } })
    let n = 0
    mockApi({ 'POST /api/uploads': () => ok({ key: `uploads/2026/11/photo000${n++}.webp`, url: '/media/x' }) })
    const seen = harness([])
    drop([new File(['a'], 'a.jpg', { type: 'image/jpeg' }), new File(['b'], 'pdf.pdf', { type: 'application/pdf' })])
    expect(await screen.findByRole('img', { name: '1. fotogrāfija' })).toBeInTheDocument()
    expect(await screen.findByText(/Šis faila veids netiek atbalstīts/)).toBeInTheDocument()
    expect(seen.photos).toEqual(['uploads/2026/11/photo0000.webp'])
    expect(screen.getByText('Titulbilde')).toBeInTheDocument()
  })

  it('makes a photo the cover and removes one', () => {
    const seen = harness(['uploads/2026/11/aaaaaaaa.webp', 'uploads/2026/11/bbbbbbbb.webp'])
    fireEvent.click(screen.getByRole('button', { name: 'Padarīt 2. fotogrāfiju par titulbildi' }))
    expect(seen.photos).toEqual(['uploads/2026/11/bbbbbbbb.webp', 'uploads/2026/11/aaaaaaaa.webp'])
    fireEvent.click(screen.getByRole('button', { name: 'Noņemt 1. fotogrāfiju' }))
    expect(seen.photos).toEqual(['uploads/2026/11/aaaaaaaa.webp'])
  })

  it('reports a rate-limited upload', async () => {
    resizeImage.mockResolvedValue({ ok: true, image: { contentType: 'image/jpeg', dataBase64: 'AA==', bytes: 1, width: 1, height: 1 } })
    mockApi({ 'POST /api/uploads': fail(429, 'rate_limited') })
    harness([])
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [new File(['a'], 'a.jpg', { type: 'image/jpeg' })] } })
    expect(await screen.findByText(/augšupielādēts pārāk daudz attēlu/)).toBeInTheDocument()
  })

  it('hides the drop zone once the limit is reached', () => {
    harness(Array.from({ length: LIMITS.maxPhotos }, (_, i) => `uploads/2026/11/full000${i}.webp`))
    expect(screen.queryByText('Ievelciet attēlus šeit')).not.toBeInTheDocument()
    expect(screen.getByText(/Pievienots lielākais iespējamais foto skaits/)).toBeInTheDocument()
  })
})
