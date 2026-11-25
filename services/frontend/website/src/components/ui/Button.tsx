import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { buttonClasses, type ButtonSize, type ButtonVariant } from './button-styles'
import { Spinner } from './Spinner'

interface CommonProps {
  readonly variant?: ButtonVariant
  readonly size?: ButtonSize
  readonly className?: string
  readonly children: ReactNode
}

interface ButtonProps
  extends CommonProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  /** Shows a spinner and disables the control. */
  readonly loading?: boolean
  /** Announced while loading, so a screen reader hears the state change. */
  readonly loadingLabel?: string
}

export const Button = ({
  variant,
  size,
  className,
  loading = false,
  loadingLabel,
  disabled,
  children,
  type = 'button',
  ...rest
}: ButtonProps) => (
  <button
    // A <button> inside a <form> defaults to type="submit", which is how a
    // decorative button ends up submitting the form. Default it to "button"
    // and make submitting an explicit choice.
    type={type}
    className={buttonClasses(variant, size, className)}
    disabled={disabled === true || loading}
    aria-busy={loading || undefined}
    {...rest}
  >
    {loading ? (
      <>
        <Spinner />
        <span>{loadingLabel ?? children}</span>
      </>
    ) : (
      children
    )}
  </button>
)

interface ButtonLinkProps extends CommonProps {
  readonly to: string
  /** Renders an <a> instead of a router <Link>, for off-site targets. */
  readonly external?: boolean
}

/**
 * A link that looks like a button.
 *
 * It stays an anchor, so it opens in a new tab on middle-click and can be
 * copied: a <button> with an onClick that navigates does neither, and is the
 * usual reason "open in new tab" mysteriously does nothing on a site.
 */
export const ButtonLink = ({
  to,
  external = false,
  variant,
  size,
  className,
  children,
}: ButtonLinkProps) => {
  const classes = buttonClasses(variant, size, className)

  if (external) {
    return (
      // noreferrer alongside noopener: without it the target page can read
      // where the visitor came from, and older browsers leak window.opener.
      <a href={to} className={classes} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  }

  return (
    <Link to={to} className={classes}>
      {children}
    </Link>
  )
}
