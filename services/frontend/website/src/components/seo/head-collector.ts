import { createContext } from 'react'

import type { PageHead } from '@/lib/head'

/**
 * Where `<Seo>` reports its page's head during the build's prerender.
 *
 * `entry-server.tsx` provides a function here; the browser provides nothing,
 * and `<Seo>` then only writes to `document.head` in an effect, which is all a
 * browser needs. The prerender cannot use that effect, because effects never
 * run on the server, so `<Seo>` hands its computed head over while rendering
 * instead. The value is the same `pageHead()` result either way.
 */
export type HeadCollector = (head: PageHead) => void

export const HeadCollectorContext = createContext<HeadCollector | null>(null)
