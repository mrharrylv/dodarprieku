/**
 * The data the API keeps, behind one interface. `dynamo/` implements it on
 * the single table of the spec; `memory.ts` backs the tests and the local dev
 * server. Every method returns fresh objects: callers may not mutate them and
 * never need to.
 */
import type {
  CharityProfile,
  CharityStatus,
  ListRequestRecord,
  PledgeRecord,
  Role,
  SubscriberRecord,
} from '../../../shared/src/contracts'
import type { TokenPurpose } from '../auth/tokens'

export interface CharityRecord {
  readonly id: string
  readonly status: CharityStatus
  readonly slug: string
  /** The live profile, or the application while pending. */
  readonly profile: CharityProfile
  /** '' for a charity imported from a register: it has no account and is never mailed. */
  readonly accountEmail: string
  /** Set on imported charities only: 'import:<dataset>'. Removed when a claim is approved. */
  readonly source?: string
  /** A claim application (status pending/rejected): the imported charity it asks to take over. */
  readonly claimCharityId?: string
  /** When an approved claim merged an account into this imported charity. */
  readonly claimedAt?: string
  /** Its needs were made up by the dev-only demo-needs task: clear-demo-needs empties them again. */
  readonly demoNeeds?: boolean
  readonly views: number
  readonly pledges: number
  readonly rejectReason?: string
  readonly suspendReason?: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly publishedAt?: string
}

export interface UpdateRecord {
  readonly charityId: string
  readonly profile: CharityProfile
  readonly submittedAt: string
}

export interface AccountRecord {
  readonly email: string
  readonly role: Role
  readonly charityId?: string
  readonly passwordHash?: string
  readonly sessionVersion: number
  readonly createdAt: string
  readonly updatedAt: string
}

export interface TokenRecord {
  /** sha256(token), hex. The token itself is never stored. */
  readonly hash: string
  readonly purpose: TokenPurpose
  readonly email: string
  /** Epoch seconds. DynamoDB TTL deletes lazily, so callers check it too. */
  readonly expiresAt: number
}

export interface SubscribeInput {
  readonly email: string
  readonly name?: string
  readonly charityId?: string
  /** Also the general newsletter. Once true it stays true: a later organisation-only sign-up never takes it away. */
  readonly general: boolean
  readonly consentAt: string
  readonly source: 'pledge' | 'subscribe'
}

export interface Repository {
  // Charities
  readonly createCharity: (charity: CharityRecord) => Promise<void>
  readonly getCharity: (id: string) => Promise<CharityRecord | undefined>
  /** Rewrites everything but the view and pledge counters. */
  readonly saveCharity: (charity: CharityRecord) => Promise<void>
  /**
   * `saveCharity` for a claim's merge, written only while the stored charity is
   * still imported (`source` begins with `import:`) and has no account. False
   * when it no longer is: another claim was approved first.
   */
  readonly saveClaimMerge: (charity: CharityRecord) => Promise<boolean>
  readonly listCharities: (status?: CharityStatus) => Promise<readonly CharityRecord[]>
  /** Writes each record whole (counters included), creating or overwriting: the import's batch path. */
  readonly putCharities: (charities: readonly CharityRecord[]) => Promise<void>
  /** Removes the charity and every item under it (update, pledges, counts, links, list requests). */
  readonly deleteCharity: (id: string) => Promise<void>
  readonly incrementViews: (id: string) => Promise<void>

  // Slugs
  /** True when the slug was free and is now this charity's, or was this charity's already. */
  readonly claimSlug: (slug: string, charityId: string) => Promise<boolean>
  readonly releaseSlug: (slug: string) => Promise<void>

  // Pending updates
  readonly getUpdate: (charityId: string) => Promise<UpdateRecord | undefined>
  readonly putUpdate: (update: UpdateRecord) => Promise<void>
  readonly deleteUpdate: (charityId: string) => Promise<void>
  readonly listUpdateIds: () => Promise<readonly string[]>

  // Accounts and tokens
  readonly getAccount: (email: string) => Promise<AccountRecord | undefined>
  readonly putAccount: (account: AccountRecord) => Promise<void>
  readonly deleteAccount: (email: string) => Promise<void>
  readonly putToken: (token: TokenRecord) => Promise<void>
  /** Deletes and returns the token in one step, so it can be used once. */
  readonly consumeToken: (hash: string) => Promise<TokenRecord | undefined>

  // Pledges
  readonly recordPledge: (pledge: PledgeRecord) => Promise<void>
  /** Newest first. With a charity id, only that charity's. Emails included: callers strip them. */
  readonly listPledges: (charityId?: string) => Promise<readonly PledgeRecord[]>
  readonly getNeedCounts: (charityId: string) => Promise<Readonly<Record<string, number>>>

  // Subscribers
  /** Creates or merges (idempotent). */
  readonly upsertSubscriber: (input: SubscribeInput) => Promise<void>
  readonly listSubscribers: () => Promise<readonly SubscriberRecord[]>
  readonly countCharitySubscribers: (charityId: string) => Promise<number>

  // List requests
  readonly putListRequest: (request: ListRequestRecord) => Promise<void>
  readonly getListRequest: (charityId: string, id: string) => Promise<ListRequestRecord | undefined>
  /** Newest first. With a charity id, only that charity's. */
  readonly listListRequests: (charityId?: string) => Promise<readonly ListRequestRecord[]>

  // Rate limits
  /** Adds one hit to `key` in `window` and returns the new count. */
  readonly hitRateLimit: (key: string, window: string, expiresAt: number) => Promise<number>
}
