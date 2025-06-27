export interface FormData {
  bean_id: number
  method_id: number
  grinder_id: number
  water: number
  dose: number
  ratio: number | string // Can be decimal value like 16.67
  grind: number
}

// Alias for FormData to be used in brewing components
export type BrewFormData = FormData

import type { Beans, Methods, Grinders } from '@/app/lib/db.d'
import { RuntimeType } from '@/app/lib/types'

// Re-export types for convenience
export type { Beans, Methods, Grinders, RuntimeType }
