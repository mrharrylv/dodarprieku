/** Light or dark, the admin's own choice remembered per browser. Mirrors public/theme-init.js. */
export type Theme = 'light' | 'dark'
export const THEME_KEY = 'dodar-admin-theme'

export const readTheme = (): Theme => {
  const current = document.documentElement.getAttribute('data-theme')
  return current === 'dark' ? 'dark' : 'light'
}

export const applyTheme = (theme: Theme): void => {
  document.documentElement.setAttribute('data-theme', theme)
  try {
    window.localStorage.setItem(THEME_KEY, theme)
  } catch (e) {
    // Private mode: the choice lasts for this page only.
    console.warn('[theme] could not store the theme', e)
  }
}
