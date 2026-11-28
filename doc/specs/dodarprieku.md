# Dod ar prieku: product and system spec

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
| `dodarprieku.hagroup.lv` | the public site: the map, with registration, the charity account and every charity as panels over it |
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
| Charity | `CHARITY#<id>` | `META` | `STATUS#<status>` / `<createdAt>` | status, slug, profile (live, or the application while pending), accountEmail, views (ADD counter), pledges (ADD counter), reasons, timestamps; `source` on an imported one, `claimCharityId` on a claim application, `claimedAt` once a claim merged into it |
| Pending update | `CHARITY#<id>` | `UPDATE` | `UPDATES` / `<submittedAt>` | proposed profile; replaced by a newer submission |
| Slug claim | `SLUG#<slug>` | `SLUG` | | conditional put, keeps slugs unique |
| Account | `ACCOUNT#<email>` | `ACCOUNT` | `ROLE#<role>` / `<email>` | role, charityId, passwordHash (scrypt, N=16384, r=8, p=1, 16-byte salt), sessionVersion |
| Token | `TOKEN#<sha256(token)>` | `TOKEN` | | purpose `set-password` or `reset`, email, ttl 7 days (reset: 1 hour); single use |
| Pledge | `CHARITY#<id>` | `PLEDGE#<iso>#<rand>` | `PLEDGES` / `<iso>` | PledgeRecord |
| Pledge per need | `CHARITY#<id>` | `NEEDCOUNT` | | map attribute `byNeed.<key>` ADD |
| Subscriber | `SUBSCRIBER#<email>` | `SUB` | `SUBSCRIBERS` / `<createdAt>` | name, charityIds (string set), general (the general newsletter; once true it stays true; a record without it is general when it has no charityIds), consentAt, source |
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
   small popup (photo, name, category, city, three top needs, "Skatīt
   vajadzības"), which expands in place, wider (30rem on a wide screen, never
   past the map's visible part beside a dock) and taller, or as a sheet on a
   phone, into the description, public contacts, the needs with notes and
   urgent badges and live pledge counts, delivery options, the sponsor wall,
   the newsletter, "Kopēt saiti" and, for an imported charity nobody has
   claimed, "Pieprasīt profilu". A compact sticky header stays at the top of
   the expanded card as it scrolls: a pill with the category icon and the
   name, the collapse button and a small close X (Harry, 2026-11-26).
   "Es ziedošu" is steps inside the same card, never a second dialog: (1) tick
   needs and press "Es ziedošu"; (2) a page of the card with a back arrow:
   "Ziņojums" (optional) first, then "Anonīmi" or "Ar vārdu" (the name, and
   an optional "Uzņēmums" shown publicly beside it as "Vārds (Uzņēmums)"),
   an optional email for a thank-you in either mode, and two tick boxes,
   "Vēlos saņemt jaunumus par šo iestādi" and "Saņemt arī vispārējos
   jaunumus", which need the email and the consent; (3) the thank-you, which
   does not offer the newsletter again. The ticks survive a trip back from
   step 2. Supporters who chose a public name are listed. The expanded card's
   view is counted once per browser session.
7. **Sponsor leaderboard**: companies on charities' sponsor walls, grouped by
   normalised name (case, quotes and "SIA"/"AS" ignored), ranked by how many
   charities they sponsor. Shown in the map's leaderboard panel.
8. **Admin**: dashboard counts; applications (pending); update requests;
   all charities with search and status filter; detail view with every field
   editable (admin edits publish immediately), approve, reject, suspend
   (hidden from the map), restore, delete (confirm, removes media, pledges,
   account); resend the approval email; subscribers (table, CSV export);
   pledges (table, filter by charity); list requests (mark done). Admins log in
   on the admin host. The first admin is created by
   `make admin-invite EMAIL=...` (invokes the Lambda directly with
   `{"task":"invite-admin","email":"..."}`; only an IAM principal can do that).
9. **Claim an imported profile**: a charity imported from a public register
   (`source` `import:<dataset>`, no account) is `claimable` in the snapshot,
   and its card (small and expanded) offers "Vai šī ir jūsu iestāde?
   Pieprasīt profilu". That opens the registration dock at
   `/registreties?pieprasit=<slug>`, filled in from the public profile (name,
   legal name, registration number, legal form, address, pin, category,
   public contacts) under the banner "Jūs pieprasāt esošu profilu: <name>".
   Submitting sends `claimCharityId`; the API checks the target exists, is
   approved, imported and unclaimed, and stores a pending application with
   `claimCharityId`. A claim reserves no slug of its own: it carries the
   target's, so rejecting or deleting one never holds or frees a name.
   Several claims may wait for one charity, and the button
   stays until one is approved. The admin's application list marks it
   ("Pieprasījums esošam profilam: <name>"), and its page links to the
   charity and shows the field-by-field diff of the imported profile against
   the submitted one. Nothing in the claim proves the claimant runs the
   institution, so **the admin must check before approving**: the page
   compares the claimant's email with the imported profile's public email and
   website (a webmail address counts only when it is the exact public one) and
   always asks for a call to the public phone or a message to the public email.
   Approving a claim merges it into the imported charity:
   its id, slug, views and pledges stay, the profile becomes the submitted
   one, `accountEmail` is set, `source` and `demoNeeds` are removed and
   `claimedAt` set (so a re-import never overwrites it), the claim record
   goes, every other pending claim for it is rejected with a reason
   email, the usual set-password email goes out and the snapshot is rebuilt;
   the button then disappears. The merge is written first, as a conditional
   write that holds only while the charity is still imported and unclaimed
   (two approvals racing for one charity: the second gets 409), and the
   account after it; a retry after a failed later step finds its own merge
   and finishes the rest.

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
| `POST /api/applications` | public | `ApplicationRequest` -> `ApplicationResponse`; with `claimCharityId`, a claim (400 `claimCharityId: invalid` unless the target is approved, imported and unclaimed) |
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
| `POST /api/admin/charities/:id/approve` | admin | -> `AdminCharityDetail`; for a claim, the merged imported charity (its own id), 409 when it was claimed meanwhile |
| `POST /api/admin/charities/:id/reject` | admin | `ReasonRequest` -> `AdminCharityDetail` |
| `POST /api/admin/charities/:id/suspend` | admin | `ReasonRequest` -> `AdminCharityDetail` |
| `POST /api/admin/charities/:id/restore` | admin | -> `AdminCharityDetail` |
| `POST /api/admin/charities/:id/resend-invite` | admin | -> `{}` |
| `POST /api/admin/charities/:id/update/approve` | admin | -> `AdminCharityDetail` |
| `POST /api/admin/charities/:id/update/reject` | admin | `ReasonRequest` -> `AdminCharityDetail` |
| `DELETE /api/admin/charities/:id` | admin | -> `{}` |
| `GET /api/admin/subscribers?scope=general\|all` | admin | -> `SubscriberRecord[]` (`general`: the general newsletter's; `all`, the default: everyone) |
| `GET /api/admin/charities/:id/subscribers` | admin | -> `SubscriberRecord[]` (that organisation's) |
| `GET /api/admin/pledges?charityId=` | admin | -> `PledgeRecord[]` |
| `GET /api/admin/list-requests` | admin | -> `ListRequestRecord[]` |
| `POST /api/admin/list-requests/:charityId/:id/done` | admin | -> `ListRequestRecord` |

Status codes: 200, 400 `bad_request`/`validation` (with `fields`), 401, 403,
404, 409 `conflict`, 413 `too_large`, 429 `rate_limited`, 500 `server`. Errors
are logged with a request id; responses never leak internals.

## Public routes (website)

One page: the map. Every other address opens the map with a panel over it
(Harry, 2026-11-26), so a link still works and can still be shared, but no
panel is a page of its own: each of these prerendered shells names `/` as its
canonical, and the sitemap and `llms.txt` list `/` only.

| Path | What opens |
| --- | --- |
| `/` | the map, full screen with no site header or footer: a floating top bar (logo, search, category chips), "+ Kļūt par saņēmēju" with "Mans konts" under it top right, and a rail on the left that opens one floating panel at a time (top supporters, newsletter, info) |
| `/organizacija/:slug` | the map flown to that charity, its card open; expanded with `?vajadzibas=1`, which "Kopēt saiti" adds (it copies the absolute address). The CloudFront function serves the `/organizacija` shell for every slug |
| `/registreties` | the registration wizard, docked on the right; `?pieprasit=<slug>` claims that imported charity |
| `/konts` | the account, docked on the right: the login form, then status, stats, pledges, the profile editor with the sponsor wall, the list request and logout |
| `/konts/parole?token=` | set password (the approval and reset emails link here), in the account panel |
| `/konts/aizmirsu` | forgot password, in the account panel |
| `/par-projektu` | the info panel (its three tabs hold everything the old about page said); the address then settles on `/` |
| `/legal/*` | privacy, cookies, terms, company: pages of their own, in the site's header and footer |

The registration and account panels dock on the right half of a wide screen
(half the width, never under 30rem, from 64rem up) and are a full-screen
sheet below that. They are not modal: a click on the map does not close them
(only their X does) and the map stays usable. While one is open the map takes
its width as padding (`map.setPadding`, eased in and out), so fly-tos,
cluster zooms and the charity card centre in the visible left part; the top
bar keeps to that part and the register button is hidden. Docked beside the
map, the top bar is compact (Harry, 2026-11-26): the brand is its mark alone,
the search a magnifier that opens into the field, and "Ko vajag" and the
category chips are two dropdown pills (the category one lists the
categories with icons and counts). When the dock closes it all opens out
again, animated unless the visitor asked for reduced motion.

"+ Kļūt par saņēmēju" is hidden from anyone logged in (top right and in the
info panel): an admin never logs in on the public host, and a charity has an
organisation already. The session cookie is HttpOnly, so a local storage hint
(`dodarprieku.signed-in`, set whenever a session is seen, cleared on logout or
a failed check) decides whether to ask `GET /api/auth/me` at all: an anonymous
visitor sends no request, and a signed-in one has the button hidden from the
first hydrated paint while the API confirms it.

The wordmark is "dod ar prieku", all lowercase, wherever the name is the
logo (the floating brand, the header, the admin portal, the favicon and the
share card); in a sentence the name is written "Dod ar prieku".

The footer, on every page: HA Group's other products with small icons (Unveil
`https://unveil.hagroup.lv`, EventApp `https://eventapp.lv`, Baltic GP
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

Every cluster knows its composition exactly (MapLibre `clusterProperties`,
one count per category). A cluster whose charities all share one category is
that category's badge, a little larger than a pin, with the count on it; only
a cluster that mixes categories is an accent heart with the count inside,
clearly larger than a pin (52px for two, growing gently to 68px). There is no
majority guess: a 1-1 pair is mixed (Harry, 2026-11-26: a soup kitchen and an
"other" 40 m apart in Grobiņa showed as a soup kitchen "2"). Charities at the
same address (within 2 m of each other) are drawn on a small ring (12 m, wider
for a crowd so neighbours stay 15 m apart, a pin at zoom 17) round it, so
each becomes its own pin when the map is close, and clusters last until zoom
16. Two clustered copies of the data: a coarse one for the country view and a
fine one (60px) from zoom 9, or whenever the coarse one leaves fewer than 5
markers on screen. The coarse radius is a distance: 45 km on the ground at the
zoom the country view opens on, converted to pixels for that zoom (135px on a
1440px desktop), never under 48px so a phone's markers do not overlap, and
halving in distance with each zoom in. With the 1024 imported charities that
is about 21 groups on a 1440px desktop and 10 on a 390px phone (Harry,
2026-11-26: "about 50 km", roughly 12-25 groups; the earlier width-based 160px
left five hearts). The radius is worked out again when the map changes size
(a phone turned, a window resized), and the coarse source rebuilt when it
moves by more than 15%. A group of more than 150 is drawn as its children one
zoom further in, as long as those stay at least 56px apart on screen: on a
desktop that splits Riga's 353 into central Riga (296), Jūrmala (19) and two
groups south of it. Central Riga cannot split further at the country view
without its hearts overlapping (it is about 10 km, some 30px, across), so it
stays one heart there, and on a phone (397, where no split fits) until the
visitor zooms in. It splits from zoom 9. Only the markers in
or just around the view are drawn, worked out at most every 120ms while the
map moves.

Only organisations with open needs are on the map at the country and
regional views, and only they form and count in the clusters (hearts, badges
and the chips' numbers). Organisations without needs appear from zoom 13 as
the same category pin, smaller, desaturated and paler, under the others,
still a button that opens the card ("..., nav norādītu vajadzību"); they
never join a cluster (Harry, 2026-11-26). They are thinned on screen: none
within 40px of an active marker or of another faded pin, and at most 40 in
view, so they stay a quiet background and the tab order stays short. "Cita organizācija" is a warm
brown, so it never reads as one of those.

Beside the category chips, "Ko vajag" opens a list of need kinds with check
boxes (Apģērbs un apavi, Pārtika, Higiēna un tīrīšana, Tekstils un gultas
veļa, Rotaļlietas un brīvais laiks, Mācību lietas, Dzīvnieku barība un aprūpe,
Medicīna un aprūpe, Mājai un tehnika, Brīvprātīgie un transports); "Visas
vajadzības" clears them. Every catalog group maps to one kind, with a few
items mapped on their own (`NEED_GROUP_KIND`, `NEED_ITEM_KIND` in the shared
catalog). An organisation matches when any of its needs is of a ticked kind;
the kinds combine with the category (AND), and a ticked kind hides the
organisations without needs.

While any published charity has `demoNeeds: true` (dev's `make demo-needs`,
or `make run`'s seed), a tiny "Testa vide" pill sits at the bottom centre
of the visible map, under the pins' usual places and clear of the zoom
buttons and the attribution; pressed, it opens into "Testa vide: daļa
vajadzību ir izdomātas demonstrācijai." Production never has one: the API
refuses the demo tasks there.

The left rail holds the leaderboard, the newsletter and the project info;
there is no organisations panel (Harry, 2026-11-26). "Mans konts" sits on the
right, under "+ Kļūt par saņēmēju", because both open the panel docked on the
right (Harry, 2026-11-28); on a phone the two sit side by side at the bottom.
The docked panel slides in from the right edge in one slow motion (450 ms),
the map easing its padding over the same time, and slides back out the same
way; the buttons under it fade rather than vanish. The category chips scroll
sideways by finger, mouse wheel or mouse drag, and a chevron at the row's
right end lays every chip out at once. "Pieprasīt profilu" is the same accent
pill as "+ Kļūt par saņēmēju". Typing in the
search opens the matching organisations under the field, each one a fly-to.
The newsletter sign-up in the expanded charity card sends that charity's id,
like the box after a pledge, and offers "Saņemt arī vispārējos jaunumus"
(`general`); the rail's sign-up is always general. The admin portal lists
the general newsletter and everyone (a column per organisation) on
"Abonenti", and each organisation's own subscribers on its detail page, each
with a CSV.

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
