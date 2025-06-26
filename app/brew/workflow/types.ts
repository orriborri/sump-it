export interface FormData {
  bean_id: string;
  method_id: string;
  grinder_id: string;
  water: number;
  dose: number;
  ratio: number;
  grind: number;
}

// Alias for FormData to be used in brewing components
export type BrewFormData = FormData;

import type { Beans, Methods, Grinders } from "@/app/lib/db.d";
import { RuntimeType } from "@/app/lib/types";

// Re-export types for convenience
export type { Beans, Methods, Grinders, RuntimeType };
