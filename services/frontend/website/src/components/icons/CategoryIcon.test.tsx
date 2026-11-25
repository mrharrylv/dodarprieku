import { describe, expect, it } from 'vitest'

import { CATEGORIES } from '@shared/catalog'
import { renderWithProviders } from '@/test/render'
import { CategoryBadge, CategoryLabel } from './CategoryBadge'
import { CategoryIcon } from './CategoryIcon'
import { CATEGORY_ICON_PATHS } from './category-icon-paths'
import { toneVar } from './category-tone'

const ICONS = [...new Set(CATEGORIES.map((c) => c.icon))]

describe('CategoryIcon', () => {
  it('has a drawing for every icon the catalog names, and no others', () => {
    expect(Object.keys(CATEGORY_ICON_PATHS).sort()).toEqual([...ICONS].sort())
    expect(ICONS).toHaveLength(13)
  })

  it.each(ICONS)('draws %s as a decorative stroke icon', (icon) => {
    const { container } = renderWithProviders(<CategoryIcon icon={icon} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('data-icon', icon)
    expect(svg?.querySelector('path')?.getAttribute('d')).toMatch(/^M/)
  })

  it('colours a badge from its tone variable, never a hex', () => {
    for (const category of CATEGORIES) {
      expect(toneVar(category.id)).toBe(`var(--cat-${category.tone})`)
      expect(toneVar(category.id, 'pin')).toBe(`var(--pin-${category.tone})`)
    }
    const { container } = renderWithProviders(<CategoryBadge category="slimnica" surface="pin" />)
    const badge = container.querySelector('span')
    expect(badge?.getAttribute('style')).toContain('var(--pin-rose)')
    expect(badge?.getAttribute('style')).not.toMatch(/#[0-9a-f]{3}/i)
  })

  it('labels a category with its name', () => {
    const { getByText } = renderWithProviders(<CategoryLabel category="hospiss" />)
    expect(getByText('Hospiss')).toBeInTheDocument()
  })
})
