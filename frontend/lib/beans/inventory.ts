// Pure, framework-free helpers for the coffee-bean inventory UI.
//
// All bean business logic that does not need React or the network lives here so
// it is cheap to unit test to 100% (see `vitest.config.ts`). The React
// component in `app/beans/BeanManager.tsx` is a thin shell over these helpers
// and the typed client.

import type {
  BeanUsageRecord,
  CoffeeBean,
  CreateCoffeeBeanRequest,
} from '../api/types';

/** Number of days within which roasted beans are considered fresh. */
export const FRESHNESS_WINDOW_DAYS = 30;

/** Editable bean form state. All fields are strings so inputs stay controlled. */
export interface BeanFormState {
  name: string;
  origin: string;
  roastDate: string;
  purchaseDate: string;
  remainingGrams: string;
  variety: string;
  processingMethod: string;
}

/** An empty form, used for the "add bean" flow. */
export function emptyBeanForm(): BeanFormState {
  return {
    name: '',
    origin: '',
    roastDate: '',
    purchaseDate: '',
    remainingGrams: '',
    variety: '',
    processingMethod: '',
  };
}

/** Populates a form from an existing bean, for the "edit bean" flow. */
export function beanToForm(bean: CoffeeBean): BeanFormState {
  return {
    name: bean.name,
    origin: bean.origin,
    roastDate: bean.roastDate,
    purchaseDate: bean.purchaseDate,
    remainingGrams: bean.remainingGrams == null ? '' : String(bean.remainingGrams),
    variety: bean.variety ?? '',
    processingMethod: bean.processingMethod ?? '',
  };
}

/**
 * Computes whole days elapsed since a roast date relative to `today`.
 *
 * Both dates are treated as calendar dates (time-of-day ignored) so the result
 * matches the backend's `days_since_roast`.
 */
export function daysSinceRoast(roastDate: string, today: Date): number {
  const roast = new Date(`${roastDate}T00:00:00Z`);
  const ref = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((ref.getTime() - roast.getTime()) / msPerDay);
}

/** True when the bean was roasted within the freshness window. */
export function isFresh(roastDate: string, today: Date): boolean {
  return daysSinceRoast(roastDate, today) <= FRESHNESS_WINDOW_DAYS;
}

/** Human-readable remaining-quantity label. */
export function formatRemaining(remainingGrams: number | null): string {
  if (remainingGrams == null) {
    return 'Not tracked';
  }
  return `${remainingGrams}g remaining`;
}

/**
 * Validates a bean form client-side, mirroring the backend rules so the user
 * gets an immediate, clearly named error. Returns an error message, or `null`
 * when the form is valid.
 *
 * Rules: non-empty name and origin, no future roast/purchase dates, and a
 * non-negative numeric remaining-grams value when provided.
 */
export function validateBeanForm(form: BeanFormState, today: Date): string | null {
  if (form.name.trim() === '') {
    return 'Name is required';
  }
  if (form.origin.trim() === '') {
    return 'Origin is required';
  }
  if (form.roastDate === '') {
    return 'Roast date is required';
  }
  if (form.purchaseDate === '') {
    return 'Purchase date is required';
  }

  const todayIso = today.toISOString().slice(0, 10);
  if (form.roastDate > todayIso) {
    return 'Roast date cannot be in the future';
  }
  if (form.purchaseDate > todayIso) {
    return 'Purchase date cannot be in the future';
  }

  if (form.remainingGrams.trim() !== '') {
    const grams = Number(form.remainingGrams);
    if (Number.isNaN(grams)) {
      return 'Remaining grams must be a number';
    }
    if (grams < 0) {
      return 'Remaining grams cannot be negative';
    }
  }

  return null;
}

/**
 * Builds the typed create/update request from a validated form. Optional text
 * fields collapse to `null` (matching the Rust `Option<T>` serialization) and
 * an empty remaining-grams field means "not tracked".
 */
export function formToRequest(form: BeanFormState): CreateCoffeeBeanRequest {
  const trimmedGrams = form.remainingGrams.trim();
  const variety = form.variety.trim();
  const processingMethod = form.processingMethod.trim();
  return {
    name: form.name.trim(),
    origin: form.origin.trim(),
    roastDate: form.roastDate,
    purchaseDate: form.purchaseDate,
    remainingGrams: trimmedGrams === '' ? null : Number(trimmedGrams),
    variety: variety === '' ? null : variety,
    processingMethod: processingMethod === '' ? null : processingMethod,
  };
}

/** Formats a usage record's rating for display. */
export function formatUsageRating(rating: number | null): string {
  return rating == null ? 'Unrated' : rating.toFixed(1);
}

/** Formats a usage record's brew date (ISO timestamp) as a calendar date. */
export function formatUsageDate(record: Pick<BeanUsageRecord, 'brewDate'>): string {
  return record.brewDate.slice(0, 10);
}
