import { useContext, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { HEAD_MARK, jsonLdText, pageHead, type HeadTag, type PageHead } from '@/lib/head'
import type { PageMeta } from '@/lib/seo'
import { HeadCollectorContext } from './head-collector'

/**
 * Applies a page's metadata to the document head.
 *
 * WHAT the head holds is decided by `pageHead()` in `lib/head.ts`, a pure
 * function the build's prerender calls too: every page ships as HTML with this
 * same head already in it, for the crawlers that never run JavaScript. This
 * component keeps the live document in step as the visitor navigates.
 *
 * Everything it writes is marked `data-seo`, and every render clears the
 * previous page's marked tags first. Without that, navigating accumulates
 * canonical links: a page ends up declaring three different canonical URLs,
 * and a crawler picks whichever it likes. The prerendered tags and the static
 * ones in `index.html` are marked too, so the first render replaces them
 * rather than adding a second description beside them.
 */
const removeMarked = (head: HTMLHeadElement) => {
  head.querySelectorAll(`[${HEAD_MARK}]`).forEach((node) => node.remove())
}

const elementFor = (tag: HeadTag): HTMLElement => {
  if (tag.kind === 'json-ld') {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = jsonLdText(tag.data)
    return script
  }
  if (tag.kind === 'link') {
    const link = document.createElement('link')
    link.setAttribute('rel', tag.rel)
    link.setAttribute('href', tag.href)
    if (tag.hrefLang !== undefined) link.setAttribute('hreflang', tag.hrefLang)
    return link
  }
  const meta = document.createElement('meta')
  meta.setAttribute(tag.attr, tag.key)
  meta.setAttribute('content', tag.content)
  return meta
}

const applyHead = (data: PageHead) => {
  const head = document.head
  removeMarked(head)

  document.title = data.title
  // The lang attribute drives hyphenation, and drives which voice a screen
  // reader uses. Left at "en" on a Latvian page, the text is read aloud by an
  // English synthesiser and is close to unintelligible.
  document.documentElement.lang = data.lang

  for (const tag of data.tags) {
    const element = elementFor(tag)
    element.setAttribute(HEAD_MARK, '')
    head.appendChild(element)
  }
}

export const Seo = ({ title, description, path, locale, image, noIndex }: PageMeta) => {
  const { t: tc } = useTranslation('common')
  const { t: tm } = useTranslation('map')
  const collect = useContext(HeadCollectorContext)

  const homeLabel = tc('nav.map')
  // The map page's description is the site's own: the Organization's.
  const siteDescription = tm('meta.description')

  const head = useMemo(
    () =>
      pageHead(
        {
          title,
          description,
          path,
          locale,
          ...(image !== undefined ? { image } : {}),
          ...(noIndex !== undefined ? { noIndex } : {}),
        },
        { homeLabel, siteDescription },
      ),
    [title, description, path, locale, image, noIndex, homeLabel, siteDescription],
  )

  // Only during the build's prerender, where effects never run.
  if (collect !== null) collect(head)

  useEffect(() => {
    applyHead(head)
    return () => removeMarked(document.head)
  }, [head])

  return null
}
