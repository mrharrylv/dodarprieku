# Visit tracking: the site side and the CRM contract

Every site built from this template reports its visits to HA Group's private
CRM, so Harry can see when a client opened the preview he sent, which pages
they read, for how long, where they came from and on what kind of device. No
Google Analytics and no third party: the page talks to `crm.hagroup.lv` and to
nothing else.

This file is the contract between the two sides. The site side is written and
tested here. The CRM side (the `HA agent` project) implements the endpoint
described under "The endpoint" and must keep the promises under "What the CRM
must do", because the site's privacy and cookie policies make them, in three
languages, on the CRM's behalf.

## What a site does

| Piece | File |
| --- | --- |
| Where reports go | `ANALYTICS_ENDPOINT` in `src/config/site.ts`, default `https://crm.hagroup.lv/api/track` |
| Override per build | `VITE_ANALYTICS_ENDPOINT` (a GitHub Environment variable): another https URL, or `off` |
| What one report says | `src/lib/analytics.ts` (pure, every field built and capped there) |
| One visit's state | `src/lib/tracker.ts` (in memory only) |
| Sending | `src/lib/beacon.ts`: `sendBeacon`, else `fetch` with `keepalive`; never throws |
| Wiring | `src/hooks/useVisitTracker.ts`, mounted once by `SiteChrome`, so every style has it |
| CSP | `analytics_origin` in `infrastructure/terraform/variables.tf`, default `https://crm.hagroup.lv`, added to `connect-src` |
| Legal copy | `privacy.statistics`, `privacy.collected.bodyWithStats`, `privacy.sharing.statistics`, `cookies.statistics` in every `legal.json`; shown only while statistics are on |
| Size | About 1 KB gzip of code, loaded with the app, run after hydration |

**When nothing is sent:** a development server, any localhost address
(`make preview`, `make a11y` included), an automated browser
(`navigator.webdriver`), a visitor whose browser sends Global Privacy Control
or Do Not Track, and a build with the endpoint `null` or `off`.

**To keep your own visits out:** turn on "Do Not Track" (Chrome: Settings,
Privacy and security, Third-party cookies, Send a "Do Not Track" request) or
Global Privacy Control (Firefox, Brave, DuckDuckGo) in the browser you check
previews with.

**To tell clients' opens apart:** add `?ref=<anything>` to the link you send,
for example `https://westamarine.hagroup.lv/?ref=offer-2026-11`. The landing
page view carries it as `campaign.ref`; `utm_source`, `utm_medium` and
`utm_campaign` are passed the same way. No other query parameter ever leaves
the page.

**Turning it off for one site:** set the GitHub Environment variable
`VITE_ANALYTICS_ENDPOINT` to `off` and redeploy, or set `ANALYTICS_ENDPOINT`
to `null` in `site.ts` and `analytics_origin = ""` in the tfvars. The legal
pages drop the statistics paragraphs by themselves.

**Moving the CRM:** change `ANALYTICS_ENDPOINT` and the default of
`analytics_origin` together (`src/config/analytics-origin.test.ts` fails until
they agree), then run the Terraform Infrastructure workflow so the CSP allows
the new origin before the deploy that uses it.

## The endpoint

```
POST https://crm.hagroup.lv/api/track
Content-Type: text/plain;charset=UTF-8
Origin: https://westamarine.hagroup.lv
User-Agent: (the browser's)

{"v":1,"type":"pageview", ...}
```

- **One JSON object per request**, at most 4 KB. The body is JSON even though
  the header says `text/plain`: that keeps it a CORS simple request, with no
  preflight, and lets `navigator.sendBeacon` send it while a tab is closing.
  Parse the body as JSON whatever the `Content-Type` says.
- **No cookies, no credentials.** Requests are sent with `credentials: omit`.
- **Answer `204 No Content`** to anything accepted, and `400` to anything
  that fails validation. The page never reads the answer (a beacon cannot,
  and the fetch fallback is `no-cors`), so the status is for the CRM's own
  logs. `Access-Control-Allow-Origin: *` is harmless and not required.
- **Answer fast.** Do the work after responding, or queue it.
- **`OPTIONS` should answer `204`** with
  `Access-Control-Allow-Methods: POST` and
  `Access-Control-Allow-Headers: Content-Type`, for a browser that sends a
  preflight anyway.

### `pageview`

Sent when a page opens: on the first load and on every in-site navigation.

| Field | Type | Meaning |
| --- | --- | --- |
| `v` | `1` | Schema version. A field that changes meaning bumps it |
| `type` | `"pageview"` | |
| `site` | string, at most 253 | The host the page was served from, `location.hostname`: `westamarine.hagroup.lv` on dev, the client's domain on prod |
| `sid` | 32 hex | Visit id. Random, in memory, one per tab and page load. Every page view and engagement report of a visit carries it |
| `pid` | 32 hex | Page-view id, so engagement reports can be matched to this page view |
| `seq` | integer, from 1 | This page view's number in the visit. `1` is the landing page |
| `path` | string, at most 512 | `location.pathname` only, never the query or the fragment: `/lv/services` |
| `ref` | string | Landing page only: the origin of the referring site (`https://www.google.com`), `""` for none, direct, or same-site |
| `campaign` | object | Landing page only: any of `ref`, `utm_source`, `utm_medium`, `utm_campaign` present on the address, each at most 100 characters. `{}` otherwise |
| `device` | `"mobile"` \| `"tablet"` \| `"desktop"` | From the viewport width: below 768, below 1024, the rest |
| `vw`, `vh` | integer | Viewport width and height in CSS pixels |
| `lang` | string, at most 35 | `navigator.language`, the browser's language (`lv-LV`), not the page's (that is in `path`) |
| `tz` | string, at most 64 | The browser's time zone (`Europe/Riga`), or `""` |
| `ts` | integer | The browser's clock, ms since the epoch. Use the server's receive time for ordering and storage; keep `ts` only to spot a wildly wrong clock |

