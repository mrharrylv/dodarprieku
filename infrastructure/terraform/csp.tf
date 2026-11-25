# =============================================================================
# Content-Security-Policy (used by the response headers policy in main.tf)
# =============================================================================
# Strict by default: everything same-origin. The widenings, each for one
# reason only:
#
#   map      MapLibre with OpenFreeMap tiles (styles, glyphs and tiles are
#            fetched, so connect-src; sprites and rasters, so img-src), its
#            web worker from a blob: URL (worker-src, child-src for older
#            engines), and Nominatim for the wizard's address search.
#   ga       Google Analytics, only when var.ga_enabled (prod), and the site
#            loads it only after consent.
#   template image_origins, frame_origins and analytics_origin, as before.

locals {
  map_tiles_origin  = "https://tiles.openfreemap.org"
  map_search_origin = "https://nominatim.openstreetmap.org"

  ga_script_origins  = var.ga_enabled ? ["https://www.googletagmanager.com"] : []
  ga_connect_origins = var.ga_enabled ? ["https://*.google-analytics.com", "https://*.analytics.google.com", "https://www.googletagmanager.com"] : []
  ga_img_origins     = var.ga_enabled ? ["https://*.google-analytics.com", "https://www.googletagmanager.com"] : []

  csp_directives = [
    "default-src 'self'",
    # Tailwind v4 injects a style element at runtime, and MapLibre sets inline
    # styles on its markers, so styles need 'unsafe-inline'. Scripts do not.
    "style-src 'self' 'unsafe-inline'",
    join(" ", concat(["script-src 'self'"], local.ga_script_origins)),
    join(" ", concat(["img-src 'self' data: blob:", local.map_tiles_origin], var.image_origins, local.ga_img_origins)),
    "font-src 'self'",
    join(" ", concat(["frame-src 'self'"], var.frame_origins)),
    join(" ", concat(
      ["connect-src 'self'", local.map_tiles_origin, local.map_search_origin],
      compact([var.analytics_origin]),
      local.ga_connect_origins,
    )),
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ]

  content_security_policy = join("; ", local.csp_directives)
}
