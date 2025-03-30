import { db } from "../../lib/database";
import type { InferResult } from "kysely";

// Query used only for type inference
type FeedbackQueryResult = InferResult<typeof feedbackQuery>[0];
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
  FeedbackQueryResult,
  "id" | "created_at" | "brew_id"
>;

export interface RecentBrewFeedback {
  feedback_id: number;
  brew_id: number;
  grind: number | null;
  ratio: number | null;
  coffee_amount_ml: number | null;
  too_strong: boolean;
  too_weak: boolean;
  is_sour: boolean;
  is_bitter: boolean;
  overall_rating: number | null;
  created_at: Date;
}
