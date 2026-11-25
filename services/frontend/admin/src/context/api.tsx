/** The API the pages call, injectable so tests pass a fake. */
import { createContext, useContext, type ReactNode } from 'react'
import { api as defaultApi, type Api } from '../lib/api'

const ApiContext = createContext<Api>(defaultApi)

export const ApiProvider = ({ api, children }: { readonly api: Api; readonly children: ReactNode }) => (
  <ApiContext.Provider value={api}>{children}</ApiContext.Provider>
)

export const useApi = (): Api => useContext(ApiContext)
