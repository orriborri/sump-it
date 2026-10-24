// Pure, framework-free helpers for the brew-logging workflow.
//
// All logic the stepper needs that does not require React or the network lives
// here so it is cheap to unit test to 100% (see `vitest.config.ts`). The React
// components in `app/brew/` are thin shells over these helpers and the typed
// client.
//
// The rating rule mirrors the backend (`validation.rs`): a rating is optional,
// but when present it must sit in the inclusive band 1.0 to 10.0 in 0.5 steps.
// The live coffee ratio mirrors the backend's `coffee_ratio` (water / coffee).

import type { BrewingMethod, CreateBrewingSessionRequest, Grinder } from '@/lib/api/types';

/** Minimum/maximum/step for the quality rating, matching the backend. */
export const RATING_MIN = 1.0;
export const RATING_MAX = 10.0;
export const RATING_STEP = 0.5;

/** Brewing methods offered in the equipment step, in display order. */
export const BREWING_METHODS: readonly { value: BrewingMethod; label: string }[] = [
  { value: 'V60', label: 'V60' },
  { value: 'Chemex', label: 'Chemex' },
  { value: 'FrenchPress', label: 'French Press' },
  { value: 'AeroPress', label: 'AeroPress' },
  { value: 'Espresso', label: 'Espresso' },
  { value: 'Moka', label: 'Moka Pot' },
  { value: 'ColdBrew', label: 'Cold Brew' },
  { value: 'Other', label: 'Other' },
] as const;

/** The mutable brew form backing the whole stepper. */
export interface BrewFormData {
  // Step 1: equipment selection.
  beanId: string;
  grinderId: string;
  // '' is the "nothing chosen yet" state; once chosen it is one of the
  // generated `BrewingMethod` union members, so no cast is needed downstream.
  brewingMethod: BrewingMethod | '';
  // Step 2: brewing parameters.
  coffeeGrams: number;
  waterGrams: number;
  grindSetting: number;
  waterTempCelsius?: number;
  brewTimeSeconds?: number;
  // Step 3: brew & rate.
  rating?: number;
  tastingNotes?: string;
  feedback?: string;
  suggestions?: string;
}

/** The initial form used when the page first loads or after a reset. */
export function emptyBrewForm(): BrewFormData {
  return {
    beanId: '',
    grinderId: '',
    brewingMethod: '',
    coffeeGrams: 20,
    waterGrams: 320,
    grindSetting: 20,
  };
}

/**
 * True when the equipment step is complete (bean, grinder and method all
 * chosen). The stepper gates progress past step 1 on this.
 */
export function isEquipmentComplete(form: Pick<BrewFormData, 'beanId' | 'grinderId' | 'brewingMethod'>): boolean {
  return form.beanId !== '' && form.grinderId !== '' && form.brewingMethod !== '';
}

/**
 * True when the brewing-parameters step has usable positive values for coffee,
 * water and grind. The stepper gates progress past step 2 on this.
 */
export function areParametersComplete(
  form: Pick<BrewFormData, 'coffeeGrams' | 'waterGrams' | 'grindSetting'>
): boolean {
  return form.coffeeGrams > 0 && form.waterGrams > 0 && form.grindSetting >= 0;
}

/**
 * Live coffee ratio (water / coffee) as a `1:N` string with one decimal, or a
 * placeholder when the coffee dose is not positive (so the display never shows
 * Infinity/NaN while the user is still typing).
 */
export function liveCoffeeRatio(coffeeGrams: number, waterGrams: number): string {
  if (coffeeGrams <= 0) {
    return '1:--';
  }
  return `1:${(waterGrams / coffeeGrams).toFixed(1)}`;
}

/**
 * Clamp a grind setting into the selected grinder's inclusive range. Used to
 * keep the grind input bounded to the grinder's min/max. When no grinder is
 * selected the value is returned unchanged.
 */
export function clampGrindSetting(setting: number, grinder: Pick<Grinder, 'minSetting' | 'maxSetting'> | undefined): number {
  if (!grinder) {
    return setting;
  }
  if (setting < grinder.minSetting) {
    return grinder.minSetting;
  }
  if (setting > grinder.maxSetting) {
    return grinder.maxSetting;
  }
  return setting;
}

/**
 * Validate the optional rating. Returns an error message, or `null` when the
 * rating is absent or valid (1.0 to 10.0 in 0.5 steps).
 */
export function validateRating(rating: number | undefined): string | null {
  if (rating === undefined) {
    return null;
  }
  if (rating < RATING_MIN || rating > RATING_MAX) {
    return `Rating must be between ${RATING_MIN.toFixed(1)} and ${RATING_MAX.toFixed(1)}`;
  }
  // 0.5-step check: doubling must yield a whole number.
  if (!Number.isInteger(rating * 2)) {
    return 'Rating must be in 0.5 steps';
  }
  return null;
}

/**
 * Parse a required numeric input value, treating a blank or non-numeric string
 * as 0 so a controlled number field always stays defined.
 */
export function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse an optional numeric input value: a blank string means "not provided"
 * (undefined), and a non-numeric string also collapses to undefined.
 */
export function parseOptionalNumber(value: string): number | undefined {
  if (value.trim() === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** Friendly message shown when the brewing backend cannot be reached. */
export const UNREACHABLE_MESSAGE =
  'Could not reach the brewing service. Check that the backend is running and try again.';

/**
 * Map a client error string to a user-facing message. Network-level failures
 * (a rejected `fetch`, which `apiFetch` surfaces as its raw message) become the
 * friendly unreachable message; backend business errors (insufficient quantity,
 * recipe violations) are already actionable and pass through unchanged.
 */
export function toFriendlyError(error: string): string {
  const networkHints = ['failed to fetch', 'networkerror', 'network error', 'fetch failed', 'load failed'];
  const lowered = error.toLowerCase();
  if (networkHints.some((hint) => lowered.includes(hint))) {
    return UNREACHABLE_MESSAGE;
  }
  return error;
}

/**
 * Build the typed `CreateBrewingSessionRequest` body from the form. Optional
 * numeric fields collapse to `null`, and empty/whitespace text fields collapse
 * to `null`, matching the Rust `Option<T>` serialization.
 *
 * The form's `brewingMethod` is `BrewingMethod | ''`. Request conversion is
 * only valid once the equipment step is complete (see `isEquipmentComplete`),
 * so an empty method is rejected explicitly instead of silently becoming a
 * different brewing method.
 */
export function formToSessionRequest(form: BrewFormData): CreateBrewingSessionRequest {
  if (!form.brewingMethod) {
    throw new Error('Brewing method is required');
  }

  const trim = (value: string | undefined): string | null => {
    const trimmed = (value ?? '').trim();
    return trimmed === '' ? null : trimmed;
  };
  return {
    beanId: form.beanId,
    grinderId: form.grinderId,
    brewingMethod: form.brewingMethod,
    grindSetting: form.grindSetting,
    waterTempCelsius: form.waterTempCelsius ?? null,
    brewTimeSeconds: form.brewTimeSeconds ?? null,
    coffeeGrams: form.coffeeGrams,
    waterGrams: form.waterGrams,
    rating: form.rating ?? null,
    tastingNotes: trim(form.tastingNotes),
    feedback: trim(form.feedback),
    suggestions: trim(form.suggestions),
    isTemplate: false,
  };
}
