/**
 * The services the site advertises.
 *
 * Structure only: every visible string lives in each locale's
 * `services.json`, under `items.<key>`. Adding a service means adding an entry here AND the
 * matching `title`/`summary`/`body` keys in all three locale files; the parity
 * test fails the build if a language is missed.
 */
export interface ServiceEntry {
  /** Matches `items.<key>` in the `services` namespace. */
  readonly key: string
  /** Anchor id, so a service can be linked to directly. */
  readonly slug: string
}

export const SERVICES: readonly ServiceEntry[] = [
  { key: 'consulting', slug: 'consulting' },
  { key: 'delivery', slug: 'delivery' },
  { key: 'support', slug: 'support' },
  { key: 'training', slug: 'training' },
] as const

/** The steps shown on the services page, in order. */
export const PROCESS_STEPS: readonly string[] = ['talk', 'quote', 'work'] as const

/** The three cards on the home page. */
export const HIGHLIGHTS: readonly string[] = ['clarity', 'speed', 'care'] as const

/** The values listed on the about page. */
export const VALUES: readonly string[] = ['honest', 'direct', 'finish'] as const
