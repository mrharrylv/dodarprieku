/*
  CloudFront Function, viewer-request, on the default behaviour.

  1. One address per page. Any other spelling of it is answered here, before
     the cache or the bucket is asked, with a 301 to that address and the
     query string kept, so a visitor, a crawler and an old link all land on
     the page's own URL without running any JavaScript:

       //en//about           ->  301 /en/about      one slash between segments
       /en/about/            ->  301 /en/about      no trailing slash
       /en/about/index.html  ->  301 /en/about      no index.html
       /index.html           ->  301 /
       /services             ->  301 /en/services   no language: the default's
       /de/services          ->  301 /en/services   a language the site does not publish

     Each 301 carries Cache-Control: public, max-age=3600. Without it a
     browser may keep a 301 for ever, and these follow the language list and
     the default language: a returning visitor would keep being sent where
     the site used to send them. An hour bounds that.

     The last two are fallbackPath (services/frontend/website/src/lib/
     locale-path.ts), the rule the app applies to an in-app navigation: a
     first segment shaped like a language tag is dropped, anything else is
     kept as the page, and the default language goes in front. It applies to
     a page (the last segment has no dot) on a site with more than one
     language, whose URLs carry the prefix. The bare / stays: public/
     theme-init.js sends it to the visitor's own language, which a redirect
     here, blind to local storage, could only guess.

  2. A page's address is pointed at its file. The bucket holds one
     prerendered file per page, and an S3 origin behind Origin Access Control
     has no directory indexes:

       /                 ->  /index.html
       /lv/about         ->  /lv/about/index.html
       /og-image.png     ->  unchanged: the last segment has a dot, so it is a file

     The browser keeps the address it asked for; only the object key changes.
     A key that does not exist is S3's 403, on which the origin group fails
     over to the 404 function: 404.html with a real 404 status (not_found.tf).

  3. Dodar prieku's own paths (doc/specs/dodarprieku.md):

       /api/*, /media/*, /data/*   never reach this function (their own
                                   behaviours); if they do, left untouched
       admin.<host>: /admin/<file.ext>  unchanged, the admin app's assets
       admin.<host>: anything else      ->  /admin/index.html (the admin SPA)
       public host:  /admin, /admin/*   ->  404, the admin app is not served here
       /organizacija/<slug>             ->  /organizacija/index.html, the one
                                            prerendered charity shell, which
                                            fills itself from the URL

  LOCALES is src/config/site.ts's, the default first, as in public/
  theme-init.js. scripts/viewer-request.test.mjs fails until the two agree,
  and holds every redirect to fallbackPath's answer.

  cloudfront-js-2.0, kept to plain ES5 and no module syntax, so it runs the
  same everywhere it is evaluated: at the edge, in the tests, and in front of
  `make preview` (the edge-preview plugin in vite.config.ts).
*/
var LOCALES = ['lv']

/* How long a browser may keep a 301: bounded, so a later change to LOCALES
   or the default language reaches returning visitors within the hour. */
var REDIRECT_CACHE = 'public, max-age=3600'

/* First segments of the behaviours that are not the website bucket's. */
var PASS_THROUGH = ['api', 'media', 'data']

/* The admin app's folder in the bucket, and the host prefix that serves it. */
var ADMIN_DIR = 'admin'
var ADMIN_HOST_PREFIX = 'admin.'

/* Pages whose every child is one prerendered shell: /organizacija/<slug>. */
var SHELL_ROUTES = ['organizacija']

/* Anything shaped like a language tag, de or pt-BR: fallbackPath's test. */
var LOCALE_SHAPED = /^[a-z]{2}(-[A-Za-z0-9]{2,8})?$/

