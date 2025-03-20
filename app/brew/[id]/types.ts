import { db } from "../../lib/database";
import type { InferResult } from "kysely";

const feedbackQuery = db
  .selectFrom("brew_feedback")
  .select([
    "coffee_amount_ml",
    "too_strong",
    "too_weak",
    "is_sour",
    "is_bitter",
    "overall_rating",
  ]);

export type FeedbackFormData = Omit<
  InferResult<typeof feedbackQuery>[0],
  "id" | "created_at" | "brew_id"
>;
