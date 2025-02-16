import { useEffect, useState } from "react"
import { fetchBrews } from "./fetch"

type Brew = {
  bean_id: number | null
  id: number | null
  method_id: number | null
  created_at: Date | null
  name: string | null
  roster: string | null
  rostery: string | null
}

export const useMethods = () => {
  const [brews, setSetBrews] = useState<Brew[]>([])

  useEffect(() => {
    const loadBeans = async () => {
      const data = await fetchBrews()
      setSetBrews(data ?? [])
    }
    loadBeans()
  }, [])
  return brews
}
