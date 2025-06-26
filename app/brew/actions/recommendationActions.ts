"use server";

import { db } from "../../lib/database";
import { BrewRecommendationService, BrewWithFeedback, BrewRecommendation } from "../services/BrewRecommendationService";

export async function getBrewRecommendation(
  beanId: string,
  methodId: string,
  grinderId: string
): Promise<BrewRecommendation | null> {
  try {
    // Get brews with feedback from database
    const brews = await getBrewsWithFeedbackFromDB(beanId, methodId, grinderId);
    
    // Get method name for defaults
    const method = await db
      .selectFrom("methods")
      .where("id", "=", Number(methodId))
      .select("name")
      .executeTakeFirst();

    // Use client-safe service for calculation
    return BrewRecommendationService.calculateRecommendation(brews, method?.name || undefined);
  } catch (error) {
    console.error("Error getting brew recommendation:", error);
    return null;
  }
}

async function getBrewsWithFeedbackFromDB(
  beanId: string,
  methodId: string,
  grinderId: string
): Promise<BrewWithFeedback[]> {
  const brewsWithFeedback = await db
    .selectFrom("brews")
    .leftJoin("brew_feedback", "brews.id", "brew_feedback.brew_id")
    .where("brews.bean_id", "=", Number(beanId))
    .where("brews.method_id", "=", Number(methodId))
    .where("brews.grinder_id", "=", Number(grinderId))
    .select([
      "brews.id",
      "brews.bean_id",
      "brews.method_id", 
      "brews.grinder_id",
      "brews.water",
      "brews.dose",
      "brews.grind",
      "brews.ratio",
      "brews.created_at",
      "brew_feedback.overall_rating",
      "brew_feedback.too_strong",
      "brew_feedback.too_weak",
      "brew_feedback.is_sour",
      "brew_feedback.is_bitter",
      "brew_feedback.coffee_amount_ml"
    ])
    .orderBy("brews.created_at", "desc")
    .execute();

  return brewsWithFeedback.map(brew => ({
    id: brew.id,
    bean_id: brew.bean_id,
    method_id: brew.method_id,
    grinder_id: brew.grinder_id,
    water: brew.water,
    dose: brew.dose,
    grind: brew.grind,
    ratio: brew.ratio,
    created_at: brew.created_at.toISOString(),
    feedback: brew.overall_rating !== null ? {
      overall_rating: brew.overall_rating,
      too_strong: brew.too_strong || false,
      too_weak: brew.too_weak || false,
      is_sour: brew.is_sour || false,
      is_bitter: brew.is_bitter || false,
      coffee_amount_ml: brew.coffee_amount_ml
    } : undefined
  }));
}
