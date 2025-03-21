"use server";

import { db } from "../lib/database";
import { revalidatePath } from "next/cache";

export async function getBrews() {
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
      "brew_feedback.too_strong",
      "brew_feedback.too_weak",
      "brew_feedback.is_sour",
      "brew_feedback.is_bitter",
      "brew_feedback.overall_rating",
      "brew_feedback.coffee_amount_ml",
    ])
    .execute();
}

export async function deleteBrew(id: number) {
  await db.deleteFrom("brews").where("brews.id", "=", id).execute();
  revalidatePath("/stats");
}
