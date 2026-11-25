import { describe, it, expect, afterEach } from 'vitest'
import { act, screen } from '@testing-library/react'

import { DevelopedBy } from './DevelopedBy'
import i18n from '@/i18n'
import { DEVELOPER } from '@/config/site'
import { renderWithProviders } from '@/test/render'

/**
 * The language is changed on i18next directly, not by rendering at a `/lv`
 * route: it is `LocaleLayout` that maps the URL segment onto i18next, and this
 * component is rendered on its own here. An earlier version of this test did
 * pass a route and asserted Latvian against a component that was still
 * rendering English, which it happily did for the wrong reason.
 */
const withLanguage = async (code: string) => {
  await act(async () => {
    await i18n.changeLanguage(code)
  })
}

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage('lv')
  })
})

describe('DevelopedBy', () => {
  it.each([
    ['lv', /izstrāde/i],
  ])('in %s says so in that language and links the developer', async (code, words) => {
    await withLanguage(code)
    renderWithProviders(<DevelopedBy />)

    const link = await screen.findByRole('link', { name: DEVELOPER.name })
    expect(link).toHaveAttribute('href', DEVELOPER.url)
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(link).toHaveAttribute('target', '_blank')

    // The developer's name is a proper noun: the same in every language.
    expect(link).toHaveTextContent(DEVELOPER.name)
    // The words around it are not.
    expect(link.closest('p')).toHaveTextContent(words)
  })
})
