"use server";

import { db } from "../../lib/database";
import { BrewsModel, BrewFeedbackModel } from "../../lib/generated-models";
import { FormData } from "./types";

// Initialize models
const brewsModel = new BrewsModel(db);
const feedbackModel = new BrewFeedbackModel(db);

export interface BrewWithFeedback {
  id: number;
  bean_id: number;
  method_id: number;
  grinder_id: number;
  water: number;
  dose: number;
  grind: number;
  ratio: number;
  created_at: string;
  feedback?: {
    overall_rating: number | null;
    too_strong: boolean;
    too_weak: boolean;
    is_sour: boolean;
    is_bitter: boolean;
    coffee_amount_ml: number | null;
  };
}

export interface ParameterSuggestion {
  water: number;
  dose: number;
  grind: number;
  ratio: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export async function getBrewsWithFeedback(
  bean_id: string,
  method_id: string,
  grinder_id: string
): Promise<BrewWithFeedback[]> {
  if (!bean_id || !method_id || !grinder_id) {
    return [];
  }

  try {
    const brewsWithFeedback = await db
      .selectFrom("brews")
      .leftJoin("brew_feedback", "brews.id", "brew_feedback.brew_id")
      .where("brews.bean_id", "=", Number(bean_id))
      .where("brews.method_id", "=", Number(method_id))
      .where("brews.grinder_id", "=", Number(grinder_id))
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
  } catch (error) {
    console.error("Error fetching brews with feedback:", error);
    return [];
  }
}

export async function suggestOptimalParameters(
  bean_id: string,
  method_id: string,
  grinder_id: string
): Promise<ParameterSuggestion | null> {
  const brews = await getBrewsWithFeedback(bean_id, method_id, grinder_id);
  
  if (brews.length === 0) {
    // No history - provide default parameters based on method
    return getDefaultParameters(method_id);
  }

  // Filter brews with feedback and good ratings
  const brewsWithGoodFeedback = brews.filter(brew => 
    brew.feedback && 
    brew.feedback.overall_rating && 
    brew.feedback.overall_rating >= 4 &&
    !brew.feedback.too_strong &&
    !brew.feedback.too_weak &&
    !brew.feedback.is_sour &&
    !brew.feedback.is_bitter
  );

  if (brewsWithGoodFeedback.length > 0) {
    // Calculate average of good brews
    const avgParams = brewsWithGoodFeedback.reduce(
      (acc, brew) => ({
        water: acc.water + brew.water,
        dose: acc.dose + brew.dose,
        grind: acc.grind + brew.grind,
        ratio: acc.ratio + brew.ratio,
      }),
      { water: 0, dose: 0, grind: 0, ratio: 0 }
    );

    const count = brewsWithGoodFeedback.length;
    return {
      water: Math.round(avgParams.water / count),
      dose: Math.round(avgParams.dose / count),
      grind: Math.round(avgParams.grind / count),
      ratio: Math.round(avgParams.ratio / count),
      confidence: count >= 3 ? 'high' : count >= 2 ? 'medium' : 'low',
      reasoning: `Based on ${count} previous brew${count > 1 ? 's' : ''} with good feedback (rating 4+ stars)`
    };
  }

  // Analyze feedback to suggest improvements
  const brewsWithFeedback = brews.filter(brew => brew.feedback);
  if (brewsWithFeedback.length > 0) {
    return analyzeAndSuggestImprovements(brewsWithFeedback);
  }

  // Fallback to most recent brew
  if (brews.length > 0) {
    const latest = brews[0];
    return {
      water: latest.water,
      dose: latest.dose,
      grind: latest.grind,
      ratio: latest.ratio,
      confidence: 'low',
      reasoning: 'Based on your most recent brew (no feedback available)'
    };
  }

  return null;
}

function analyzeAndSuggestImprovements(brews: BrewWithFeedback[]): ParameterSuggestion {
  // Get the most recent brew as base
  const baseBrew = brews[0];
  let adjustedParams = {
    water: baseBrew.water,
    dose: baseBrew.dose,
    grind: baseBrew.grind,
    ratio: baseBrew.ratio
  };

  let reasoning = "Adjusted based on feedback: ";
  const adjustments: string[] = [];

  // Analyze common feedback patterns
  const feedbackCounts = brews.reduce((acc, brew) => {
    if (brew.feedback) {
      if (brew.feedback.too_strong) acc.tooStrong++;
      if (brew.feedback.too_weak) acc.tooWeak++;
      if (brew.feedback.is_sour) acc.sour++;
      if (brew.feedback.is_bitter) acc.bitter++;
    }
    return acc;
  }, { tooStrong: 0, tooWeak: 0, sour: 0, bitter: 0 });

  // Apply adjustments based on feedback patterns
  if (feedbackCounts.tooStrong > feedbackCounts.tooWeak) {
    // Reduce strength by increasing ratio or decreasing dose
    adjustedParams.ratio = Math.min(adjustedParams.ratio + 1, 20);
    adjustments.push("increased ratio to reduce strength");
  } else if (feedbackCounts.tooWeak > feedbackCounts.tooStrong) {
    // Increase strength by decreasing ratio or increasing dose
    adjustedParams.ratio = Math.max(adjustedParams.ratio - 1, 10);
    adjustments.push("decreased ratio to increase strength");
  }

  if (feedbackCounts.sour > 0) {
    // Reduce sourness by increasing extraction (finer grind or more water)
    adjustedParams.grind = Math.max(adjustedParams.grind - 1, 1);
    adjustments.push("finer grind to reduce sourness");
  }

  if (feedbackCounts.bitter > 0) {
    // Reduce bitterness by decreasing extraction (coarser grind or less water)
    adjustedParams.grind = adjustedParams.grind + 1;
    adjustments.push("coarser grind to reduce bitterness");
  }

  return {
    ...adjustedParams,
    confidence: brews.length >= 3 ? 'medium' : 'low',
    reasoning: reasoning + adjustments.join(", ")
  };
}

async function getDefaultParameters(method_id: string): Promise<ParameterSuggestion> {
  // Get method name to provide appropriate defaults
  try {
    const method = await db
      .selectFrom("methods")
      .where("id", "=", Number(method_id))
      .select("name")
      .executeTakeFirst();

    const methodName = method?.name?.toLowerCase() || "";

    // Default parameters based on common brewing methods
    let defaults = { water: 250, dose: 15, grind: 20, ratio: 17 }; // Generic defaults

    if (methodName.includes("espresso")) {
      defaults = { water: 60, dose: 18, grind: 5, ratio: 3 };
    } else if (methodName.includes("pour over") || methodName.includes("v60")) {
      defaults = { water: 250, dose: 15, grind: 15, ratio: 17 };
    } else if (methodName.includes("french press")) {
      defaults = { water: 350, dose: 21, grind: 30, ratio: 17 };
    } else if (methodName.includes("aeropress")) {
      defaults = { water: 200, dose: 12, grind: 12, ratio: 17 };
    }

    return {
      ...defaults,
      confidence: 'low',
      reasoning: `Default parameters for ${methodName || 'this brewing method'} (no previous brews found)`
    };
  } catch (error) {
    console.error("Error getting method name:", error);
    return {
      water: 250,
      dose: 15,
      grind: 20,
      ratio: 17,
      confidence: 'low',
      reasoning: 'Generic default parameters (no previous brews found)'
    };
  }
}

// Keep existing functions
export async function getPreviousBrews(
  bean_id: string,
  method_id: string,
  grinder_id: string
) {
  return getBrewsWithFeedback(bean_id, method_id, grinder_id);
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
