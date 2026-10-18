// Pure, framework-free helpers for the session-history page (ticket #146).
//
// All logic the history view needs that does not require React or the network
// lives here so it is cheap to unit test to 100% (see `vitest.config.ts`). The
// React component in `app/sessions/SessionHistory.tsx` is a thin shell over
// these helpers and the typed client.

import type {
  BrewingMethod,
  GrinderType,
} from '@/lib/api/types';
import type { SessionListParams } from '@/lib/trpc/client';

/** Default number of sessions shown per page. */
export const PAGE_SIZE = 10;

/** Brewing methods offered in the method filter, in display order. */
export const METHOD_OPTIONS: readonly { value: BrewingMethod; label: string }[] = [
  { value: 'V60', label: 'V60' },
  { value: 'Chemex', label: 'Chemex' },
  { value: 'FrenchPress', label: 'French Press' },
  { value: 'AeroPress', label: 'AeroPress' },
  { value: 'Espresso', label: 'Espresso' },
  { value: 'Moka', label: 'Moka Pot' },
  { value: 'ColdBrew', label: 'Cold Brew' },
  { value: 'Other', label: 'Other' },
] as const;

/** Grinder types offered in the grinder-type filter, in display order. */
export const GRINDER_TYPE_OPTIONS: readonly { value: GrinderType; label: string }[] = [
  { value: 'BurrConical', label: 'Conical Burr' },
  { value: 'BurrFlat', label: 'Flat Burr' },
  { value: 'Blade', label: 'Blade' },
  { value: 'Manual', label: 'Manual' },
  { value: 'Electric', label: 'Electric' },
] as const;

/** The mutable filter/search form backing the history view. Empty string means
 *  "no constraint" for every field so a controlled input stays defined. */
export interface SessionFilterForm {
  search: string;
  beanOrigin: string;
  roastDateFrom: string;
  roastDateTo: string;
  grinderType: string;
  brewingMethod: string;
  ratingMin: string;
}

/** The initial, unconstrained filter form. */
export function emptyFilterForm(): SessionFilterForm {
  return {
    search: '',
    beanOrigin: '',
    roastDateFrom: '',
    roastDateTo: '',
    grinderType: '',
    brewingMethod: '',
    ratingMin: '',
  };
}

/** Trim a text field; an empty/whitespace value becomes `undefined` so it is
 *  omitted from the query string entirely. */
function textParam(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** Parse the minimum-rating field; blank or non-numeric becomes `undefined`. */
function ratingParam(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Build the typed `SessionListParams` for a given filter form and zero-based
 * page index. Only constrained fields are included; the grinder type and
 * method strings are narrowed to their generated unions (the form only ever
 * holds a valid option value or an empty string, which is dropped first).
 *
 * Pure and total: safe to call on every keystroke.
 */
export function buildListParams(form: SessionFilterForm, page: number): SessionListParams {
  const params: SessionListParams = {
    limit: PAGE_SIZE,
    offset: Math.max(0, page) * PAGE_SIZE,
  };

  const search = textParam(form.search);
  if (search !== undefined) {
    params.q = search;
  }
  const origin = textParam(form.beanOrigin);
  if (origin !== undefined) {
    params.beanOrigin = origin;
  }
  const from = textParam(form.roastDateFrom);
  if (from !== undefined) {
    params.roastDateFrom = from;
  }
  const to = textParam(form.roastDateTo);
  if (to !== undefined) {
    params.roastDateTo = to;
  }
  const grinderType = textParam(form.grinderType);
  if (grinderType !== undefined) {
    params.grinderType = grinderType;
  }
  const method = textParam(form.brewingMethod);
  if (method !== undefined) {
    params.brewingMethod = method;
  }
  const rating = ratingParam(form.ratingMin);
  if (rating !== undefined) {
    params.ratingMin = rating;
  }

  return params;
}

/**
 * Format the stored `coffeeRatio` (or a water/coffee fallback) as `1:N`. The
 * backend persists a generated `coffeeRatio`, but it may be null in flight, so
 * fall back to computing it; a non-positive coffee dose yields a placeholder
 * rather than Infinity/NaN.
 */
export function formatRatio(
  coffeeGrams: number,
  waterGrams: number,
  coffeeRatio: number | null,
): string {
  if (coffeeRatio !== null) {
    return `1:${coffeeRatio.toFixed(1)}`;
  }
  if (coffeeGrams <= 0) {
    return '1:--';
  }
  return `1:${(waterGrams / coffeeGrams).toFixed(1)}`;
}

/** Format an optional rating as `N.N / 10`, or a dash when unrated. */
export function formatRating(rating: number | null): string {
  if (rating === null) {
    return 'Unrated';
  }
  return `${rating.toFixed(1)} / 10`;
}

/** Human-readable label for a brewing method value (falls back to the raw
 *  value for forward-compatibility with unknown methods). */
export function methodLabel(method: string): string {
  return METHOD_OPTIONS.find((m) => m.value === method)?.label ?? method;
}

/**
 * Compute whether a "next page" exists from the total count and the current
 * zero-based page. Pure so the pager can be tested without the component.
 */
export function hasNextPage(total: number, page: number): boolean {
  return (page + 1) * PAGE_SIZE < total;
}

/** Whether a "previous page" exists (any page after the first). */
export function hasPrevPage(page: number): boolean {
  return page > 0;
}

/** Format the "showing X of Y" summary for the current page. */
export function pageSummary(total: number, page: number, shown: number): string {
  if (total === 0) {
    return 'No sessions found.';
  }
  const first = page * PAGE_SIZE + 1;
  const last = page * PAGE_SIZE + shown;
  return `Showing ${first}-${last} of ${total}`;
}
