# Dodar prieku: product and system spec

Binding for every package in this repository. Types live in
`services/shared/src/contracts.ts`, the category and needs catalog in
`services/shared/src/catalog.ts`, and boundary validation in
`services/shared/src/validate.ts`. Import them; never redefine a shape.

## What it is

A Latvian-language charity map. Institutions in need (animal shelters, children's
homes, care homes, hospitals, crisis centres...) register, an admin approves them,
and they appear as pins on a map of Latvia. A visitor clicks a pin, opens the
institution's page, sees what it needs and how to deliver it, and ticks the
things they will bring ("Es ziedošu"). Money donations are out of scope.

Language: **Latvian only** (`lv`, single-locale site, so no `/lv` URL prefix).

## Hosts (dev)

| Host | Serves |
| --- | --- |
| `dodarprieku.hagroup.lv` | the public site: map, charity pages, registration, charity account |
| `admin.dodarprieku.hagroup.lv` | the admin portal (a separate Vite app, uploaded under `admin/` in the website bucket) |

One CloudFront distribution answers both hosts (one ACM certificate with both
names). Behaviours:

| Path | Origin | Cache |
| --- | --- | --- |
| `/api/*` | API Gateway HTTP API -> one Lambda (`services/api`) | disabled, all headers but Host, cookies and query forwarded |
| `/media/*` | media bucket (`<prefix>-dodarprieku-media`), OAC | long (keys are immutable) |
| `/data/*` | media bucket, OAC | 60 s (the public snapshot) |
| default | website bucket, OAC, viewer-request function | as the template |

Viewer-request function: on the `admin.` host every path that is not a file
under `/admin/` is rewritten to `/admin/index.html` (the admin SPA, Vite
`base: '/admin/'`); on the public host `/admin` and `/admin/*` answer 404.

Production: not deployed. Google Analytics runs only when
`VITE_GA_MEASUREMENT_ID` is set, which only the prod GitHub Environment will do,
and only after consent.

## Storage: why DynamoDB + S3

Slow-changing, tiny data. DynamoDB on-demand costs nothing measurable at this
size (no idle cost, unlike RDS), and S3 holds photos. The **public map never
touches DynamoDB or Lambda**: every publish writes `data/charities.json`
(`PublicSnapshot`) to the media bucket and CloudFront serves it. Only stats,
pledges, subscriptions, registration and the two portals call the API.

Single table `<prefix>-dodarprieku-data`, `PK`/`SK` strings, GSI1
(`GSI1PK`/`GSI1SK`), TTL attribute `ttl`, point-in-time recovery on.

| Item | PK | SK | GSI1PK / GSI1SK | Notes |
| --- | --- | --- | --- | --- |
| Charity | `CHARITY#<id>` | `META` | `STATUS#<status>` / `<createdAt>` | status, slug, profile (live, or the application while pending), accountEmail, views (ADD counter), pledges (ADD counter), reasons, timestamps |
| Pending update | `CHARITY#<id>` | `UPDATE` | `UPDATES` / `<submittedAt>` | proposed profile; replaced by a newer submission |
| Slug claim | `SLUG#<slug>` | `SLUG` | | conditional put, keeps slugs unique |
| Account | `ACCOUNT#<email>` | `ACCOUNT` | `ROLE#<role>` / `<email>` | role, charityId, passwordHash (scrypt, N=16384, r=8, p=1, 16-byte salt), sessionVersion |
| Token | `TOKEN#<sha256(token)>` | `TOKEN` | | purpose `set-password` or `reset`, email, ttl 7 days (reset: 1 hour); single use |
| Pledge | `CHARITY#<id>` | `PLEDGE#<iso>#<rand>` | `PLEDGES` / `<iso>` | PledgeRecord |
| Pledge per need | `CHARITY#<id>` | `NEEDCOUNT` | | map attribute `byNeed.<key>` ADD |
| Subscriber | `SUBSCRIBER#<email>` | `SUB` | `SUBSCRIBERS` / `<createdAt>` | name, charityIds (string set), consentAt, source |
| Charity subscriber link | `CHARITY#<id>` | `SUB#<email>` | | counted for the charity's dashboard |
| List request | `CHARITY#<id>` | `LISTREQ#<iso>` | `LISTREQS` / `<iso>` | ListRequestRecord |
| Rate limit | `RATE#<scope>#<sha256(ip)>` | `<window>` | | count, ttl; the raw IP is never stored |

## Flows

