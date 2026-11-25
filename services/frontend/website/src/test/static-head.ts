import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * `index.html` as the browser has it before any script runs: the head that
 * social crawlers, Bing's first pass and AI crawlers read, and the head the
 * app starts from.
 *
 * jsdom starts every test with an empty head, so without this a test of
 * `<Seo>` never meets the static tags it has to replace, and a duplicate
 * description or `og:title` passes unnoticed.
 */
const INDEX_HTML = join(__dirname, '..', '..', 'index.html')

export const staticDocument = (): Document =>
  new DOMParser().parseFromString(readFileSync(INDEX_HTML, 'utf8'), 'text/html')

/**
 * Copies index.html's `<meta>` and `<link>` tags into the live head. Returns
 * a function that removes whichever of them are still there, for `afterEach`.
 */
export const mountStaticHead = (): (() => void) => {
  const copies = [...staticDocument().head.querySelectorAll('meta, link')].map((tag) =>
    document.importNode(tag, true),
  )
  copies.forEach((tag) => document.head.appendChild(tag))
  return () => copies.forEach((tag) => tag.remove())
}
