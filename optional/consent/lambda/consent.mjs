/**
 * Records a consent decision in DynamoDB.
 *
 * The point of this record is Art. 7(1): the controller must be able to
 * demonstrate that consent was given. So it stores WHAT was agreed to, WHEN,
 * and to WHICH VERSION of the policy, and no more than that.
 *
 * Deliberately NOT stored: no name, no email, no cookie identifier tying this
 * to a person. A pseudonymous id plus a hashed IP is enough to evidence that a
 * decision was made; building a profile of who consented to what would make
 * the consent record its own privacy problem.
 */
import { createHash } from 'node:crypto'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}))

const TABLE = process.env.TABLE_NAME
const TTL_DAYS = Number(process.env.TTL_DAYS ?? 365)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

const corsHeaders = (origin) => {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed ?? '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

const reply = (statusCode, body, origin) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  body: JSON.stringify(body ?? {}),
})

/**
 * A salted hash, never the raw address.
 *
 * The raw IP is personal data in its own right (Breyer, C-582/14). Hashing with
 * the table name as salt keeps the record useful: the same visitor deciding
 * twice is visibly the same visitor, without storing an identifier that points
 * back at a person.
 */
const pseudonymise = (ip) =>
  createHash('sha256').update(`${TABLE}:${ip}`).digest('hex').slice(0, 32)

export const handler = async (event) => {
  const origin = event.headers?.origin ?? event.headers?.Origin ?? ''
  const method = event.requestContext?.http?.method ?? 'POST'

  if (method === 'OPTIONS') return reply(204, null, origin)
  if (method !== 'POST') return reply(405, { error: 'method_not_allowed' }, origin)

  if (!TABLE) {
    console.error('TABLE_NAME is not set: refusing to accept consent records')
    return reply(500, { error: 'not_configured' }, origin)
  }

  if (ALLOWED_ORIGINS.length > 0 && !ALLOWED_ORIGINS.includes(origin)) {
    return reply(403, { error: 'forbidden_origin' }, origin)
  }

  let body
  try {
    body = JSON.parse(event.body ?? '{}')
  } catch {
    return reply(400, { error: 'invalid_json' }, origin)
  }

  const consent = body?.consent
  if (typeof consent !== 'object' || consent === null) {
    return reply(400, { error: 'missing_consent' }, origin)
  }

  // Copy only booleans, and only for keys we recognise. Writing the submitted
  // object straight through would let anyone store arbitrary data in the table.
  const CATEGORIES = ['necessary', 'analytics', 'embeds']
  const decision = Object.fromEntries(
    CATEGORIES.map((key) => [key, consent[key] === true]),
  )

  const now = Date.now()
  const ip = event.requestContext?.http?.sourceIp ?? 'unknown'

  try {
    await db.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          id: pseudonymise(ip),
          at: now,
          consent: decision,
          version: Number.isFinite(body.version) ? body.version : 0,
          user_agent: String(event.headers?.['user-agent'] ?? '').slice(0, 256),
          // DynamoDB TTL is in SECONDS, not milliseconds. Passing milliseconds
          // sets an expiry ~50,000 years out and the record is never deleted.
          expires_at: Math.floor(now / 1000) + TTL_DAYS * 24 * 60 * 60,
        },
      }),
    )
  } catch (error) {
    console.error('consent write failed', error)
    return reply(502, { error: 'write_failed' }, origin)
  }

  return reply(200, { ok: true }, origin)
}
