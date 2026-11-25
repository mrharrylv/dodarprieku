import { useEffect, useState } from 'react'

/**
 * A hairline that fills across the top of the page as the visitor scrolls.
 *
 * Decorative: it is `aria-hidden`, and it is the only place the site uses a
 * scroll listener on every frame, because a progress bar genuinely has to
 * know the offset continuously. The listener is passive so it cannot block
 * scrolling, and the work inside it is one read and one state write.
 *
 * A page shorter than the viewport has nothing to report, so the bar renders
 * nothing rather than sitting permanently at zero or, worse, dividing by it.
 *
 * Above the header (`z-60` beats the header's `z-50`), and it takes its colour
 * from the accent tokens so it matches whichever style is active.
 */
export const ScrollProgress = () => {
  const [progress, setProgress] = useState<number | null>(null)

  useEffect(() => {
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      if (scrollable <= 0) {
        setProgress(null)
        return
      }
      setProgress(Math.min(1, Math.max(0, window.scrollY / scrollable)))
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  if (progress === null) return null

  return (
    <div
      aria-hidden="true"
      data-testid="scroll-progress"
      className="pointer-events-none fixed inset-x-0 top-0 z-60 h-0.5"
    >
      <div
        className="h-full origin-left bg-(--fill-accent)"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  )
}
