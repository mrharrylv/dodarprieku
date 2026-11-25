# Dodar prieku: admin portal

The administrators' app for the charity map, served at
`https://admin.dodarprieku.hagroup.lv`. A plain single-page app (no prerender,
`noindex`), Latvian only. The binding spec is
[`doc/specs/dodarprieku.md`](../../../doc/specs/dodarprieku.md), flow 8.

## Commands

```bash
npm install
npm run dev            # http://localhost:5174, proxies /api, /media, /data to the API on :8787
npm run lint
npm run typecheck
npm run test           # vitest + testing-library, mocked fetch
npm run test:coverage  # fails under 70% statements, branches, functions or lines
npm run build          # tsc -b && vite build -> dist/
```

Locally, start the API's dev server first (it seeds `admin@example.com` /
`dev-password-123`).

## How it is served

`vite build` uses `base: '/admin/'`, so `dist/index.html` references
`/admin/assets/...`. The deploy uploads `dist/` to `admin/` in the website
bucket; on the admin host the CloudFront function rewrites every path that is
not a file under `/admin/` to `/admin/index.html`, so the router's own paths
(`/pieteikumi`, `/organizacijas/:id`, ...) work on reload. The dev server keeps
base `/`.

## Layout

| Path | What |
| --- | --- |
| `src/lib/api.ts` | typed client over `@shared/contracts`: CSRF header on mutations, timeout, error codes, 401 means session expired |
| `src/lib/diff.ts` | live vs proposed profile, field by field and item by item |
| `src/lib/csv.ts` | CSV export: quoting, formula guard, CRLF, UTF-8 BOM |
| `src/lib/charity-table.ts` | search, filters and sort for the organisations table |
| `src/i18n/lv.ts` | every visible string (no em dashes; a test enforces it) |
| `src/context/` | auth (admin only), API injection, sidebar counts, toasts |
| `src/pages/`, `src/editor/`, `src/components/` | screens, the full profile editor, shared UI |

Shared code comes from `../../shared/src` through the `@shared/*` alias. Colour,
type and spacing tokens are copied from the website's `src/index.css`; change a
token there and here together.

## API expectations

`POST .../approve` and `POST .../resend-invite` may add `mailSent: boolean` to
their data; the portal reports it when present and stays quiet when absent.
