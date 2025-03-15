import { useEffect, useState } from "react"
import { fetchBeans } from "../data/beans"

type Bean = {
  id: number
  name: string | null
  roster: string | null
  rostery: string | null
  created_at: Date
}

export const useBeans = () => {
  const [beans, setBeans] = useState<Bean[]>([]);

  useEffect(() => {
    const loadBeans = async () => {
      const data = await fetchBeans();
      setBeans(data ?? []);
    };
    loadBeans();
  }, []);
  return beans;
};