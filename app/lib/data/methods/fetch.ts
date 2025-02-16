'use server'
import { db } from "../../database"

export const fetchMethods = async () => {
  return  [{name: "test1", id: 1}, {name: "test2", id: 2}]
  //return db.selectFrom("methods").selectAll().execute()
}