import { useRoutes } from 'react-router-dom'

import style from '@active-style/style'
import { buildRoutes } from '@/routes'

/**
 * `@active-style` is resolved by `vite.config.ts` from `site.config.json`, so
 * exactly one folder under `src/styles/` is in the bundle. To change the look
 * of the site, change that file; to see every style, read `doc/styles.md`.
 */
const routes = buildRoutes(style)

export const App = () => useRoutes(routes)
