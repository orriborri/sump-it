'use client'
import { useState, useEffect } from 'react'
import { getGrinderSettings, GrinderSettings } from './actions'

/**
 * Custom hook that fetches and manages grinder settings for a given grinder ID
 * Handles loading and error states while fetching grinder configuration from the server
 * @param grinderId - Optional grinder ID string; returns null settings if not provided
 * @returns Object containing grinderSettings, loading state, and any error message
 */
export const useGrinderSettings = (grinderId?: string) => {
  const [grinderSettings, setGrinderSettings] =
    useState<GrinderSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchGrinderSettings = async () => {
      if (!grinderId) {
        setGrinderSettings(null)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const settings = await getGrinderSettings(grinderId)
        if (settings) {
          setGrinderSettings(settings)
        } else {
          setError('Grinder not found')
        }
      } catch {
        setError('Failed to load grinder settings')
        setGrinderSettings(null)
      } finally {
        setLoading(false)
      }
    }

    fetchGrinderSettings()
  }, [grinderId])

  return { grinderSettings, loading, error }
}
