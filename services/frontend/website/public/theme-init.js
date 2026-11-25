/*
  The decisions a page has to make BEFORE its first paint.

  Loaded synchronously from <head> (index.html), so it runs before the body is
  parsed. Every page is prerendered, so the browser paints it before React
  starts; anything decided later is decided after the visitor has seen the
  wrong answer.

  The name is historical: it set the theme too, until the site went light
  only (2026-11-26). The deploy and index.html load it by this name.

  1. A page in the wrong language. There is one 404.html, in the default
     language, and it answers /lv/nope too. It is hidden here, and main.tsx
     shows it once it has rendered the not-found page in the address's
     language, so nobody reads the default language first. Only a document
     the build wrote, which the prerender marks on <html>: the dev server's
     index.html is always lang="en", and hiding it would hide every /lv and
     /ru page, and Vite's error overlay with them.
  2. Where the bare root goes. `/` holds the default language's home page,
     for crawlers. A visitor whose language is another one the site publishes
     is sent to it here, with the page hidden, rather than shown the default
     language until the bundle has loaded.

  A page hidden here is shown again after HIDDEN_MS whatever happens, so a
  bundle that fails or is blocked leaves the page in the default language
  rather than blank. A redirect that never lands (a 204, the visitor pressed
  Stop) is shown as far as the browser parsed it; Chromium stops parsing
  when the redirect starts, so there that is an empty page either way.
  main.tsx shows a page as soon as it has rendered, long before HIDDEN_MS.

  A file rather than an inline script because production's Content Security
  Policy is script-src 'self' (infrastructure/terraform/main.tf), which blocks
  inline scripts. It is tiny and same-origin, and served with a short cache.

  It runs before the bundle exists, so it repeats what the app decides later,
  and src/lib/theme-init.test.ts runs every case through both. Change one,
  change the other, in the same commit:
    - the language rule is i18next's (src/i18n/index.ts: the stored choice,
      then the browser's languages), the key is STORAGE_KEYS.locale, the list
      is LOCALES with DEFAULT_LOCALE first, and the attributes are
      REDIRECTING_ATTR and PRERENDER_ATTR (src/lib/prerender.ts);
    - HTML_LANGS is each language's htmlLang, in the same order, and a page
      hidden for its language is one startupPlan renders rather than
      hydrates;
    - HIDDEN_MS is HIDDEN_PAGE_TIMEOUT_MS (src/config/constants.ts).

  It reaches the page only through `window`, which is what lets the test hand
  it storage that throws, an address and a browser language.
*/
;(function (window) {
  var root = window.document.documentElement

  /* Storage throws on access in Safari private mode and with site data
     blocked. Unreadable is treated as empty, as src/lib/storage.ts does. */
  function stored(key) {
    try {
      return window.localStorage.getItem(key)
    } catch (e) {
      return null
    }
  }

  var LOCALES = ['lv']
  var HTML_LANGS = ['lv']
  var HIDDEN_MS = 3000
  var path = window.location.pathname

  function hide() {
    root.style.visibility = 'hidden'
    window.setTimeout(function () {
      root.style.removeProperty('visibility')
    }, HIDDEN_MS)
  }

  /* 1. The address names a language the document is not in: the 404 page,
     which the edge serves in the default language for every address. Hidden,
     not sent anywhere: main.tsx renders the right page and shows it. */
  var named = LOCALES.indexOf(path.split('/')[1])
  if (root.hasAttribute('data-prerendered') && named !== -1 && HTML_LANGS[named] !== root.getAttribute('lang')) {
    hide()
    return
  }

  /* 2. The bare root. The default language needs no second request: main.tsx
     moves the address to /<default> and hydrates the page already here. */
  if (LOCALES.length < 2 || (path !== '/' && path !== '/index.html')) return

  /* i18next's getBestMatchFromCodes, for codes like these: the first
     candidate that is a published code as it stands, else the first whose
     language part is one. */
  function canonical(code) {
    if (code.indexOf('-') === -1) return code
    try {
      return Intl.getCanonicalLocales(code)[0] || code
    } catch (e) {
      return code
    }
  }

  function published(code) {
    for (var i = 0; i < LOCALES.length; i++) {
      if (LOCALES[i] === code || LOCALES[i].split('-')[0] === code) return LOCALES[i]
    }
    return null
  }

  function bestMatch(candidates) {
    var i
    for (i = 0; i < candidates.length; i++) {
      if (LOCALES.indexOf(canonical(candidates[i])) !== -1) return canonical(candidates[i])
    }
    for (i = 0; i < candidates.length; i++) {
      var match = published(candidates[i].replace('_', '-').split('-')[0])
      if (match !== null) return match
    }
    return LOCALES[0]
  }

  var candidates = []
  var remembered = stored('dodarprieku.locale')
  var nav = window.navigator
  if (remembered) candidates.push(remembered)
  for (var i = 0; nav.languages && i < nav.languages.length; i++) candidates.push(nav.languages[i])
  if (nav.userLanguage) candidates.push(nav.userLanguage)
  if (nav.language) candidates.push(nav.language)

  var locale = bestMatch(candidates)
  if (locale === LOCALES[0]) return

  root.setAttribute('data-redirecting', '')
  hide()
  window.location.replace('/' + locale + window.location.search + window.location.hash)
})(window)
