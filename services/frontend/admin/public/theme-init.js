/*
  Sets data-theme on <html> before the first paint, so the portal never
  flashes the wrong theme. A file, not an inline script: the CSP is
  script-src 'self'. The key and the rule repeat src/lib/theme.ts.
*/
;(function () {
  var theme = 'light'
  try {
    var stored = window.localStorage.getItem('dodar-admin-theme')
    if (stored === 'light' || stored === 'dark') theme = stored
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark'
  } catch (error) {
    theme = 'light'
  }
  document.documentElement.setAttribute('data-theme', theme)
})()
