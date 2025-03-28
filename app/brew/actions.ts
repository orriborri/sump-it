"use server";

import { db } from "../lib/database";
import { revalidatePath } from "next/cache";
import type { BrewFormData } from "./types";

export async function getPreviousBrewFeedback(
  beanId: number,
  methodId: number
) {
  return await db
    .selectFrom("brews")
    .leftJoin("brew_feedback", "brew_feedback.brew_id", "brews.id")
    .where("brews.bean_id", "=", beanId)
    .where("brews.method_id", "=", methodId)
    .select([
      "brew_feedback.id",
      "brews.grind",
      "brews.ratio",
      "brew_feedback.too_strong",
      "brew_feedback.too_weak",
      "brew_feedback.is_sour",
      "brew_feedback.is_bitter",
      "brew_feedback.overall_rating",
    ])
    .orderBy("brew_feedback.overall_rating", "desc")
    .limit(5)
    .execute();
}

export async function createBrew(data: BrewFormData) {
  const [result] = await db
    .insertInto("brews")
    .values(data)
    .returning("id")
    .execute();
  return result.id;
}

export async function findBrewById(id: number) {
  return await db.selectFrom("brews").where("id", "=", id).executeTakeFirst();
}

export async function updateBrew(id: number, data: BrewFormData) {
  await db.updateTable("brews").set(data).where("id", "=", id).execute();
  revalidatePath("/stats");
}

export async function deleteBrew(id: number) {
  await db.deleteFrom("brews").where("id", "=", id).execute();
  revalidatePath("/stats");
}
