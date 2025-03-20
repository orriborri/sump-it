import type { Brews, Beans, Methods, Grinders, BrewFeedback } from "../lib/db";
import type { Selectable } from "kysely";

export type Brew = {
  id: number;
  created_at: Date;
  bean_name: string | null;
  method_name: string | null;
  grinder_name: string | null;
  grind: number | null;
  water: number | null;
  dose: number | null;
  ratio: number | null;
  strength_rating: number | null;
  taste_balance: number | null;
  coffee_amount_ml: number | null;
};

export { getBrews, deleteBrew } from './actions';
