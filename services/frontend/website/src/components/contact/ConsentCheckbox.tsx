import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

/**
 * The consent tick, with the privacy policy linked from inside its label.
 *
 * Unticked by default, always: a pre-ticked box is not consent under GDPR
 * Art. 4(11) (Planet49, C-673/17).
 */
export const ConsentCheckbox = ({
  checked,
  error,
  onChange,
  privacyHref,
}: {
  checked: boolean
  error: string | undefined
  onChange: (checked: boolean) => void
  privacyHref: string
}) => {
  const { t } = useTranslation('contact')

  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="consent"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error !== undefined || undefined}
          aria-describedby={error !== undefined ? 'consent-error' : undefined}
          className="mt-1 h-5 w-5 shrink-0 rounded-(--radius-sm) border-(--border-strong) accent-(--fill-accent)"
        />
        <span className="text-(length:--text-sm) text-(--text-secondary)">
          {/*
            react-i18next indexes <Trans> children from 0, so the <1> in the
            locale string is the SECOND element. The leading empty <span /> is
            what makes the numbering line up. Drop it and the link renders as
            plain text, in every language at once.
          */}
          <Trans
            t={t}
            i18nKey="form.consent"
            components={[
              <span key="0" />,
              <Link
                key="1"
                to={privacyHref}
                className="text-(--text-accent) underline underline-offset-2"
              />,
            ]}
          />
        </span>
      </label>
      {error !== undefined && (
        <p
          id="consent-error"
          role="alert"
          className="mt-1.5 text-(length:--text-sm) text-(--color-danger-600)"
        >
          {error}
        </p>
      )}
    </div>
  )
}
