/**
 * How long the docked panel takes to slide in from the right edge, or back
 * out. The map's padding eases over the same time, so the panel and the map
 * making room for it read as one motion. CSS reads it as `--dock-motion`
 * (index.css); `dock-css.test.ts` keeps the two equal.
 */
export const DOCK_MOTION_MS = 450

/** The slide's length right now: none for someone who asked the system for reduced motion. */
export const dockMotionMs = (): number => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : DOCK_MOTION_MS
  } catch {
    return DOCK_MOTION_MS
  }
}
