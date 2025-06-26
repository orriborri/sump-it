"use server";

import { db } from "../lib/database";
import { BrewsModel } from "../lib/generated-models";
import { revalidatePath } from "next/cache";

// Initialize models
const brewsModel = new BrewsModel(db);

export async function getBrews() {
  // For complex joins, we still use direct Kysely queries
  // This is appropriate since it's a complex reporting query
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
  // Use the generated model for simple operations
  await brewsModel.deleteById(id);
  revalidatePath("/stats");
}
