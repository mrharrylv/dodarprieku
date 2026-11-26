# Dod ar prieku API

One Node 22 Lambda behind API Gateway (HTTP API, payload 2.0), reached through
CloudFront at `/api/*`. The endpoints, item shapes and flows are in
[`doc/specs/dodarprieku.md`](../../doc/specs/dodarprieku.md); the request and
response types come from [`services/shared/src`](../shared/src).

## Commands

```bash
npm install
npm run dev            # http://localhost:8787, in-memory data, emails printed to the terminal
npm run lint
npm run typecheck
npm run test           # vitest
npm run test:coverage  # thresholds: 80% lines, functions, statements; 75% branches
npm run build          # esbuild -> dist/index.mjs (ESM; @aws-sdk/* left to the runtime)
```

## Local dev server

`npm run dev` serves `/api/*` through the same handlers, plus
`/data/charities.json` and `/media/*` from memory. It is seeded with six
approved sample charities (Rīga, Jelgava, Liepāja, Daugavpils, Valmiera, Cēsis),
two pending applications and two accounts, both with the password
`dev-password-123`:

| Account | Role |
| --- | --- |
| `admin@example.com` | admin |
| `charity@example.com` | charity (the Rīga shelter) |

Cookies drop `Secure` locally, so they work over plain http. Allowed origins
are `PUBLIC_ORIGIN` (default `http://localhost:5173`), `ADMIN_ORIGIN` (default
`http://localhost:5174`) and any localhost port. Point the Vite dev servers'
`/api`, `/data` and `/media` proxies at `http://localhost:8787`. `PORT`
changes the port.

## Configuration (validated at cold start)

| Variable | Meaning |
| --- | --- |
| `TABLE_NAME` | the single DynamoDB table |
| `MEDIA_BUCKET` | media bucket: `media/uploads/...` and `data/charities.json` |
| `PUBLIC_ORIGIN` | `https://dodarprieku.hagroup.lv` |
| `ADMIN_ORIGIN` | `https://admin.dodarprieku.hagroup.lv` |
| `MAIL_FROM` | `Dod ar prieku <info@hagroup.lv>` |
| `SESSION_SECRET_PARAM` | SSM SecureString name, at least 32 characters, read once per container |
| `ADMIN_NOTIFY_EMAIL_PARAM` | SSM String name; empty variable, or a value of `none`, turns notifications off |
| `ENVIRONMENT` | `dev`, `prod`; `local` only for the dev server |

## Layout

| Path | What |
| --- | --- |
| `src/index.ts` | Lambda entry: real AWS clients |
| `src/lambda.ts` | HTTP events to the app, direct invocations to `tasks.ts` |
| `src/app.ts`, `src/routes.ts` | pipeline (CSRF header, Origin, body size, envelope) and the route table |
| `src/handlers/` | one file per area: public, applications, auth, account, admin |
| `src/domain/` | slugs, snapshot and sponsor leaderboard, uploads, rate limits, views, side effects |
| `src/repo/` | `Repository` interface, `memory.ts`, `dynamo/` (single table) |
| `src/storage/`, `src/mail/` | S3 or memory; SES v2 or memory; Latvian email templates |
| `src/dev/` | the local server and its seed |

## Behaviour worth knowing

- Mutations need `x-dodar-request: 1`; a browser `Origin` other than the two
  hosts is refused with 403.
- The client IP for rate limits is `CloudFront-Viewer-Address`, then the last
  `X-Forwarded-For` entry. Only an HMAC of it is stored.
- Mail, snapshot and media cleanup never undo the database change before them.
  Approve, reject and the update decisions return `mailSent`; publishing
  actions return `snapshotWritten`.
- Honeypot submissions (`website` filled) get a normal-looking success and are
  dropped.

## Direct tasks

```bash
scripts/admin-invite.sh <function-name> <email>   # {"task":"invite-admin","email":...}
aws lambda invoke --function-name <fn> --cli-binary-format raw-in-base64-out \
  --payload '{"task":"rebuild-snapshot"}' /dev/stdout
```

## Imported register charities

`data/imported-charities.json` holds the charities of the public registers
(LM Sociālo pakalpojumu sniedzēju reģistrs, Uzņēmumu reģistrs), one per line,
as `{ id: "imp-<location_id>", slug, profile, source }`. They are shown as
approved, with no needs, no photos and no account: `accountEmail` is `''`, so
nothing is ever mailed to them (`sendMail` skips an empty recipient, and
resend-invite answers `validation` / `accountEmail: required`). Their profiles
pass `isImportedProfile` (`src/domain/imported.ts`), not `validateProfile`, so
an admin edit needs the missing fields filled in first.

```bash
npm run import:csv                      # ../../charity-map-2026-11-25.csv -> data/imported-charities.json
make run                                # loads them locally (SEED_IMPORT=0 make run leaves them out)
make import-charities ENV=dev           # scripts/import-to-env.sh: 100 per call, then rebuild-snapshot
make remove-imported ENV=dev            # scripts/remove-imported.sh: deletes only that source, then rebuilds
```

The tasks behind them: `{"task":"import-charities","items":[...]}` (at most
200 items, idempotent, never overwrites a charity that was not imported, keeps
an admin's suspension) and `{"task":"remove-imported","source":"import:...","limit":50}`
(rebuilds the snapshot when none remain).

## Demo needs (dev and local only)

The imported charities have no needs, so on their own every one of them is a
greyed-out pin. For a demonstration, a deterministic share of one import
source gets 2-6 made-up needs from its own category's catalog (some urgent,
some with a short note) and `demoNeeds: true`, which the snapshot carries and
the map announces with "Testa vide: daļa vajadzību ir izdomātas demonstrācijai."

```bash
make run                                # a quarter of the imported get demo needs (SEED_DEMO_NEEDS=0 make run leaves them without)
make demo-needs ENV=dev                 # scripts/demo-needs.sh apply: DEMO_FRACTION=0.25, DEMO_SEED=1
make clear-demo-needs ENV=dev           # scripts/demo-needs.sh clear: every demoNeeds charity back to no needs
```

The tasks behind them: `{"task":"demo-needs","source":"import:...","fraction":0.25,"seed":1}`
(the same seed picks the same charities and needs every time; a run with
another seed or share replaces the last pick; a charity with real needs is
never touched) and `{"task":"clear-demo-needs"}`. Both rebuild the snapshot.
Both are refused when the function's `ENVIRONMENT` is `prod`, the make targets
refuse `ENV=prod`, and the script refuses a `prod-*` function. A profile
really saved (an admin edit, an approved update) drops the flag
(`withSavedProfile`), so `clear-demo-needs` never empties real needs and the
map's demo notice goes once no demo needs are left.
