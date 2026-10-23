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

/**
 * Brewing methods offered in the equipment step, in display order.
 *
 * This is the SINGLE canonical frontend method-options list: both the equipment
 * selector (`app/brew/BeanSelector.tsx`) and `formToSessionRequest` below
 * consume it, so adding or renaming a method is a one-line edit here. The
 * `value` is the generated `BrewingMethod` union, which keeps this list in sync
 * with the backend contract at compile time; the backend `rules_for` table
 * stays the single recipe authority.
 */
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

/**
 * Type guard: true when `value` is one of the canonical `BrewingMethod`
 * variants. Used to narrow the method `<Select>`'s raw string value back to the
 * generated union without an unchecked cast (the selector only offers values
 * from {@link BREWING_METHODS}, so an unknown value is a programming error and
 * is treated as "no method chosen").
 */
export function isBrewingMethod(value: string): value is BrewingMethod {
  return BREWING_METHODS.some((method) => method.value === value);
}

/** The mutable brew form backing the whole stepper. */
export interface BrewFormData {
  // Step 1: equipment selection.
  beanId: string;
  grinderId: string;
  /**
   * The chosen brewing method, or `''` before one is picked. Typing the field
   * as `BrewingMethod | ''` (rather than a plain `string`) lets
   * `formToSessionRequest` narrow to `BrewingMethod` without an unchecked cast.
   */
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
 * The form field is `BrewingMethod | ''`; this narrows it to the generated
 * `BrewingMethod` union with a guard instead of an unchecked cast. The
 * equipment-step gate (`isEquipmentComplete`) prevents submission until a
 * method is chosen, so the guard throwing signals a programming error (submit
 * reached with no method) rather than a user-reachable state.
 */
export function formToSessionRequest(form: BrewFormData): CreateBrewingSessionRequest {
  const trim = (value: string | undefined): string | null => {
    const trimmed = (value ?? '').trim();
    return trimmed === '' ? null : trimmed;
  };
  if (form.brewingMethod === '') {
    throw new Error('Cannot build a session request without a brewing method.');
  }
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
