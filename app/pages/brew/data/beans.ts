'use server'
import { db } from "../../../../common/lib/database";

export const fetchBeans = async () => {
  return await db.selectFrom("beans").selectAll().execute();
};