import { act, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'

import { STORAGE_KEYS } from '@/config/site'
import { VALID_FORM } from '@/components/profile-editor/fixtures'
import { ThemeProvider } from '@/context/ThemeProvider'
import i18n from '@/i18n'
import { RegisterPage } from './RegisterPage'

/**
 * The real page is prerendered and then hydrated, so the wizard mounts twice:
 * once for the hydration pass (no storage) and once more with the draft. A
 * client `render()` is hydrated from its first render and cannot show what
 * the first mount does to the stored draft; this test can.
 */
const tree = (): ReactNode => (
  <I18nextProvider i18n={i18n}>
    <ThemeProvider>
      <MemoryRouter initialEntries={['/registreties']}>
        <RegisterPage />
      </MemoryRouter>
    </ThemeProvider>
  </I18nextProvider>
)

const DRAFT = { version: 1, step: 1, form: VALID_FORM, accountEmail: 'a@b.lv' } as const

describe('RegisterPage after hydration', () => {
  let root: Root | null = null
  let host: HTMLElement | null = null

  afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = null
    host = null
    window.sessionStorage.clear()
  })

  it('restores the stored draft instead of overwriting it with the empty one', async () => {
    const html = renderToString(tree())
    expect(html).toContain('Organizācija')

    window.sessionStorage.setItem(STORAGE_KEYS.registerDraft, JSON.stringify(DRAFT))
    host = document.createElement('div')
    host.innerHTML = html
    document.body.appendChild(host)

    await act(async () => {
      root = hydrateRoot(host as HTMLElement, tree())
    })

    expect(await screen.findByRole('heading', { level: 2, name: 'Par jums' })).toBeInTheDocument()
    expect(screen.getByText('Turpinām no vietas, kur palikāt')).toBeInTheDocument()
    const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEYS.registerDraft) ?? 'null') as typeof DRAFT
    expect(stored.step).toBe(1)
    expect(stored.form.organization.name).toBe(VALID_FORM.organization.name)
  })
})
