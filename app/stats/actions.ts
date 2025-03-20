"use server";

import { db } from "../lib/database";
import { revalidatePath } from "next/cache";

export const getBrews = async () => {
  return await db
    .selectFrom("brews")
    .leftJoin("beans", "beans.id", "brews.bean_id")
    .leftJoin("methods", "methods.id", "brews.method_id")
    .leftJoin("grinders", "grinders.id", "brews.grinder_id")
    .leftJoin("brew_feedback", "brew_feedback.brew_id", "brews.id")
    .select([
      "brews.id",
      "brews.created_at",
      "beans.name as bean_name",
      "methods.name as method_name",
      "grinders.name as grinder_name",
      "brews.grind",
      "brews.water",
      "brews.dose",
      "brews.ratio",
      "brew_feedback.strength_rating",
      "brew_feedback.taste_balance",
      "brew_feedback.coffee_amount_ml",
    ])
    .execute();
};

export const deleteBrew = async (id: number) => {
  await db.deleteFrom("brews").where("id", "=", id).execute();
  revalidatePath("/stats");
};
