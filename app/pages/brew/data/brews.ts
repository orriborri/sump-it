'use server'
import { db } from "../../../../common/lib/database";

export const fetchBrews = async () => {
  return await db.selectFrom("brews")
    .leftJoin('beans', 'brews.bean_id', 'beans.id')
    .leftJoin('methods', 'brews.method_id', 'methods.id')
    .selectAll()
    .execute();
};