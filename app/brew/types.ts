export interface BrewFormData {
  bean_id: number;
  method_id: number;
  grinder_id: number;
  grind: number;
  water: number;
  dose: number;
  ratio: number;
}

export interface FeedbackFormData {
  coffee_amount_ml?: number;
  strength_rating: number;
  taste_balance: number;
}
