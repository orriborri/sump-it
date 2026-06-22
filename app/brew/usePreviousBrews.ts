'use client'
import { useState, useEffect } from 'react'
import { getPreviousBrews } from './actions'
import type { BrewsWithJoins } from '../lib/generated-models/BrewsJoined'

/**
 * Custom hook that fetches previous brew records for a specific equipment combination
 * Automatically re-fetches when the equipment IDs change
 * @param beanId - The selected coffee bean ID
 * @param methodId - The selected brewing method ID
 * @param grinderId - The selected grinder ID
 * @returns Object containing the array of previous brews and a loading state
 */
export const usePreviousBrews = (
  beanId: number,
  methodId: number,
  grinderId: number
) => {
  const [previousBrews, setPreviousBrews] = useState<BrewsWithJoins[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (beanId > 0 && methodId > 0 && grinderId > 0) {
      setLoading(true)
      getPreviousBrews(
        beanId.toString(),
        methodId.toString(),
        grinderId.toString()
      )
        .then(setPreviousBrews)
        .finally(() => setLoading(false))
    }
  }, [beanId, methodId, grinderId])

  return { previousBrews, loading }
}
