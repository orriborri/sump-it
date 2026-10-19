// Pure formatting helpers for brewing data shown in the UI.
//
// These are deliberately free of React and network dependencies so they are
// cheap to unit test. They are the first module under the frontend coverage
// gate (see `vitest.config.ts` and `docs/coverage.md`) and demonstrate the
// inline `/* v8 ignore */` exclusion convention.

/**
 * Formats a coffee-to-water ratio as a `1:N` string with one decimal place.
 *
 * @param coffeeGrams - Dose of coffee in grams. Must be greater than zero.
 * @param waterGrams - Volume of water in grams.
 * @returns A ratio string such as `"1:16.0"`.
 */
export function formatCoffeeRatio(coffeeGrams: number, waterGrams: number): string {
  /* v8 ignore start -- coverage: defensive guard against a divide-by-zero that the brewing form's validation already prevents; kept so a future caller cannot produce Infinity/NaN silently. */
  if (coffeeGrams <= 0) {
    return '1:0.0';
  }
  /* v8 ignore stop */

  const ratio = waterGrams / coffeeGrams;
  return `1:${ratio.toFixed(1)}`;
}

/**
 * Formats a brew time given in seconds as `m:ss`.
 *
 * @param totalSeconds - Non-negative brew duration in seconds.
 * @returns A clock-style string such as `"3:05"`.
 */
export function formatBrewTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
