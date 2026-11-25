import { categoryById, type CategoryId } from '@shared/catalog'

/** The CSS variable holding a category's fill: `--cat-<tone>`, or `--pin-<tone>` on the always-light map. */
export const toneVar = (category: CategoryId, surface: 'ui' | 'pin' = 'ui'): string =>
  `var(--${surface === 'pin' ? 'pin' : 'cat'}-${categoryById(category).tone})`
