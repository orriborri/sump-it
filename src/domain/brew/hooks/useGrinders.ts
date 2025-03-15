import { useEffect, useState } from "react"
import { fetchGrinders } from "../data/grinders"

type Grinder = {
  created_at: Date
  id: number
  name: string | null
}

export const useGrinders = () => {
  const [grinders, setGrinders] = useState<Grinder[]>([]);

  useEffect(() => {
    const loadGrinders = async () => {
      const data = await fetchGrinders();
      setGrinders(data ?? []);
    };
    loadGrinders();
  }, []);
  return grinders;
};