1. **Register** (`/registreties`): a five-step wizard. (1) Organisation: names,
   reg. number, legal form, public-benefit status, public email, phone, web and
   social links, contact person (private). (2) Category from `CATEGORIES`,
   description, logo and up to six photos (resized in the browser to max 1600px,
   WebP/JPEG, under `LIMITS.uploadMaxBytes`, uploaded through `POST
   /api/uploads`). (3) Address and a pin on the map (drag the pin; optional
   address search). (4) Needs: the category's catalog as grouped tick boxes,
   each ticked item gets an optional note ("tikai jauni dvieļi") and an urgent
   flag; custom items can be added. (5) Delivery: in person (address, hours),
   drop-off point, parcel lockers (provider + a searchable locker from
   `/data/parcel-lockers.json`, several allowed), post. Then the login email,
   terms, submit. Success screen says the admin will review it.
2. **Admin approves** in the portal. The API sets status `approved`, writes
   the snapshot, and emails the account email from `info@hagroup.lv` with a
   link `https://<public host>/konts/parole?token=<token>` (7 days).
3. **Set password**: the page posts the token and a password, the API stores
   the hash, burns the token and logs the charity in.
4. **Charity account** (`/konts`): views, pledges (total and per need), the
   charity's subscribers count, the pledge list (names only of non-anonymous
   pledgers, never emails), the profile editor (same sections as the wizard,
   plus the **sponsor wall** editor: name, URL, logo), and a "request my
   subscribers' list" button. Saving the profile creates a pending update; the
   live profile does not change until the admin approves it. The page says so.
5. **Admin reviews an update**: a side-by-side diff of the live and the
   proposed profile, field by field, then approve (publishes, snapshot) or
   reject (with reason, emailed).
6. **Visitor**: the map (`/`) shows pins with the category icon, clusters
   when zoomed out, filters by category, a list/search panel. A pin opens a
   small popup (photo, name, category, city, three top needs, "Skatīt"). The
   charity page (`/organizacija/<slug>`) shows photos, description, public
   contacts, the needs with notes and urgent badges and live pledge counts,
   delivery options, the sponsor wall, and "Es ziedošu": tick needs, then a
   dialog asks anonymous or named (name shown publicly), optional email for a
   thank-you, an optional message, and offers the newsletter subscription
   ("Kad kaut kas būs ļoti vajadzīgs, mēs jums uzrakstīsim"). Supporters who
   chose a public name are listed. Page view is counted once per browser
   session.
7. **Sponsor leaderboard**: companies on charities' sponsor walls, grouped by
   normalised name (case, quotes and "SIA"/"AS" ignored), ranked by how many
   charities they sponsor. Shown in the map's side panel and on charity pages.
8. **Admin**: dashboard counts; applications (pending); update requests;
   all charities with search and status filter; detail view with every field
   editable (admin edits publish immediately), approve, reject, suspend
   (hidden from the map), restore, delete (confirm, removes media, pledges,
   account); resend the approval email; subscribers (table, CSV export);
   pledges (table, filter by charity); list requests (mark done). Admins log in
   on the admin host. The first admin is created by
   `make admin-invite EMAIL=...` (invokes the Lambda directly with
   `{"task":"invite-admin","email":"..."}`; only an IAM principal can do that).

Emails (SES, `info@hagroup.lv`, plain text + simple HTML, Latvian): approval
with set-password link; password reset; update approved; application or update
rejected with reason; pledge thank-you (only when an email was given); admin
notification of each new application and update to `ADMIN_NOTIFY_EMAIL`
(an SSM parameter, empty = no notification).

## API

Base `/api`. JSON in, `ApiResponse<T>` out. Mutating requests need
`x-dodar-request: 1`. Session: `dodar_session` cookie, HttpOnly, Secure,
SameSite=Strict, Path=/api, 7 days; an HMAC-SHA256 signed token
`{email, role, charityId?, v: sessionVersion, exp}`, secret from SSM
SecureString `/<prefix>/dodarprieku/session-secret`. Rate limits per hashed IP:
applications 5/hour, uploads 40/hour, pledges 20/hour, subscribe 10/hour,
login 10/15 min, forgot 5/hour.

