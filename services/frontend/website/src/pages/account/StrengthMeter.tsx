import { useTranslation } from 'react-i18next'

import { LIMITS } from '@shared/contracts'

import { cn } from '@/lib/cn'
import { passwordStrength, strengthLevel } from './password-strength'

const FILL = ['', 'bg-(--color-danger-600)', 'bg-(--color-warning-600)', 'bg-(--color-success-500)', 'bg-(--color-success-600)']

/** Four bars and a word: colour is never the only signal. */
export const StrengthMeter = ({ password }: { password: string }) => {
  const { t } = useTranslation('account')
  const strength = passwordStrength(password)
  const level = strengthLevel(strength)
  if (strength === 'empty') return null
  return (
    <div className="mt-2" aria-live="polite">
      <div aria-hidden="true" className="flex gap-1">
        {[1, 2, 3, 4].map((bar) => (
          <span key={bar} className={cn('h-1.5 flex-1 rounded-full', bar <= level ? FILL[level] : 'bg-(--surface-sunken)')} />
        ))}
      </div>
      <p className="mt-1 text-(length:--text-xs) text-(--text-secondary)">
        {t(`setPassword.strength.${strength}`, { min: LIMITS.passwordMin })}
      </p>
    </div>
  )
}
