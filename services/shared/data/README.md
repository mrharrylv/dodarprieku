# Shared data

## parcel-lockers.json

A snapshot of parcel lockers and pickup points in Latvia, used by the profile form's
locker search. The deploy copies it to `/data/parcel-lockers.json`.

Each entry: `{ provider, id, name, address, city, lat?, lng? }`. `provider` is one of the
`ParcelProvider` ids in `src/contracts.ts`; `id` is the provider's own id for the point.
Sorted by provider, then city, then name (Latvian collation); unique by provider and id.
Coordinates outside Latvia's bounding box are left out rather than kept.

**Fetched:** 2026-11-25.

| Provider | Points | Source |
| --- | --- | --- |
| Omniva | 418 | `https://www.omniva.ee/locations.json`, rows with `A0_NAME` = `LV`. Id is Omniva's `ZIP` (the locker code). |
| Venipak | 402 | `https://go.venipak.lt/ws/get_pickup_points?country=LV`. Lockers (`type` 3) and staffed pickup points (`type` 1). Id is Venipak's numeric `id`. |
| DPD | 0 | No open feed. The pickup-point list is in DPD's eserviss / Interconnector API, for contracted clients only. |
| Latvijas Pasts | 0 | No open feed. The map at mans.pasts.lv/postal-network reads an API that answers 401 without a session. |
| Smartposti | 0 | No open feed. The old open Location API (locationservice.posti.com) was retired on 2026-03-31; the replacement Pickup Point API (gateway.posti.fi) needs credentials. |

For the three providers without a feed, the form lets the charity type a locker by hand.
To add one later, write its normaliser in `scripts/parcel-lockers-lib.mjs`, add its URL to
`SOURCES` and a test, then refresh.

## Refreshing

```bash
node services/shared/scripts/fetch-parcel-lockers.mjs --dry-run   # counts only
node services/shared/scripts/fetch-parcel-lockers.mjs             # rewrites the file
node --test services/shared/scripts/parcel-lockers-lib.node-test.mjs
```

Node 22 or later, no dependencies. The script fails, and writes nothing, if any feed is
unreachable, is not JSON, or yields fewer than 50 Latvian points, so a broken feed never
replaces a good snapshot with a partial one. Update the date and counts above after a refresh.
