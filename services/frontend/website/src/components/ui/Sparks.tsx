import { useEffect, useRef } from 'react'

import { cn } from '@/lib/cn'

import { newStreak, stepStreak, streakAlpha, streakDone, type Streak } from './weld'

/** Sparks thrown per second for every 1,000 CSS pixels of band width. */
const RATE_PER_1000PX = 15
/** The most in the air at once, so a wide screen is not crowded. */
const MAX_STREAKS = 260
/** Seconds of flight each streak's tail shows. */
const TAIL = 0.24

/**
 * Sparks flying across a dark hero band (first made for Westa Marine's
 * welding hero; Harry's settings, 2026-11-06: streaks only, slow, nearly
 * horizontal, no visible source): thin glowing streaks thrown in
 * from below the bottom left, crossing up and to the right and bending as
 * they cool. Their source is off screen, so only the flight shows. Drawn on a
 * canvas at the screen's full pixel density so every streak stays sharp.
 * Pure decoration: hidden from assistive technology.
 *
 * It only animates while the band is on screen and the tab is visible, so it
 * costs nothing once the reader has scrolled past. Under reduced motion it
 * draws one still frame of sparks mid-flight. The prerendered page has an
 * empty canvas; the sparks appear once the script runs.
 */
export const Sparks = ({ className }: { className?: string }) => {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const context = canvas?.getContext('2d') ?? null
    if (canvas === null || context === null) return

    const styles = getComputedStyle(canvas)
    const core = styles.getPropertyValue('--color-spark-200').trim() || 'white'
    const glow = styles.getPropertyValue('--color-spark-400').trim() || 'orange'
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    let width = 0
    let height = 0
    let ratio = 1
    let streaks: Streak[] = []
    let owed = 0
    let frame = 0
    let last = 0
    let visible = true

    /** A spark already part of the way through its flight. */
    const midFlight = (): Streak => {
      const streak = newStreak(width, height, Math.random)
      return stepStreak(streak, Math.random() * streak.life * 0.8)
    }

    const resize = () => {
      const box = canvas.getBoundingClientRect()
      ratio = Math.min(window.devicePixelRatio || 1, 2.5)
      width = box.width
      height = box.height
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      // Start with the band already alive rather than empty.
      const count = Math.min(MAX_STREAKS, Math.round((width / 1000) * RATE_PER_1000PX * 9))
      streaks = Array.from({ length: count }, midFlight).filter(
        (streak) => !streakDone(streak, width, height),
      )
    }

    const draw = () => {
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.globalCompositeOperation = 'lighter'
      context.lineCap = 'round'
      for (const streak of streaks) {
        const alpha = streakAlpha(streak)
        if (alpha <= 0) continue
        const headX = streak.x * ratio
        const headY = streak.y * ratio
        const tailX = (streak.x - streak.vx * TAIL) * ratio
        const tailY = (streak.y - streak.vy * TAIL) * ratio
        const tail = context.createLinearGradient(headX, headY, tailX, tailY)
        tail.addColorStop(0, core)
        tail.addColorStop(0.25, glow)
        tail.addColorStop(1, 'transparent')
        context.globalAlpha = alpha
        context.strokeStyle = tail
        context.lineWidth = streak.width * ratio
        context.beginPath()
        context.moveTo(tailX, tailY)
        context.lineTo(headX, headY)
        context.stroke()
      }
      context.globalAlpha = 1
      context.globalCompositeOperation = 'source-over'
    }

    const step = (dt: number) => {
      owed += (width / 1000) * RATE_PER_1000PX * dt
      const fresh: Streak[] = []
      while (owed >= 1) {
        owed -= 1
        if (streaks.length + fresh.length < MAX_STREAKS) {
          fresh.push(newStreak(width, height, Math.random))
        }
      }
      streaks = [
        ...streaks
          .map((streak) => stepStreak(streak, dt))
          .filter((streak) => !streakDone(streak, width, height)),
        ...fresh,
      ]
    }

    const tick = (now: number) => {
      const time = now / 1000
      const dt = last === 0 ? 0 : Math.min(0.05, time - last)
      last = time
      step(dt)
      draw()
      frame = visible && !document.hidden ? requestAnimationFrame(tick) : 0
    }

    const start = () => {
      if (still || frame !== 0 || !visible || document.hidden) return
      last = 0
      frame = requestAnimationFrame(tick)
    }

    resize()
    draw()
    start()

    const resizer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            resize()
            draw()
          })
    resizer?.observe(canvas)

    const watcher =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = entry?.isIntersecting ?? true
            start()
          })
    watcher?.observe(canvas)

    const onVisibility = () => start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(frame)
      resizer?.disconnect()
      watcher?.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
    />
  )
}
