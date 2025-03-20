"use server";

import { db } from "../../lib/database";
import { revalidatePath } from "next/cache";
import type { FeedbackFormData } from "./types";

export const submitBrewFeedback = async (
  brewId: number,
  data: FeedbackFormData
) => {
  const feedbackData = {
    brew_id: brewId,
    ...(data.coffee_amount_ml !== undefined && {
      coffee_amount_ml: data.coffee_amount_ml,
    }),
    too_strong: data.too_strong,
    too_weak: data.too_weak,
    is_sour: data.is_sour,
    is_bitter: data.is_bitter,
    overall_rating: data.overall_rating,
  };

  await db.insertInto("brew_feedback").values(feedbackData).execute();
  revalidatePath(`/brew/${brewId}`);
};
