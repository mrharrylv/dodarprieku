import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { parseAnalyticsEndpoint } from './env'
import { ANALYTICS_ENDPOINT } from './site'

/**
 * The browser sends visit statistics only to an origin the CSP's connect-src
 * names, and the CSP is Terraform's. An endpoint in site.ts that the CSP does
 * not allow fails silently on every page of the live site and nowhere else,
 * so the two are held together here.
 */
const VARIABLES = readFileSync(
  join(__dirname, '..', '..', '..', '..', '..', 'infrastructure', 'terraform', 'variables.tf'),
  'utf8',
)
const MAIN = readFileSync(
  join(__dirname, '..', '..', '..', '..', '..', 'infrastructure', 'terraform', 'main.tf'),
  'utf8',
)

const terraformDefault = (): string => {
  const block = /variable "analytics_origin" \{[\s\S]*?default\s*=\s*"([^"]*)"/.exec(VARIABLES)
  if (block === null) throw new Error('variable "analytics_origin" with a default is missing from variables.tf')
  return block[1] ?? ''
}

describe('analytics origin', () => {
  it('the CSP allows the origin site.ts reports to', () => {
    const expected = ANALYTICS_ENDPOINT === null ? '' : new URL(ANALYTICS_ENDPOINT).origin
    expect(terraformDefault()).toBe(expected)
  })

  it('main.tf puts it in connect-src', () => {
    expect(MAIN).toContain(`join(" ", compact(["connect-src 'self'", var.analytics_origin]))`)
  })
})

describe('parseAnalyticsEndpoint', () => {
  const fallback = 'https://crm.hagroup.lv/api/track'

  it('uses the site.ts endpoint when the variable is unset', () => {
    expect(parseAnalyticsEndpoint(undefined, fallback)).toBe(fallback)
    expect(parseAnalyticsEndpoint('  ', fallback)).toBe(fallback)
    expect(parseAnalyticsEndpoint(undefined, null)).toBeNull()
  })

  it.each(['off', 'OFF', 'none', 'false', '0'])('turns statistics off for %j', (raw) => {
    expect(parseAnalyticsEndpoint(raw, fallback)).toBeNull()
  })

  it('takes another https endpoint', () => {
    expect(parseAnalyticsEndpoint('https://crm.example.lv/t', fallback)).toBe('https://crm.example.lv/t')
  })

  it('treats a malformed or plain-http endpoint as off, never as the default', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(parseAnalyticsEndpoint('http://crm.hagroup.lv/api/track', fallback)).toBeNull()
    expect(parseAnalyticsEndpoint('not a url', fallback)).toBeNull()
    expect(quiet).toHaveBeenCalledTimes(2)
  })
})
