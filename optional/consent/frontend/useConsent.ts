import { useContext } from 'react'

import { ConsentContext, type ConsentContextValue } from '@/context/consent-context'

export const useConsent = (): ConsentContextValue => {
  const context = useContext(ConsentContext)

  if (context === undefined) {
    throw new Error('useConsent must be used inside a <ConsentProvider>')
  }

  return context
}
