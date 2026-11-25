/**
 * DOM identifiers shared between components that must agree on them.
 *
 * The skip link targets the main landmark by id; a typo in either place makes
 * the link silently do nothing, which is the kind of bug nobody notices because
 * nobody who tests the site uses it.
 */
export const MAIN_CONTENT_ID = 'main-content'

/** The map on the contact page; the footer address links to it. */
export const MAP_ID = 'map'
