/** Every route of the portal. Never a path literal elsewhere. */
export const PATHS = {
  dashboard: '/',
  login: '/pieslegties',
  setPassword: '/parole',
  applications: '/pieteikumi',
  updates: '/izmainas',
  charities: '/organizacijas',
  subscribers: '/abonenti',
  pledges: '/ziedojumi',
  listRequests: '/pieprasijumi',
} as const

export const applicationPath = (id: string): string => `${PATHS.applications}/${encodeURIComponent(id)}`
export const updatePath = (id: string): string => `${PATHS.updates}/${encodeURIComponent(id)}`
export const charityPath = (id: string, edit = false): string =>
  `${PATHS.charities}/${encodeURIComponent(id)}${edit ? '?skats=rediget' : ''}`
