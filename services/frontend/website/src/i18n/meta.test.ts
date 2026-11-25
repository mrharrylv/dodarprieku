import { describe, it, expect } from 'vitest'

import { resources } from './index'
import { LOCALE_CODES, SITE } from '@/config/site'
import { buildTitle } from '@/lib/seo'

/**
 * The home page's title is what a search result shows as the site's headline.
 * "Home · Dodar prieku" says nothing about what the business does, so the home
 * page's `meta.title` must be a real phrase, in every language, and never the
 * word the navigation uses for the home page.
 */
describe("the home page's meta title", () => {
  it.each(LOCALE_CODES)('is a real phrase in %s', (locale) => {
    const title = resources[locale].map.meta.title.trim()
    const navLabel = resources[locale].common.nav.map.trim()

    expect(title.toLowerCase()).not.toBe(navLabel.toLowerCase())
    expect(title).not.toBe(SITE.name)
    expect(title.split(/\s+/).length).toBeGreaterThan(1)
  })

  it.each(LOCALE_CODES)('renders as "<phrase> · <brand>" in %s, never "Home · <brand>"', (locale) => {
    const navLabel = resources[locale].common.nav.map
    const rendered = buildTitle(resources[locale].map.meta.title, [navLabel])

    expect(rendered).toBe(`${resources[locale].map.meta.title.trim()} · ${SITE.name}`)
    expect(rendered.startsWith(`${navLabel} ·`)).toBe(false)
  })
})
