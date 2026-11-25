import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'

type LoadState = 'idle' | 'loading' | 'loaded'

/**
 * A photo in a fixed-ratio frame: the one way a site shows a picture.
 *
 * `alt` is required and comes from the locale files (`t('media.<key>')`),
 * written for what the photo shows, in every language: never a file name.
 * The frame holds its aspect ratio before the file arrives, so the layout does
 * not jump; while the file is on its way the frame shimmers, and the photo
 * fades in once it has arrived. The loading state is only ever set in an
 * effect, after checking the file has not already arrived, so the prerendered
 * page and a page without JavaScript always show the photo.
 *
 * It cannot be dragged (a drag pulled a ghost copy across the page; Harry,
 * 2026-11-06), and it sends no Referer to a hotlinked origin.
 *
 * `priority` is for the one photo in the first screen: it loads eagerly with a
 * high fetch priority. Every other photo is lazy.
 */
export const Photo = ({
  src,
  alt,
  className,
  imgClassName,
  priority = false,
  ratio = 'aspect-[4/3]',
}: {
  src: string
  alt: string
  className?: string
  imgClassName?: string
  priority?: boolean
  ratio?: string
}) => {
  const ref = useRef<HTMLImageElement>(null)
  const [state, setState] = useState<LoadState>('idle')

  useEffect(() => {
    const image = ref.current
    if (image === null) return
    setState(image.complete && image.naturalWidth > 0 ? 'loaded' : 'loading')
  }, [src])

  // A failed file still ends the shimmer: the frame then shows its plain tone
  // and the browser's own broken-image treatment with the alt text.
  const done = () => setState('loaded')

  return (
    <div
      className={cn('photo-frame overflow-hidden bg-(--surface-sunken)', ratio, className)}
      data-loading={state === 'loading' ? '' : undefined}
      data-loaded={state === 'loaded' ? '' : undefined}
    >
      <img
        ref={ref}
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        referrerPolicy="no-referrer"
        draggable={false}
        onLoad={done}
        onError={done}
        className={cn('h-full w-full object-cover', imgClassName)}
      />
    </div>
  )
}
