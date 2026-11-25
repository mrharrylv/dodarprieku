/**
 * The home deck's five screens, in order.
 *
 * The ids are structural, never translated: the dot indicator scrolls to them
 * and `tokens.css` sizes them. Keeping them in one array is what stops the
 * indicator and the deck drifting apart when a screen is added or removed.
 */
export const DECK_SECTIONS = ['hero', 'highlights', 'services', 'about', 'contact'] as const

export type DeckSection = (typeof DECK_SECTIONS)[number]

/** Prefixed, because a bare `contact` would collide with an anchor elsewhere. */
export const panelId = (section: DeckSection) => `paged-${section}`
