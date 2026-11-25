import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'

import { Sparks } from './Sparks'

describe('Sparks', () => {
  it('is a decorative canvas hidden from assistive technology', () => {
    const { container } = render(<Sparks />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
  })
})
