import { useEffect } from 'react'

import { postView } from '@/lib/public-api'
import { markViewed } from '@/lib/session-views'

/**
 * Counts one view of a charity page per browser tab. A failed count is not
 * the visitor's problem: it is logged as a warning and the page carries on.
 */
export const useCountView = (id: string | undefined): void => {
  useEffect(() => {
    if (id === undefined || !markViewed(id)) return
    void postView(id).then((result) => {
      if (!result.ok) console.warn(`[views] the view of ${id} was not counted: ${result.error.kind}`)
    })
  }, [id])
}
