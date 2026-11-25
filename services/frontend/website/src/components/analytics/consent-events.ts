/** A window event, so a button anywhere on the page can reopen the banner. */
export const CONSENT_REOPEN_EVENT = 'dodarprieku:consent-reopen'

export const requestConsentReopen = (): void => {
  window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT))
}
