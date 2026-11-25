import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/render'

import { Photo } from './Photo'

describe('Photo', () => {
  it('renders the image with its alt text, lazy and not draggable', () => {
    renderWithProviders(<Photo src="/a.jpg" alt="A welder at work" />)
    const image = screen.getByAltText('A welder at work')
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('draggable', 'false')
    expect(image).toHaveAttribute('referrerpolicy', 'no-referrer')
  })

  it('loads the first-screen photo eagerly', () => {
    renderWithProviders(<Photo src="/a.jpg" alt="Hero" priority />)
    expect(screen.getByAltText('Hero')).toHaveAttribute('loading', 'eager')
  })

  it('shimmers until the file arrives, then stops', () => {
    renderWithProviders(<Photo src="/a.jpg" alt="Shed" />)
    const image = screen.getByAltText('Shed')
    const frame = image.parentElement
    expect(frame).toHaveAttribute('data-loading')
    fireEvent.load(image)
    expect(frame).toHaveAttribute('data-loaded')
    expect(frame).not.toHaveAttribute('data-loading')
  })

  it('ends the shimmer when the file fails too', () => {
    renderWithProviders(<Photo src="/missing.jpg" alt="Gone" />)
    const image = screen.getByAltText('Gone')
    fireEvent.error(image)
    expect(image.parentElement).toHaveAttribute('data-loaded')
  })
})
