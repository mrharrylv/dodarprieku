import { StrictMode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import '@/index.css'
import i18n from '@/i18n'

import { App } from '@/App'
import { ThemeProvider } from '@/context/ThemeProvider'
import { PRERENDER_ATTR, REDIRECTING_ATTR, startupPlan } from '@/lib/prerender'

const container = document.getElementById('root')

if (container === null) {
  // Nothing can render, so say why in the console rather than failing with a
  // TypeError from a null argument three frames deep.
  throw new Error('#root is missing from index.html: the app cannot mount')
}

// The page this load is for, decided before React starts (startupPlan):
// public/theme-init.js may already be sending it elsewhere; otherwise the
// address takes its one spelling (the bare root becomes the visitor's
// language, a trailing slash or /index.html goes), and #root is hydrated when
// it holds the page that address renders, or rendered from scratch when it
// does not (the dev server, the default-language 404 page answering for
// /lv/nope, the root page for a visitor sent to another language).
const plan = startupPlan({
  pathname: window.location.pathname,
  resolvedLanguage: i18n.resolvedLanguage,
  prerendered: container.getAttribute(PRERENDER_ATTR),
  redirecting: document.documentElement.hasAttribute(REDIRECTING_ATTR),
})

// Must stay identical to the tree in entry-server.tsx (with its router) and
// hydration.test.tsx, or hydration cannot reuse the prerendered markup.
const app = (
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
)

if (plan.mount) {
  if (plan.address !== null) {
    window.history.replaceState(window.history.state, '', `${plan.address}${window.location.search}${window.location.hash}`)
  }
  try {
    if (plan.hydrate) {
      hydrateRoot(container, app)
    } else {
      // Committed before `finally` runs, so the markup this replaces (the
      // default-language 404 page at /lv/nope) is never shown again.
      const root = createRoot(container)
      flushSync(() => root.render(app))
    }
  } finally {
    // theme-init.js hides a prerendered page whose address names another
    // language than its markup is in, and shows it itself only after
    // HIDDEN_PAGE_TIMEOUT_MS. It is this app's page now, in the right
    // language, so it is shown at once; and if rendering failed, a visible
    // page beats a blank one.
    document.documentElement.style.removeProperty('visibility')
  }
}
