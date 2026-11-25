/** Key shapes of the single table (doc/specs/dodarprieku.md, "Storage"). */

export const GSI1 = 'GSI1'

export const keys = {
  charity: (id: string) => ({ PK: `CHARITY#${id}`, SK: 'META' }),
  update: (id: string) => ({ PK: `CHARITY#${id}`, SK: 'UPDATE' }),
  needCount: (id: string) => ({ PK: `CHARITY#${id}`, SK: 'NEEDCOUNT' }),
  pledge: (charityId: string, createdAt: string, id: string) => ({
    PK: `CHARITY#${charityId}`,
    SK: `PLEDGE#${createdAt}#${id}`,
  }),
  charitySub: (charityId: string, email: string) => ({ PK: `CHARITY#${charityId}`, SK: `SUB#${email}` }),
  listRequest: (charityId: string, createdAt: string, id: string) => ({
    PK: `CHARITY#${charityId}`,
    SK: `LISTREQ#${createdAt}#${id}`,
  }),
  slug: (slug: string) => ({ PK: `SLUG#${slug}`, SK: 'SLUG' }),
  account: (email: string) => ({ PK: `ACCOUNT#${email}`, SK: 'ACCOUNT' }),
  token: (hash: string) => ({ PK: `TOKEN#${hash}`, SK: 'TOKEN' }),
  subscriber: (email: string) => ({ PK: `SUBSCRIBER#${email}`, SK: 'SUB' }),
  rate: (key: string, window: string) => ({ PK: `RATE#${key}`, SK: window }),
} as const

export const charityPk = (id: string): string => `CHARITY#${id}`

export const gsi = {
  status: (status: string) => `STATUS#${status}`,
  role: (role: string) => `ROLE#${role}`,
  updates: 'UPDATES',
  pledges: 'PLEDGES',
  subscribers: 'SUBSCRIBERS',
  listRequests: 'LISTREQS',
} as const

/** Internal attributes stripped before an item becomes a record. */
const INTERNAL = new Set(['PK', 'SK', 'GSI1PK', 'GSI1SK', 'ttl', 'type'])

export const stripKeys = (item: Readonly<Record<string, unknown>>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(item).filter(([k]) => !INTERNAL.has(k)))
