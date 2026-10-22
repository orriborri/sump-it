import { describe, expect, it } from 'vitest';

import {
  areParametersComplete,
  BREWING_METHODS,
  clampGrindSetting,
  emptyBrewForm,
  formToSessionRequest,
  isEquipmentComplete,
  liveCoffeeRatio,
  parseNumber,
  parseOptionalNumber,
  RATING_MAX,
  RATING_MIN,
  RATING_STEP,
  toBrewingMethod,
  toFriendlyError,
  UNREACHABLE_MESSAGE,
  validateRating,
  type BrewFormData,
} from './recipe';

function form(overrides: Partial<BrewFormData> = {}): BrewFormData {
  return { ...emptyBrewForm(), ...overrides };
}

describe('constants', () => {
  it('exposes the backend rating band and step', () => {
    expect(RATING_MIN).toBe(1.0);
    expect(RATING_MAX).toBe(10.0);
    expect(RATING_STEP).toBe(0.5);
  });

  it('lists the eight brewing methods in order', () => {
    expect(BREWING_METHODS.map((m) => m.value)).toEqual([
      'V60',
      'Chemex',
      'FrenchPress',
      'AeroPress',
      'Espresso',
      'Moka',
      'ColdBrew',
      'Other',
    ]);
  });
});

describe('emptyBrewForm', () => {
  it('returns sensible defaults', () => {
    expect(emptyBrewForm()).toEqual({
      beanId: '',
      grinderId: '',
      brewingMethod: '',
      coffeeGrams: 20,
      waterGrams: 320,
      grindSetting: 20,
    });
  });
});

describe('toBrewingMethod', () => {
  it('resolves every canonical value to itself', () => {
    for (const { value } of BREWING_METHODS) {
      expect(toBrewingMethod(value)).toBe(value);
    }
  });

  it('maps an unrecognized value to the unselected sentinel', () => {
    expect(toBrewingMethod('NotARealMethod')).toBe('');
    expect(toBrewingMethod('')).toBe('');
  });
});

describe('isEquipmentComplete', () => {
  it('is false until bean, grinder and method are all chosen', () => {
    expect(isEquipmentComplete(form())).toBe(false);
    expect(isEquipmentComplete(form({ beanId: 'b' }))).toBe(false);
    expect(isEquipmentComplete(form({ beanId: 'b', grinderId: 'g' }))).toBe(false);
    expect(
      isEquipmentComplete(form({ beanId: 'b', grinderId: 'g', brewingMethod: 'V60' }))
    ).toBe(true);
  });
});

describe('areParametersComplete', () => {
  it('requires positive coffee and water and a non-negative grind', () => {
    expect(areParametersComplete(form())).toBe(true);
    expect(areParametersComplete(form({ coffeeGrams: 0 }))).toBe(false);
    expect(areParametersComplete(form({ waterGrams: 0 }))).toBe(false);
    expect(areParametersComplete(form({ grindSetting: -1 }))).toBe(false);
    expect(areParametersComplete(form({ grindSetting: 0 }))).toBe(true);
  });
});

describe('liveCoffeeRatio', () => {
  it('formats water/coffee with one decimal', () => {
    expect(liveCoffeeRatio(20, 320)).toBe('1:16.0');
    expect(liveCoffeeRatio(18, 36)).toBe('1:2.0');
  });

  it('shows a placeholder when coffee is not positive', () => {
    expect(liveCoffeeRatio(0, 320)).toBe('1:--');
    expect(liveCoffeeRatio(-5, 320)).toBe('1:--');
  });
});

describe('clampGrindSetting', () => {
  const grinder = { minSetting: 5, maxSetting: 30 };

  it('returns the value unchanged when no grinder is selected', () => {
    expect(clampGrindSetting(999, undefined)).toBe(999);
  });

  it('clamps below the minimum up to the minimum', () => {
    expect(clampGrindSetting(1, grinder)).toBe(5);
  });

  it('clamps above the maximum down to the maximum', () => {
    expect(clampGrindSetting(100, grinder)).toBe(30);
  });

  it('leaves an in-range value untouched', () => {
    expect(clampGrindSetting(18, grinder)).toBe(18);
    expect(clampGrindSetting(5, grinder)).toBe(5);
    expect(clampGrindSetting(30, grinder)).toBe(30);
  });
});

