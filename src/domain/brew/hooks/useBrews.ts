import { useEffect, useState } from "react"
import { fetchBrews } from "../data/brews"

type Brew = {
  beanId: number | null
  id: number | null
  methodId: number | null
  createdAt: Date | null
  name: string | null
  roster: string | null
  rostery: string | null
}

export const useBrews = () => {
  const [brews, setBrews] = useState<Brew[]>([]);

  useEffect(() => {
    const loadBrews = async () => {
      const data = await fetchBrews();
      setBrews(data ?? []);
    };
    loadBrews();
  }, []);
  return brews;
};