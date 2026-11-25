import type { Storage, StoredObject } from './types'

export interface MemoryStorage extends Storage {
  readonly keys: () => readonly string[]
}

export const createMemoryStorage = (): MemoryStorage => {
  const objects = new Map<string, StoredObject>()
  return {
    put: async (key, object) => {
      objects.set(key, { ...object, body: new Uint8Array(object.body) })
    },
    get: async (key) => {
      const o = objects.get(key)
      return o ? { ...o, body: new Uint8Array(o.body) } : undefined
    },
    remove: async (keys) => {
      for (const k of keys) objects.delete(k)
    },
    keys: () => [...objects.keys()].sort(),
  }
}
