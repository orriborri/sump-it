'use server'
import { db } from "../../database"

export const fetch = async () => {
  return db.selectFrom("methods").selectAll().execute()
}
export const create = async (name: string) => {
  const res = await db.insertInto("methods").values({ name }).execute()
  return res.map((it) => it.insertId)
}