### `engagement`

How long a page view was looked at. Sent each time the tab is hidden (switching
tabs, locking the phone, closing the tab) and once, with `final: true`, when the
visitor moves on to another page of the site. Each one carries the **running
total** for that page view, so the CRM keeps the largest `engaged_ms` per
`pid` and loses nothing when a tab is closed without warning. A page view with
no visible time sends none.

| Field | Type | Meaning |
| --- | --- | --- |
| `v`, `type`, `site`, `sid`, `pid`, `path`, `ts` | | As above; `type` is `"engagement"` |
| `engaged_ms` | integer, 0 to 21 600 000 | Time the page was visible, in ms, capped at six hours. Hidden time is not counted |
| `scroll_pct` | integer, 0 to 100 | The deepest point of the page that has been on screen |
| `final` | boolean | `true` when the visitor left this page for another page of the site |

### Example visit

A client opens the link from Gmail on a phone, reads the home page for 40 s,
opens Services, reads it for 25 s and closes the tab:

```json
{"v":1,"type":"pageview","site":"westamarine.hagroup.lv","sid":"9f2c…","pid":"a1…","seq":1,"path":"/lv","ref":"https://mail.google.com","campaign":{"ref":"offer-2026-11"},"device":"mobile","vw":390,"vh":844,"lang":"lv-LV","tz":"Europe/Riga","ts":1793965905461}
{"v":1,"type":"engagement","site":"westamarine.hagroup.lv","sid":"9f2c…","pid":"a1…","path":"/lv","engaged_ms":40120,"scroll_pct":100,"final":true,"ts":1793965945581}
{"v":1,"type":"pageview","site":"westamarine.hagroup.lv","sid":"9f2c…","pid":"b7…","seq":2,"path":"/lv/services","ref":"","campaign":{},"device":"mobile","vw":390,"vh":844,"lang":"lv-LV","tz":"Europe/Riga","ts":1793965945582}
{"v":1,"type":"engagement","site":"westamarine.hagroup.lv","sid":"9f2c…","pid":"b7…","path":"/lv/services","engaged_ms":25034,"scroll_pct":62,"final":false,"ts":1793965970616}
```

## What the CRM must do

These are promises the published privacy policy makes. Breaking one makes the
policy false on every site at once.

1. **Never store the IP address.** Use it for rate limiting in memory, and
   for the visitor hash below, then drop it. Do not log request IPs either.
2. **Keep visit statistics 13 months at most**, then delete them.
3. **No cross-site profile.** Do not join visits across sites, and do not
   store anything that identifies a person.
4. **Accept only known sites.** Keep a list of the sites (hosts) the CRM
   expects; drop a report whose `site` is not on it, or whose `Origin` header
   does not match `https://<site>` (or `http://` only for a test host).
   Without this anyone can fill the CRM with invented visits.
5. **Validate every field** against the table above (type, length, range,
   `v` known) and drop the report otherwise. It is untrusted input from the
   internet.
6. **Rate-limit** per IP in memory, for example 120 reports a minute, and drop
   the rest silently.
7. **Drop bots** by `User-Agent` (the site already skips automated browsers
   and most crawlers do not run JavaScript, but some do).

## What the CRM can work out

| Question | How |
| --- | --- |
| Was the site opened, and when | Any `pageview` for the site; the first one is "first opened" |
| How many visits | Distinct `sid` |
| How long they stayed | Per visit: the sum over its `pid`s of the largest `engaged_ms` |
| Which pages, how far they read | `path`, `scroll_pct` per page view |
| Where they came from | `ref` and `campaign` on `seq = 1` |
| Phone or computer | `device`, `vw`; browser and OS from the request's `User-Agent` (parse it, keep only the family names, never the raw string) |
| Where roughly | Country from the IP at receive time (a GeoIP lookup), stored as a country code only; `tz` as a cross-check |
| Same person again | Optional: `sha256(daily_salt + site + ip + user_agent)`, with a random salt rotated and discarded every 24 hours. That counts unique visitors per day without being able to recognise anyone tomorrow. Never store a hash with a salt that is kept |
| A reload, or a link opened in a new tab | Starts a new `sid`. Joining visits of the same daily hash less than 30 minutes apart gives a visit count closer to what a person did |

## Privacy notes (EU, Latvia)

- **No cookies and no storage on the visitor's device.** The visit id lives in
  a JavaScript variable and dies with the tab. That keeps the tracker out of
  the cookie-consent question that local storage or a cookie would raise
  under the ePrivacy Directive, Art. 5(3) (in Latvia, the Information Society
  Services Law, section 7.1), and no consent banner is needed for it.
- **Lawful basis:** legitimate interest (GDPR Art. 6(1)(f)), stated in the
  privacy policy, with the opt-out being the browser's own Do Not Track or
  Global Privacy Control, which the tracker honours.
- **HA Group is a processor** for the client's site once the site is the
  client's: the client is the controller named in its privacy policy, and
  HA Group is named there as the recipient of the statistics. For a preview
  that has not been sold yet, HA Group is effectively the operator. When a
  client buys a site, their contract should include a short data processing
  clause for the statistics (Art. 28).
- **Strict reading:** some data protection authorities treat reading the
  screen size and language as "accessing information" on the device even
  without storage. The data here is coarse, anonymous and used only for
  audience measurement, which is the case the French CNIL and the EDPB
  discuss as exemptable; it is the same position Plausible and similar
  cookieless tools take. If a client wants zero risk, turn statistics off for
  their production site with `VITE_ANALYTICS_ENDPOINT=off`.
