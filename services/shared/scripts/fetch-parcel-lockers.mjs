#!/usr/bin/env node
// Regenerates services/shared/data/parcel-lockers.json from the providers' public feeds.
// Plain Node 22, global fetch, no dependencies. Reads JSON only; nothing downloaded is executed.
//
//   node services/shared/scripts/fetch-parcel-lockers.mjs           # writes the file
//   node services/shared/scripts/fetch-parcel-lockers.mjs --dry-run # prints counts only
//
// A provider whose feed fails makes the whole run fail, so a partial snapshot never
// silently replaces a complete one. DPD, Latvijas Pasts and Smartposti publish no open
// feed (their APIs need a contract or a login), so they are not fetched: see data/README.md.

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { SOURCES, countByProvider, finalise, normaliseRows, serialise } from './parcel-lockers-lib.mjs'

const OUTPUT = fileURLToPath(new URL('../data/parcel-lockers.json', import.meta.url))
const TIMEOUT_MS = 60_000
const MIN_PER_PROVIDER = 50

const fetchJson = async (provider, url) => {
  const res = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'dodarprieku-locker-snapshot/1.0' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`${provider}: HTTP ${res.status} from ${url}`)
  try {
    return await res.json()
  } catch (err) {
    throw new Error(`${provider}: response from ${url} is not JSON (${err.message})`)
  }
}

const fetchProvider = async ([provider, url]) => {
  const rows = await fetchJson(provider, url)
  const lockers = normaliseRows(provider, rows)
  if (lockers.length < MIN_PER_PROVIDER) {
    throw new Error(`${provider}: only ${lockers.length} Latvian points, expected at least ${MIN_PER_PROVIDER}`)
  }
  return lockers
}

const main = async () => {
  const dryRun = process.argv.includes('--dry-run')
  const perProvider = await Promise.all(Object.entries(SOURCES).map(fetchProvider))
  const lockers = finalise(perProvider.flat())
  const counts = countByProvider(lockers)
  console.log(JSON.stringify({ total: lockers.length, ...counts }))
  if (dryRun) return
  await writeFile(OUTPUT, serialise(lockers), 'utf8')
  console.log(`wrote ${OUTPUT}`)
}

main().catch((err) => {
  console.error(`fetch-parcel-lockers failed: ${err.message}`)
  process.exitCode = 1
})
