/**
 * Google Maps addresses for a place, built from one search query (usually the
 * street address). Pure, so the URLs are testable and the contact page's map
 * and its "Open in Google Maps" link can never point at two different places.
 *
 * The embed form (`output=embed`) needs no API key. It is a third-party
 * request, so a site that turns the map on must also allow
 * https://www.google.com in the CSP's frame-src (`frame_origins` in Terraform)
 * and name Google in the cookie and privacy policies, in every language.
 */
export type MapConfig = {
  /** The iframe's src. */
  readonly embedUrl: string
  /** Opens the place in Google Maps, in a new tab. */
  readonly linkUrl: string
}

/** Zoom 16 shows the street and its neighbours: close enough to find a door. */
export const googleMap = (query: string, zoom = 16): MapConfig => {
  const q = encodeURIComponent(query.trim())
  return {
    embedUrl: `https://www.google.com/maps?q=${q}&z=${zoom}&output=embed`,
    linkUrl: `https://www.google.com/maps/search/?api=1&query=${q}`,
  }
}
