// Pure, framework-free validation for the grinder-management form.
//
// Mirrors the backend rules in `backend/src/validation.rs`
// (`validate_grinder_setting_range`, `validate_grinder_brand`) and the
// database CHECK constraints so the UI can reject bad input before a request
// is ever sent. Kept free of React/MUI so it is cheap to unit test and sits
// under the frontend coverage gate.

import type { CreateGrinderRequest, GrinderType } from '@/lib/api/types';

/** The grinder types offered in the form, in display order. */
export const GRINDER_TYPES: readonly GrinderType[] = [
  'BurrConical',
  'BurrFlat',
  'Blade',
  'Manual',
  'Electric',
] as const;

/** Mutable shape backing the add/edit form fields. */
export interface GrinderFormState {
  brand: string;
  model: string;
  grinderType: GrinderType;
  minSetting: number;
  maxSetting: number;
  scaleType: string;
  description: string;
}

/** The empty form used when adding a new grinder. */
export function emptyGrinderForm(): GrinderFormState {
  return {
    brand: '',
    model: '',
    grinderType: 'BurrConical',
    minSetting: 0,
    maxSetting: 40,
    scaleType: '',
    description: '',
  };
}

/**
 * Validate the grinder form. Returns a human-readable error message, or `null`
 * when the form is valid. The first failing rule wins so the user sees one
 * clear message at a time.
 */
export function validateGrinderForm(form: GrinderFormState): string | null {
  if (form.brand.trim().length === 0) {
    return 'Brand is required';
  }
  if (form.brand.length > 100) {
    return 'Brand must be 100 characters or less';
  }
  if (form.model.trim().length === 0) {
    return 'Model is required';
  }
  if (form.model.length > 100) {
    return 'Model must be 100 characters or less';
  }
  if (!Number.isInteger(form.minSetting) || !Number.isInteger(form.maxSetting)) {
    return 'Settings must be whole numbers';
  }
  if (form.minSetting < 0) {
    return 'Minimum setting must be non-negative';
  }
  if (form.maxSetting <= form.minSetting) {
    return `Maximum setting (${form.maxSetting}) must be greater than minimum setting (${form.minSetting})`;
  }
  return null;
}

/**
 * Convert validated form state into the generated `CreateGrinderRequest` body.
 * Optional text fields map to `null` to match the Rust `Option<T>`
 * serialization (an empty string is treated as "not provided").
 */
export function toCreateGrinderRequest(form: GrinderFormState): CreateGrinderRequest {
  return {
    brand: form.brand.trim(),
    model: form.model.trim(),
    grinderType: form.grinderType,
    minSetting: form.minSetting,
    maxSetting: form.maxSetting,
    scaleType: form.scaleType.trim() === '' ? null : form.scaleType.trim(),
    description: form.description.trim() === '' ? null : form.description.trim(),
  };
}
