import { describe, expect, it } from 'vitest'
import { act, render } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'

import { MAIN_CONTENT_ID } from '@/config/dom'

import { PAGE_IN_CLASS, PageTransition } from './PageTransition'

let go: (path: string) => void = () => undefined

const Harness = () => {
  go = useNavigate()
  return (
    <>
      <PageTransition />
      <main id={MAIN_CONTENT_ID}>page</main>
    </>
  )
}

describe('PageTransition', () => {
  it('leaves the first page alone and fades in each page after it', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/lv']}>
        <Harness />
      </MemoryRouter>,
    )
    const main = container.querySelector('main')
    expect(main).not.toHaveClass(PAGE_IN_CLASS)

    act(() => go('/lv/projects'))
    expect(main).toHaveClass(PAGE_IN_CLASS)
  })
})
