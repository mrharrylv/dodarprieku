import { describe, expect, it } from 'vitest'

import { newStreak, stepStreak, streakAlpha, streakDone } from './weld'

const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

describe('weld', () => {
  it('throws every spark from off screen at the left, up and to the right', () => {
    const random = seeded(11)
    for (let i = 0; i < 100; i++) {
      const streak = newStreak(1200, 500, random)
      expect(streak.x).toBeLessThan(0)
      expect(streak.vx).toBeGreaterThan(0)
      expect(streak.vy).toBeLessThan(0)
      expect(streak.heat).toBeGreaterThanOrEqual(0.4)
      expect(streak.heat).toBeLessThanOrEqual(1)
    }
  })

  it('carries a spark into the band and across it', () => {
    let streak = newStreak(1200, 500, seeded(4))
    let seen = false
    for (let t = 0; t < 8; t += 0.02) {
      streak = stepStreak(streak, 0.02)
      if (streak.x > 0 && streak.x < 1200 && streak.y > 0 && streak.y < 500) seen = true
    }
    expect(seen).toBe(true)
    expect(streak.x).toBeGreaterThan(400)
  })

  it('bends each spark down under gravity and never mutates it', () => {
    const streak = newStreak(1200, 500, seeded(5))
    const before = { ...streak }
    const moved = stepStreak(streak, 0.1)
    expect(moved.vy).toBeGreaterThan(streak.vy)
    expect(moved.age).toBeCloseTo(0.1)
    expect(streak).toEqual(before)
  })

  it('stays bright through its flight and fades at the end', () => {
    const streak = { ...newStreak(0, 0, seeded(2)), age: 0, life: 3, heat: 1 }
    expect(streakAlpha(streak)).toBe(1)
    expect(streakAlpha({ ...streak, age: 1.5 })).toBe(1)
    expect(streakAlpha({ ...streak, age: 2.85 })).toBeCloseTo(0.2)
    expect(streakAlpha({ ...streak, age: 3.2 })).toBe(0)
    expect(streakAlpha({ ...streak, heat: 0.5 })).toBe(0.5)
  })

  it('retires sparks that burned out or left the band', () => {
    const streak = { ...newStreak(400, 300, seeded(9)), x: 100, y: 100, age: 0, life: 3 }
    expect(streakDone(streak, 400, 300)).toBe(false)
    expect(streakDone({ ...streak, age: 3 }, 400, 300)).toBe(true)
    expect(streakDone({ ...streak, x: 500 }, 400, 300)).toBe(true)
    expect(streakDone({ ...streak, y: -100 }, 400, 300)).toBe(true)
    expect(streakDone({ ...streak, y: 520 }, 400, 300)).toBe(true)
    // Still below the band on the way in: not done.
    expect(streakDone({ ...streak, x: -30, y: 350 }, 400, 300)).toBe(false)
  })
})
