'use server'
import { db } from "@/app/lib/database";


export const useAddMethod = () => {
  const addMethod = async (methodName: string) => {
    await db.insertInto('methods').values({ name: methodName }).execute();
  };

  return { addMethod };
};
