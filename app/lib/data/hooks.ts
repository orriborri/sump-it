'use client'
import { useEffect, useState } from "react"


export const useFetch = <T>(fetch: () => Promise<T[]>) => {
  const [items, setItem] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const loadItems = async () => {
      const data = await fetch()
      setItem(data ?? [])
      setLoading(false)
    }
    loadItems()
  }, [])
  return [items, loading] as const
}
