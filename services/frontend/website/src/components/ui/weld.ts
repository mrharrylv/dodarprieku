/**
 * The physics of the hero's sparks: hot streaks thrown in from below the
 * bottom left corner, flying up and across the band to the right and bending
 * under gravity as they cool. Their source is always off screen, so the band
 * shows only the sparks in flight. Pure functions, so the canvas in
 * `Sparks.tsx` only draws and these can be tested without one.
 */

export type Streak = {
  x: number
  y: number
  vx: number
  vy: number
  /** Seconds since it was thrown. */
  age: number
  /** Seconds it lives for, long enough to cross the band. */
  life: number
  width: number
  /** 0.4 to 1: a few sparks burn brighter than the rest. */
  heat: number
}

/** Downward pull, CSS pixels per second squared: enough to bend the flight. */
export const GRAVITY = 11

/**
 * A fresh spark, thrown from just outside the band's bottom left, up and to
 * the right at a shallow 8 to 22 degrees, slowly enough to follow by eye.
 */
export const newStreak = (width: number, height: number, random: () => number): Streak => {
  const angle = (Math.PI / 180) * (8 + random() * 14)
  const speed = Math.max(width, 600) * (0.1 + random() * 0.11)
  return {
    x: -40 - random() * width * 0.2,
    y: height * (0.15 + random() * 0.95),
    vx: Math.cos(angle) * speed,
    vy: -Math.sin(angle) * speed,
    age: 0,
    life: 9 + random() * 5,
    width: 0.7 + random() * 1.3,
    heat: 0.4 + random() * 0.6,
  }
}

/** Where a spark is `dt` seconds later. Returns a new object. */
export const stepStreak = (streak: Streak, dt: number): Streak => ({
  ...streak,
  x: streak.x + streak.vx * dt,
  y: streak.y + streak.vy * dt,
  vy: streak.vy + GRAVITY * dt,
  vx: streak.vx * (1 - 0.025 * dt),
  age: streak.age + dt,
})

/** How bright it is: full for most of its flight, fading out at the end. */
export const streakAlpha = (streak: Streak): number => {
  const left = 1 - streak.age / streak.life
  return left <= 0 ? 0 : Math.min(1, left * 4) * streak.heat
}

/** Whether a spark has burned out or flown out of the band. */
export const streakDone = (streak: Streak, width: number, height: number): boolean =>
  streak.age >= streak.life || streak.x > width + 80 || streak.y < -80 || streak.y > height + 200