| Method + path | Auth | Body -> data |
| --- | --- | --- |
| `GET /api/charities/:id/stats` | public | -> `CharityStats` |
| `POST /api/charities/:id/view` | public | -> `{}` |
| `POST /api/charities/:id/pledges` | public | `PledgeRequest` -> `{ id }` |
| `POST /api/subscribe` | public | `SubscribeRequest` -> `{}` (idempotent) |
| `POST /api/applications` | public | `ApplicationRequest` -> `ApplicationResponse` |
| `POST /api/uploads` | public (rate limited) | `UploadRequest` -> `UploadResponse` |
| `POST /api/auth/login` | public | `LoginRequest` -> `Me` (+cookie) |
| `POST /api/auth/logout` | any | -> `{}` (clears cookie) |
| `GET /api/auth/me` | session | -> `Me` |
| `POST /api/auth/set-password` | token | `SetPasswordRequest` -> `Me` (+cookie) |
| `POST /api/auth/forgot` | public | `ForgotPasswordRequest` -> `{}` (always, no account enumeration) |
| `GET /api/account` | charity | -> `AccountView` |
| `PUT /api/account/profile` | charity | `CharityProfile` -> `AccountView` |
| `GET /api/account/pledges` | charity | -> `PledgeRecord[]` (no emails) |
| `POST /api/account/list-request` | charity | `{ message? }` -> `ListRequestRecord` |
| `GET /api/admin/charities?status=` | admin | -> `AdminCharitySummary[]` |
| `GET /api/admin/charities/:id` | admin | -> `AdminCharityDetail` |
| `PUT /api/admin/charities/:id/profile` | admin | `CharityProfile` -> `AdminCharityDetail` |
| `POST /api/admin/charities/:id/approve` | admin | -> `AdminCharityDetail` |
| `POST /api/admin/charities/:id/reject` | admin | `ReasonRequest` -> `AdminCharityDetail` |
| `POST /api/admin/charities/:id/suspend` | admin | `ReasonRequest` -> `AdminCharityDetail` |
| `POST /api/admin/charities/:id/restore` | admin | -> `AdminCharityDetail` |
| `POST /api/admin/charities/:id/resend-invite` | admin | -> `{}` |
| `POST /api/admin/charities/:id/update/approve` | admin | -> `AdminCharityDetail` |
| `POST /api/admin/charities/:id/update/reject` | admin | `ReasonRequest` -> `AdminCharityDetail` |
| `DELETE /api/admin/charities/:id` | admin | -> `{}` |
| `GET /api/admin/subscribers` | admin | -> `SubscriberRecord[]` |
| `GET /api/admin/pledges?charityId=` | admin | -> `PledgeRecord[]` |
| `GET /api/admin/list-requests` | admin | -> `ListRequestRecord[]` |
| `POST /api/admin/list-requests/:charityId/:id/done` | admin | -> `ListRequestRecord` |

Status codes: 200, 400 `bad_request`/`validation` (with `fields`), 401, 403,
404, 409 `conflict`, 413 `too_large`, 429 `rate_limited`, 500 `server`. Errors
are logged with a request id; responses never leak internals.

## Public routes (website)

| Path | Page |
| --- | --- |
| `/` | the map (full-height), side panel, "+ Kļūt par labdarības saņēmēju" button top right |
| `/organizacija/:slug` | charity page (client-rendered from the snapshot; prerendered shell) |
| `/registreties` | registration wizard |
| `/konts` | charity dashboard (login form when logged out) |
| `/konts/parole` | set password (from the email link) / reset |
| `/konts/aizmirsu` | forgot password |
| `/par-projektu` | about the project |
| `/legal/*` | privacy, cookies, terms, company (template) |

The footer, on every page: HA Group's other products with small icons (Unveil
`https://unveil.hagroup.lv`, Event App `https://eventapp.lv`, Baltic GP
`https://balticgp.hagroup.lv`, HA Group `https://www.hagroup.lv`), the company
details (SIA HA Group, reg. 40203724866, PVN LV40203724866, Koku iela 10-59,
Rīga, LV-1004, info@hagroup.lv) and the legal links.

## Map

MapLibre GL JS with OpenFreeMap vector tiles (`https://tiles.openfreemap.org`,
free, no key), a light style, centred on Latvia, zoom 6.6, bounded to Latvia
plus margin. Pins are HTML markers or a symbol layer with the category's icon
in a coloured round badge; GeoJSON clustering. This is the one third-party
request of the public site: the privacy and cookie policies say so, and the CSP
allows exactly that origin (`connect-src`, `img-src`, `worker-src blob:`).
Address search in the wizard uses Nominatim (`https://nominatim.openstreetmap.org`,
countrycodes=lv), only when the user presses search.

## Packages and ownership

| Directory | What |
| --- | --- |
| `services/shared` | contracts, catalog, validation (+ tests) |
| `services/api` | Lambda: TypeScript, Node 22, esbuild bundle to `dist/index.mjs`, vitest, aws-sdk v3 |
| `services/frontend/website` | public site (template app) |
| `services/frontend/admin` | admin portal: Vite + React + Tailwind v4, same tokens as the website |
| `services/shared/data/parcel-lockers.json` | locker snapshot, copied to `/data/parcel-lockers.json` at deploy |
| `infrastructure/terraform` | everything in AWS + Zone.ee DNS for both hosts |

`make verify` runs every package's lint, tests with coverage, types and build,
then the pipeline tests and Terraform validation.