describe('validateRating', () => {
  it('accepts an absent rating', () => {
    expect(validateRating(undefined)).toBeNull();
  });

  it('accepts in-band 0.5-step ratings', () => {
    expect(validateRating(1.0)).toBeNull();
    expect(validateRating(7.5)).toBeNull();
    expect(validateRating(10.0)).toBeNull();
  });

  it('rejects out-of-band ratings', () => {
    expect(validateRating(0.5)).toBe('Rating must be between 1.0 and 10.0');
    expect(validateRating(10.5)).toBe('Rating must be between 1.0 and 10.0');
  });

  it('rejects ratings that are not on a 0.5 step', () => {
    expect(validateRating(7.3)).toBe('Rating must be in 0.5 steps');
  });
});

describe('toFriendlyError', () => {
  it('maps network-level failures to the friendly message', () => {
    expect(toFriendlyError('Failed to fetch')).toBe(UNREACHABLE_MESSAGE);
    expect(toFriendlyError('NetworkError when attempting to fetch resource')).toBe(
      UNREACHABLE_MESSAGE
    );
    expect(toFriendlyError('fetch failed')).toBe(UNREACHABLE_MESSAGE);
    expect(toFriendlyError('Load failed')).toBe(UNREACHABLE_MESSAGE);
  });

  it('passes backend business errors through unchanged', () => {
    const message = 'Insufficient bean quantity: 5g available, 18g required';
    expect(toFriendlyError(message)).toBe(message);
  });
});

describe('parseNumber', () => {
  it('parses numeric strings', () => {
    expect(parseNumber('18')).toBe(18);
    expect(parseNumber('36.5')).toBe(36.5);
  });

  it('treats blank and non-numeric strings as zero', () => {
    expect(parseNumber('')).toBe(0);
    expect(parseNumber('abc')).toBe(0);
  });
});

describe('parseOptionalNumber', () => {
  it('returns undefined for a blank string', () => {
    expect(parseOptionalNumber('')).toBeUndefined();
    expect(parseOptionalNumber('   ')).toBeUndefined();
  });

  it('parses numeric strings', () => {
    expect(parseOptionalNumber('93')).toBe(93);
  });

  it('returns undefined for a non-numeric string', () => {
    expect(parseOptionalNumber('nope')).toBeUndefined();
  });
});

describe('formToSessionRequest', () => {
  it('maps numeric fields and collapses empty optionals to null', () => {
    const request = formToSessionRequest(
      form({
        beanId: 'bean-1',
        grinderId: 'grinder-1',
        brewingMethod: 'Espresso',
        coffeeGrams: 18,
        waterGrams: 36,
        grindSetting: 12,
      })
    );
    expect(request).toEqual({
      beanId: 'bean-1',
      grinderId: 'grinder-1',
      brewingMethod: 'Espresso',
      grindSetting: 12,
      waterTempCelsius: null,
      brewTimeSeconds: null,
      coffeeGrams: 18,
      waterGrams: 36,
      rating: null,
      tastingNotes: null,
      feedback: null,
      suggestions: null,
      isTemplate: false,
    });
  });

  it('throws when the brewing method has not been chosen yet', () => {
    // The field is `BrewingMethod | ''`; the workflow only calls this after
    // isEquipmentComplete gates the empty case out, so an empty method is a
    // programming error - guarded explicitly instead of an unchecked cast.
    expect(() => formToSessionRequest(form({ brewingMethod: '' }))).toThrow(
      'Cannot build a session request before a brewing method is chosen'
    );
  });

  it('preserves provided optionals and trims text', () => {
    const request = formToSessionRequest(
      form({
        beanId: 'bean-1',
        grinderId: 'grinder-1',
        brewingMethod: 'V60',
        waterTempCelsius: 93,
        brewTimeSeconds: 180,
        rating: 8.5,
        tastingNotes: '  Floral  ',
        feedback: ' Balanced ',
        suggestions: '   ',
      })
    );
    expect(request.waterTempCelsius).toBe(93);
    expect(request.brewTimeSeconds).toBe(180);
    expect(request.rating).toBe(8.5);
    expect(request.tastingNotes).toBe('Floral');
    expect(request.feedback).toBe('Balanced');
    // Whitespace-only suggestions collapse to null.
    expect(request.suggestions).toBeNull();
  });
});
