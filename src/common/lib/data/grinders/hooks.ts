'use client';
import { useEffect, useState } from "react"
import { fetchGrinders } from "./fetch"
type Grinder = {
  created_at: Date
  id: number
  name: string | null
}

export const useGrinders = () => {
  const [grinders, setGrinders] = useState<Grinder[]>([]);
  useEffect(() => {
    const loadBeans = async () => {
      const data = await fetchGrinders();
      setGrinders(data ?? []);
    };
    loadBeans();
  }, []);
  return grinders;
};
