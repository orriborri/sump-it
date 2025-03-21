export interface BrewFormData {
  bean_id: number;
  method_id: number;
  grinder_id: number;
  grind: number;
  water: number;
  dose: number;
  ratio: number;
}

export interface PreviousFeedback {
  grind: number;
  ratio: number | null;
  too_strong: boolean;
  too_weak: boolean;
  is_sour: boolean;
  is_bitter: boolean;
  overall_rating: number | null;
}

export interface FeedbackFormData {
  coffee_amount_ml?: number;
  strength_rating: number;
  taste_balance: number;
}
