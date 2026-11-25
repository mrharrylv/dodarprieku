/**
 * Join class names, dropping anything falsy.
 *
 * Deliberately not `clsx` + `tailwind-merge`: the components here compose
 * classes rather than override them, so conflict resolution would be 8 KB spent
 * on a problem this codebase does not have. If a component ever genuinely needs
 * to override a caller's utility, add the dependency then, not before.
 */
export type ClassValue = string | number | false | null | undefined

export const cn = (...values: ClassValue[]): string =>
  values.filter((v): v is string | number => Boolean(v)).join(' ')
