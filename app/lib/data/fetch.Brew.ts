import { db } from "../database"

export const fetchBrews = async () => {
  return await db.selectFrom("brews").leftJoin('beans', 'brews.bean_id', 'beans.id').leftJoin('methods', 'brews.id', 'methods.id').selectAll().execute()
}