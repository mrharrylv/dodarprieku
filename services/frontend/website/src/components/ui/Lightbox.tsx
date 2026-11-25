import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'

export type LightboxPhoto = { src: string; alt: string }

/** How far a finger must travel sideways to count as a swipe, in pixels. */
const SWIPE_DISTANCE = 50

/** The index `step` places from `index`, wrapping round at either end. */
export const wrapIndex = (index: number, step: number, length: number): number =>
  length === 0 ? 0 : (((index + step) % length) + length) % length

/**
 * A full-screen photo viewer: one photo at a time, with previous and next
 * buttons, the arrow keys, a swipe on a touch screen, and a strip of
 * thumbnails to jump with.
 *
 * It is a native modal `<dialog>`, so the browser traps focus inside it,
 * makes the page behind it inert, and closes it on Escape; focus returns to
 * whatever opened it. Clicking the dark backdrop closes it too.
 *
 * Scoped to the dark theme: photos read best on near-black, whatever theme
 * the page is in.
 */
export const Lightbox = ({
  title,
  photos,
  start,
  onClose,
}: {
  title: string
  photos: readonly LightboxPhoto[]
  start: number
  onClose: () => void
}) => {
  const { t } = useTranslation('common')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const thumbsRef = useRef<HTMLUListElement>(null)
  const pointerX = useRef<number | null>(null)
  const [index, setIndex] = useState(start)

  const count = photos.length
  const photo = photos[index]
  const go = (step: number) => setIndex((current) => wrapIndex(current, step, count))

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return
    // Older engines (and jsdom) without showModal still get a usable,
    // if non-modal, viewer rather than nothing.
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    return () => {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close()
    }
  }, [])

  // Keep the current thumbnail in view as the reader moves through the set.
  useEffect(() => {
    const thumb = thumbsRef.current?.children[index]
    if (thumb instanceof HTMLElement && typeof thumb.scrollIntoView === 'function') {
      thumb.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
    }
  }, [index])

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      go(1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      go(-1)
    }
  }

  const onPointerDown = (event: PointerEvent) => {
    pointerX.current = event.clientX
  }

  const onPointerUp = (event: PointerEvent) => {
    const from = pointerX.current
    pointerX.current = null
    if (from === null) return
    const distance = event.clientX - from
    if (Math.abs(distance) >= SWIPE_DISTANCE) go(distance < 0 ? 1 : -1)
  }

  if (photo === undefined) return null

  return (
    <dialog
      ref={dialogRef}
      data-theme="dark"
      aria-labelledby="lightbox-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={onKeyDown}
      // A click on the dialog itself, not its content, is a click on the
      // backdrop around it.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="lightbox fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-(--color-ink-950)/95 p-0 text-(--text-primary) backdrop:bg-(--color-ink-950)/80 backdrop:backdrop-blur-sm"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 id="lightbox-title" className="truncate text-(length:--text-lg) text-(--text-primary)">
              {title}
            </h2>
            <p className="text-(length:--text-sm) text-(--text-secondary) tabular-nums" aria-live="polite">
              {t('lightbox.counter', { current: index + 1, total: count })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('lightbox.close')}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--color-ink-50)/10 text-(--text-primary) transition-colors hover:bg-(--color-ink-50)/20"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true" focusable="false">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div
          className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-2 select-none sm:px-20"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (pointerX.current = null)}
        >
          <img
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            decoding="async"
            referrerPolicy="no-referrer"
            draggable={false}
            className="animate-fade-in max-h-full max-w-full rounded-(--radius-md) object-contain shadow-(--shadow-card)"
          />
          {count > 1 && (
            <>
              <NavButton side="left" label={t('lightbox.previous')} onClick={() => go(-1)} />
              <NavButton side="right" label={t('lightbox.next')} onClick={() => go(1)} />
            </>
          )}
        </div>

        {count > 1 && (
          <ul ref={thumbsRef} className="flex gap-2 overflow-x-auto px-4 py-3 sm:justify-center sm:px-6">
            {photos.map((entry, entryIndex) => (
              <li key={entry.src} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setIndex(entryIndex)}
                  aria-label={t('lightbox.show', { current: entryIndex + 1, total: count })}
                  aria-current={entryIndex === index ? 'true' : undefined}
                  className={cn(
                    'block h-14 w-20 overflow-hidden rounded-(--radius-sm) border-2 transition-[opacity,border-color]',
                    entryIndex === index
                      ? 'border-(--color-spark-400) opacity-100'
                      : 'border-transparent opacity-60 hover:opacity-100',
                  )}
                >
                  <img
                    src={entry.src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    draggable={false}
                    className="h-full w-full object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  )
}

const NavButton = ({
  side,
  label,
  onClick,
}: {
  side: 'left' | 'right'
  label: string
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={cn(
      'absolute top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-(--color-ink-950)/60 text-(--text-primary) ring-1 ring-(--color-ink-50)/20 backdrop-blur transition-colors hover:bg-(--color-ink-950)/85',
      side === 'left' ? 'left-2 sm:left-5' : 'right-2 sm:right-5',
    )}
  >
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={side === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  </button>
)
