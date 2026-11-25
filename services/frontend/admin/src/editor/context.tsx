import { createContext, useContext } from 'react'
import type { CharityProfile } from '@shared/contracts'

export interface EditorApi {
  readonly profile: CharityProfile
  readonly set: (path: string, value: unknown) => void
  readonly error: (path: string) => string | undefined
  readonly upload: (file: File, kind: 'photo' | 'logo') => Promise<string | undefined>
}

export const EditorContext = createContext<EditorApi | undefined>(undefined)

export const useEditor = (): EditorApi => {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor outside ProfileEditor')
  return ctx
}
