"use server";

import { db } from "../../lib/database";
import { BrewsModel, BrewFeedbackModel } from "../../lib/generated-models";
import { FormData } from "./types";

// Initialize models
const brewsModel = new BrewsModel(db);
const feedbackModel = new BrewFeedbackModel(db);

export async function getPreviousBrews(
  bean_id: string,
  method_id: string,
  grinder_id: string
) {
  if (!bean_id || !method_id || !grinder_id) {
    return [];
  }

  try {
    const previousBrews = await db
      .selectFrom("brews")
      .where("bean_id", "=", Number(bean_id))
      .where("method_id", "=", Number(method_id))
      .where("grinder_id", "=", Number(grinder_id))
      .orderBy("rating", "desc")
      .limit(6)
      .selectAll()
      .execute();

    return previousBrews;
  } catch (error) {
    console.error("Error fetching previous brews:", error);
    return [];
  }
}

export async function saveBrew(data: FormData) {
  try {
    const savedBrew = await brewsModel.create({
      bean_id: Number(data.bean_id),
      method_id: Number(data.method_id),
      grinder_id: Number(data.grinder_id),
      water: data.water,
      dose: data.dose,
      grind: data.grind,
      ratio: data.ratio,
    });
    
    return { success: true, brew: savedBrew };
  } catch (error) {
    console.error('Error saving brew:', error);
    return { success: false, error: 'Failed to save brew' };
  }
}

export async function saveBrewFeedback(brewId: number, feedback: any) {
  try {
    const savedFeedback = await feedbackModel.create({
      brew_id: brewId,
      coffee_amount_ml: feedback.coffee_amount_ml || null,
      too_strong: feedback.too_strong || false,
      too_weak: feedback.too_weak || false,
      is_sour: feedback.is_sour || false,
      is_bitter: feedback.is_bitter || false,
      overall_rating: feedback.overall_rating || null,
    });
    
    return { success: true, feedback: savedFeedback };
  } catch (error) {
    console.error('Error saving feedback:', error);
    return { success: false, error: 'Failed to save feedback' };
  }
}
