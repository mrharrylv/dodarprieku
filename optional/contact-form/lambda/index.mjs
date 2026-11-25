/**
 * Contact-form handler: validates a submission and emails it via SES.
 *
 * Deployed behind a Lambda Function URL with `authorization_type = "NONE"`,
 * it is a public endpoint, reachable by anyone who finds the URL. Everything
 * here is written on that assumption:
 *
 *   • every field is validated and length-capped server-side, because the
 *     browser's validation is a courtesy to the visitor and nothing more;
 *   • every value is HTML-escaped before it reaches the email body, so a
 *     submission cannot inject markup into your inbox wearing your own
 *     From address;
 *   • the reply-to is set to the sender, but the From is always our own
 *     verified identity: setting From to the submitted address is how a
 *     domain's SPF/DKIM reputation gets destroyed;
 *   • per-IP rate limiting runs in the function, since a client-side limit is
 *     one line of devtools away from being bypassed.
 *
 * Node 20 runtime. No dependencies beyond the AWS SDK, which the runtime
 * provides, so there is no bundling step and no lockfile to drift.
 */
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'

const ses = new SESv2Client({})

const FROM = process.env.MAIL_FROM
const TO = process.env.MAIL_TO
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

/** Must match FIELD_LIMITS in the frontend's config/constants.ts, exactly. */
const LIMITS = {
  name: { min: 2, max: 100 },
  email: { min: 5, max: 254 },
  phone: { min: 0, max: 32 },
  subject: { min: 2, max: 150 },
  message: { min: 10, max: 2000 },
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

/**
 * In-memory per-IP counter.
 *
 * Lives for the lifetime of the execution environment, so it is best-effort:
 * a burst spread across cold starts slips through. That is an accepted limit,
 * this stops the casual script, and SES's own sending quota is the real
 * ceiling. A durable limit would need DynamoDB and is not worth it for a
 * contact form.
 */
const RATE = { windowMs: 10 * 60 * 1000, max: 5 }
const attempts = new Map()

const rateLimited = (ip, now) => {
  const cutoff = now - RATE.windowMs
  const recent = (attempts.get(ip) ?? []).filter((t) => t > cutoff)

  if (recent.length >= RATE.max) {
    const oldest = recent[0]
    return { limited: true, retryAfter: Math.ceil((oldest + RATE.windowMs - now) / 1000) }
  }

  attempts.set(ip, [...recent, now])

  // Stop the map growing without bound across a long-lived container.
  if (attempts.size > 10_000) {
    for (const [key, times] of attempts) {
      if (times.every((t) => t <= cutoff)) attempts.delete(key)
    }
  }

  return { limited: false }
}

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

/** Header injection guard for anything that lands in a header value. */
const singleLine = (value) => String(value).replace(/[\r\n]+/g, ' ').trim()

const validate = (body) => {
  const fields = {}
  const value = (key) => (typeof body[key] === 'string' ? body[key].trim() : '')

  for (const [key, { min, max }] of Object.entries(LIMITS)) {
    const v = value(key)
    if (key === 'phone' && v === '') continue
    if (v.length === 0) fields[key] = `errors.${key}.required`
    else if (v.length < min) fields[key] = `errors.${key}.tooShort`
    else if (v.length > max) fields[key] = `errors.${key}.tooLong`
  }

  const email = value('email')
  if (fields.email === undefined && !EMAIL_PATTERN.test(email)) {
    fields.email = 'errors.email.invalid'
  }

  if (body.consent !== true) fields.consent = 'errors.consent.required'

  return fields
}

const corsHeaders = (origin) => {
  // Echo the origin only when it is on the allow list. A blanket `*` would let
  // any site post to this endpoint using a visitor's browser.
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

export const handler = async (event) => {
  const origin = event.headers?.origin ?? event.headers?.Origin ?? ''
  const method = event.requestContext?.http?.method ?? 'POST'

  if (method === 'OPTIONS') return reply(204, null, origin)
  if (method !== 'POST') return reply(405, { error: 'method_not_allowed' }, origin)

  if (!FROM || !TO) {
    // A misconfigured function must not look like a delivered message.
    console.error('MAIL_FROM or MAIL_TO is not set: refusing to accept submissions')
    return reply(500, { error: 'not_configured' }, origin)
  }

  if (ALLOWED_ORIGINS.length > 0 && !ALLOWED_ORIGINS.includes(origin)) {
    console.warn(`rejected submission from disallowed origin: ${singleLine(origin)}`)
    return reply(403, { error: 'forbidden_origin' }, origin)
  }

  let body
  try {
    body = JSON.parse(event.body ?? '{}')
  } catch {
    return reply(400, { error: 'invalid_json' }, origin)
  }

  if (typeof body !== 'object' || body === null) {
    return reply(400, { error: 'invalid_body' }, origin)
  }

  const ip = event.requestContext?.http?.sourceIp ?? 'unknown'
  const limit = rateLimited(ip, Date.now())
  if (limit.limited) {
    return {
      statusCode: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(limit.retryAfter),
        ...corsHeaders(origin),
      },
      body: JSON.stringify({ retryAfter: limit.retryAfter }),
    }
  }

  const fields = validate(body)
  if (Object.keys(fields).length > 0) {
    return reply(400, { fields }, origin)
  }

  const name = String(body.name).trim()
  const email = String(body.email).trim().toLowerCase()
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const subject = String(body.subject).trim()
  const message = String(body.message).trim()
  const locale = typeof body.locale === 'string' ? body.locale.slice(0, 8) : 'n/a'

  const rows = [
    ['Name', name],
    ['Email', email],
    ['Phone', phone || ', '],
    ['Language', locale],
    ['IP', ip],
  ]

  const html = `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#111">
  <h2 style="margin:0 0 16px">${escapeHtml(subject)}</h2>
  <table style="border-collapse:collapse;margin-bottom:20px">
    ${rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:4px 16px 4px 0;color:#666">${escapeHtml(label)}</td>` +
          `<td style="padding:4px 0"><strong>${escapeHtml(value)}</strong></td></tr>`,
      )
      .join('')}
  </table>
  <div style="white-space:pre-wrap;padding:16px;background:#f6f6f8;border-radius:8px">${escapeHtml(
    message,
  )}</div>
</body></html>`

  const text = [
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    message,
  ].join('\n')

  try {
    await ses.send(
      new SendEmailCommand({
        // From is ALWAYS our verified identity. Reply-To carries the sender, so
        // hitting reply reaches them, without us claiming to be them.
        FromEmailAddress: FROM,
        Destination: { ToAddresses: [TO] },
        ReplyToAddresses: [email],
        Content: {
          Simple: {
            Subject: { Data: singleLine(`[${locale}] ${subject}`), Charset: 'UTF-8' },
            Body: {
              Html: { Data: html, Charset: 'UTF-8' },
              Text: { Data: text, Charset: 'UTF-8' },
            },
          },
        },
      }),
    )
  } catch (error) {
    // Log the detail for whoever is on call; tell the visitor only that it
    // failed, so an SES error message never reaches a stranger's browser.
    console.error('SES send failed', error)
    return reply(502, { error: 'send_failed' }, origin)
  }

  console.log(`contact form delivered: ${singleLine(email)} (${locale})`)
  return reply(200, { ok: true }, origin)
}
