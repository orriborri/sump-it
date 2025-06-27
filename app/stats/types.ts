export type Brew = {
  id: number
  created_at: string
  bean_name: string | null
  method_name: string | null
  grinder_name: string | null
  grind: number
  water: number
  dose: number
  ratio: number
  too_strong: boolean | null
  too_weak: boolean | null
  is_sour: boolean | null
  is_bitter: boolean | null
  overall_rating: number | null
  coffee_amount_ml: number | null
}
