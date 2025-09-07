'use client'
import { useState, useEffect } from 'react'
import { getPreviousBrews } from './actions'

export const usePreviousBrews = (beanId: number, methodId: number, grinderId: number) => {
  const [previousBrews, setPreviousBrews] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (beanId > 0 && methodId > 0 && grinderId > 0) {
      setLoading(true)
      getPreviousBrews(beanId.toString(), methodId.toString(), grinderId.toString())
        .then(setPreviousBrews)
        .finally(() => setLoading(false))
    }
  }, [beanId, methodId, grinderId])

  return { previousBrews, loading }
}
