import { useEffect, useState } from "react"
import { fetchBrews } from "./fetch"

type Brew = {
  beanId: number | null
  id: number | null
  methodId: number | null
  createdAt: Date | null
  name: string | null
  roster: string | null
  rostery: string | null
}

export const useMethods = () => {
  const [brews, setSetBrews] = useState<Brew[]>([]);

  useEffect(() => {
    const loadBeans = async () => {
      const data = await fetchBrews();
      setSetBrews(data ?? []);
    };
    loadBeans();
  }, []);
  return brews;
};
