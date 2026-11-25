/// <reference types="vite/client" />

/**
 * Build-time configuration.
 *
 * Everything here is PUBLIC: Vite inlines it into the bundle. Never add a
 * secret. Every entry is optional; `config/env.ts` validates them and treats an
 * absent or malformed value as "feature off".
 */
interface ImportMetaEnv {
  /** Canonical origin, e.g. https://example.com */
  readonly VITE_SITE_URL?: string
  /** HTTPS endpoint that accepts contact-form submissions. */
  readonly VITE_CONTACT_ENDPOINT?: string
  /**
   * `mock` (the default) renders the form and discards submissions in the
   * browser; `live` sends to `VITE_CONTACT_ENDPOINT`; `off` shows the
   * call-or-email notice instead of a form.
   */
  readonly VITE_CONTACT_MODE?: string
  /** HTTPS endpoint that records consent decisions. */
  readonly VITE_CONSENT_ENDPOINT?: string
  /**
   * Visit-statistics endpoint. Unset: `ANALYTICS_ENDPOINT` in `site.ts`
   * (HA Group's CRM). `off`: no statistics at all.
   */
  readonly VITE_ANALYTICS_ENDPOINT?: string
  /**
   * Overrides the `style` in `site.config.json`. For previewing a style in CI
   * without a commit; the committed file is the source of truth.
   */
  readonly VITE_SITE_STYLE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * The year the build ran, from `vite.config.ts`. `CopyrightYear` renders it
 * while hydrating, so a prerendered footer and the browser agree.
 */
declare const __BUILD_YEAR__: number

/**
 * Eight hex digits of the share card's content hash, or '' when
 * public/og-image.png is missing. From `vite.config.ts`; see `shareImagePath`.
 */
declare const __SHARE_IMAGE_VERSION__: string
