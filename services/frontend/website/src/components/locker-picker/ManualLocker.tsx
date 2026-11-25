import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LIMITS, type ParcelLockerChoice, type ParcelProvider } from '@shared/contracts'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'

/** A locker typed in by hand: its name and address. Both are needed. */
export const ManualLocker = ({
  provider,
  onAdd,
  onBack,
  canGoBack,
}: {
  provider: ParcelProvider
  onAdd: (choice: ParcelLockerChoice) => void
  onBack: () => void
  canGoBack: boolean
}) => {
  const { t } = useTranslation('register')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [tried, setTried] = useState(false)

  const add = () => {
    setTried(true)
    if (name.trim() === '' || address.trim() === '') return
    onAdd({ provider, name: name.trim(), address: address.trim() })
    setName('')
    setAddress('')
    setTried(false)
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label={t('lockers.manualName')} value={name} maxLength={LIMITS.shortText} required
          error={tried && name.trim() === '' ? t('errors.required') : undefined} onChange={(e) => setName(e.target.value)} />
        <Input label={t('lockers.manualAddress')} value={address} maxLength={LIMITS.addressLine} required
          error={tried && address.trim() === '' ? t('errors.required') : undefined} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" size="sm" onClick={add}>
          {t('lockers.manualAdd')}
        </Button>
        {canGoBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            {t('lockers.backToList')}
          </Button>
        )}
      </div>
    </div>
  )
}
