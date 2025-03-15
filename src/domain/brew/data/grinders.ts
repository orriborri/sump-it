'use server'
import { db } from "../../../common/lib/database";

export const fetchGrinders = async () => {
  return await db.selectFrom("grinders").selectAll().execute();
};