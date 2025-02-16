'use server'
import { db } from "../../database"

export const fetchGrinders = async () => {
  return await db.selectFrom("grinders").selectAll().execute()
}