function handler(event) {
  var request = event.request
  var uri = request.uri

  /* A browser's URL parser drops tabs and line breaks, so a Location built
     around one ("/\t/evil.com") could name another host. No page has one in
     its address: the request goes on to the bucket, which has no such key. */
  // indexOf, not a regex: see segmentsOf on the runtime's regex limit.
  if (uri.indexOf('\t') !== -1 || uri.indexOf('\n') !== -1 || uri.indexOf('\r') !== -1) return request

  var segments = segmentsOf(uri)
  if (PASS_THROUGH.indexOf(segments[0]) !== -1) return request
  if (isAdminHost(request)) return adminRequest(request, uri)
  if (segments[0] === ADMIN_DIR) return notFound()

  var address = addressOf(uri)
  if (address !== uri) return redirect(address, request.querystring)

  if (address === '/') {
    request.uri = '/index.html'
  } else if (!isFile(address)) {
    request.uri = shellOf(address) + '/index.html'
  }
  return request
}

function isAdminHost(request) {
  var host = request.headers && request.headers.host ? request.headers.host.value : ''
  return String(host).toLowerCase().indexOf(ADMIN_HOST_PREFIX) === 0
}

/* The admin host serves only the admin SPA: its files as they are, and its
   index for every other path, so the SPA's router decides. */
function adminRequest(request, uri) {
  var segments = segmentsOf(uri)
  var path = '/' + segments.join('/')
  request.uri = segments.length > 1 && segments[0] === ADMIN_DIR && isFile(path) ? path : '/' + ADMIN_DIR + '/index.html'
  return request
}

/* /organizacija/<anything> is the /organizacija shell; any other page is
   itself. */
function shellOf(address) {
  var segments = segmentsOf(address)
  return segments.length > 1 && SHELL_ROUTES.indexOf(segments[0]) !== -1 ? '/' + segments[0] : address
}

function notFound() {
  return {
    statusCode: 404,
    statusDescription: 'Not Found',
    headers: {
      'content-type': { value: 'text/plain; charset=utf-8' },
      'cache-control': { value: REDIRECT_CACHE },
    },
    body: { encoding: 'text', data: 'Not Found' },
  }
}

/* The path's segments. A backslash counts as a slash, as it does to a
   browser, so no segment can start a Location that names another host.
   Plain string splits, not split(/[\/\\]/): CloudFront's runtime caps the
   regex engine's instruction count, and that split threw "Regex execute
   instruction limit exceeded" on 50-character asset paths, answering them
   503 (seen live on the font files, 2026-11-25). */
function segmentsOf(uri) {
  var parts = uri.split('\\').join('/').split('/')
  var segments = []
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] !== '') segments.push(parts[i])
  }
  return segments
}

function isFile(path) {
  return path.substring(path.lastIndexOf('/') + 1).indexOf('.') !== -1
}

/* The one address of whatever `uri` names. Always a single slash, then
   segments: a path on this site, never another host. */
function addressOf(uri) {
  var segments = segmentsOf(uri)
  if (segments[segments.length - 1] === 'index.html') segments = segments.slice(0, -1)

  var path = '/' + segments.join('/')
  if (LOCALES.length < 2 || segments.length === 0 || isFile(path) || LOCALES.indexOf(segments[0]) !== -1) {
    return path
  }

  var page = LOCALE_SHAPED.test(segments[0]) ? segments.slice(1) : segments
  return '/' + [LOCALES[0]].concat(page).join('/')
}

function redirect(address, querystring) {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: {
      location: { value: address + searchOf(querystring) },
      'cache-control': { value: REDIRECT_CACHE },
    },
  }
}

/* The query string as the viewer sent it. CloudFront hands the function each
   value unchanged, percent-encoding included, so it is joined back as it is;
   a name sent twice arrives once, with every value in multiValue. */
function searchOf(querystring) {
  var names = Object.keys(querystring || {})
  var pairs = []
  for (var i = 0; i < names.length; i++) {
    var field = querystring[names[i]]
    var values = field.multiValue || [field]
    for (var j = 0; j < values.length; j++) {
      pairs.push(values[j].value === '' ? names[i] : names[i] + '=' + values[j].value)
    }
  }
  return pairs.length === 0 ? '' : '?' + pairs.join('&')
}
