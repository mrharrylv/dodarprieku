/**
 * Immutable update at a dotted path: returns a new object, copying only the
 * branch it changes. Numeric segments index arrays. `undefined` removes the
 * key, so optional profile fields disappear rather than becoming "".
 */
type Container = Readonly<Record<string, unknown>> | readonly unknown[]

const isIndex = (segment: string): boolean => /^\d+$/.test(segment)

const assign = (target: unknown, segment: string, value: unknown): Container => {
  if (Array.isArray(target)) {
    const index = Number(segment)
    if (value === undefined) return target.filter((_, i) => i !== index)
    return target.map((item, i) => (i === index ? value : item)).concat(index >= target.length ? [value] : [])
  }
  const base = typeof target === 'object' && target !== null ? (target as Readonly<Record<string, unknown>>) : {}
  if (value === undefined) {
    return Object.fromEntries(Object.entries(base).filter(([k]) => k !== segment))
  }
  return { ...base, [segment]: value }
}

export const setIn = <T>(root: T, path: string, value: unknown): T => {
  const [head, ...rest] = path.split('.')
  if (head === undefined || head === '') return root
  if (rest.length === 0) return assign(root, head, value) as T
  const container = root as unknown as Readonly<Record<string, unknown>> | undefined
  const child = container?.[head]
  const nextChild = child === undefined || child === null ? (isIndex(rest[0] ?? '') ? [] : {}) : child
  return assign(root, head, setIn(nextChild, rest.join('.'), value)) as T
}
