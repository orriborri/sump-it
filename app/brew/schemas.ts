import { z } from 'zod'

/**
 * Validation schema for brew form data
 * Ensures all required fields are present and valid
 */
export const brewFormSchema = z.object({
  bean_id: z.number().min(1, 'Bean selection is required'),
  method_id: z.number().min(1, 'Method selection is required'),
  grinder_id: z.number().min(1, 'Grinder selection is required'),
  water: z
    .number()
    .min(1, 'Water amount must be positive')
    .max(1000, 'Water amount too large'),
  dose: z
    .number()
    .min(1, 'Dose amount must be positive')
    .max(100, 'Dose amount too large'),
  grind: z
    .number()
    .min(0.1, 'Grind setting must be positive')
    .max(100, 'Grind setting too large'),
  ratio: z.union([z.number(), z.string()]).refine(val => {
    const num = typeof val === 'string' ? parseFloat(val) : val
    return !isNaN(num) && num >= 1 && num <= 30
  }, 'Ratio must be a valid number between 1 and 30'),
})

/**
 * Validation schema for brew feedback data
 */
export const brewFeedbackSchema = z.object({
  coffee_amount_ml: z.number().min(1).max(1000).optional(),
  too_strong: z.boolean().default(false),
  too_weak: z.boolean().default(false),
  is_sour: z.boolean().default(false),
  is_bitter: z.boolean().default(false),
  overall_rating: z.number().min(1).max(5).optional(),
})

/**
 * Type-safe form data types derived from schemas
 */
export type BrewFormData = z.infer<typeof brewFormSchema>
export type BrewFeedbackData = z.infer<typeof brewFeedbackSchema>

/**
 * Validation helper functions
 */
export const validateBrewForm = (data: unknown): BrewFormData => {
  return brewFormSchema.parse(data)
}

export const validateBrewFeedback = (data: unknown): BrewFeedbackData => {
  return brewFeedbackSchema.parse(data)
}
