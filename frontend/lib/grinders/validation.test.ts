import { describe, expect, it } from 'vitest';

import {
  GRINDER_TYPES,
  emptyGrinderForm,
  toCreateGrinderRequest,
  validateGrinderForm,
  type GrinderFormState,
} from './validation';

function validForm(overrides: Partial<GrinderFormState> = {}): GrinderFormState {
  return { ...emptyGrinderForm(), brand: 'Comandante', model: 'C40', ...overrides };
}

describe('GRINDER_TYPES', () => {
  it('lists the five grinder types in order', () => {
    expect(GRINDER_TYPES).toEqual([
      'BurrConical',
      'BurrFlat',
      'Blade',
      'Manual',
      'Electric',
    ]);
  });
});

describe('emptyGrinderForm', () => {
  it('returns sensible defaults', () => {
    expect(emptyGrinderForm()).toEqual({
      brand: '',
      model: '',
      grinderType: 'BurrConical',
      minSetting: 0,
      maxSetting: 40,
      scaleType: '',
      description: '',
    });
  });
});

describe('validateGrinderForm', () => {
  it('accepts a valid form', () => {
    expect(validateGrinderForm(validForm())).toBeNull();
  });

  it('rejects a blank brand', () => {
    expect(validateGrinderForm(validForm({ brand: '   ' }))).toBe('Brand is required');
  });

  it('rejects an over-long brand', () => {
    expect(validateGrinderForm(validForm({ brand: 'x'.repeat(101) }))).toBe(
      'Brand must be 100 characters or less'
    );
  });

  it('rejects a blank model', () => {
    expect(validateGrinderForm(validForm({ model: '  ' }))).toBe('Model is required');
  });

  it('rejects an over-long model', () => {
    expect(validateGrinderForm(validForm({ model: 'y'.repeat(101) }))).toBe(
      'Model must be 100 characters or less'
    );
  });

  it('rejects non-integer settings', () => {
    expect(validateGrinderForm(validForm({ minSetting: 1.5 }))).toBe(
      'Settings must be whole numbers'
    );
    expect(validateGrinderForm(validForm({ maxSetting: 2.5 }))).toBe(
      'Settings must be whole numbers'
    );
  });

  it('rejects a negative minimum setting', () => {
    expect(validateGrinderForm(validForm({ minSetting: -1, maxSetting: 40 }))).toBe(
      'Minimum setting must be non-negative'
    );
  });

  it('rejects a maximum not greater than the minimum', () => {
    expect(validateGrinderForm(validForm({ minSetting: 40, maxSetting: 40 }))).toBe(
      'Maximum setting (40) must be greater than minimum setting (40)'
    );
    expect(validateGrinderForm(validForm({ minSetting: 40, maxSetting: 10 }))).toBe(
      'Maximum setting (10) must be greater than minimum setting (40)'
    );
  });
});

describe('toCreateGrinderRequest', () => {
  it('trims text and preserves values', () => {
    const request = toCreateGrinderRequest(
      validForm({
        brand: '  Comandante  ',
        model: '  C40  ',
        grinderType: 'Manual',
        minSetting: 0,
        maxSetting: 30,
        scaleType: ' step ',
        description: ' Hand grinder ',
      })
    );
    expect(request).toEqual({
      brand: 'Comandante',
      model: 'C40',
      grinderType: 'Manual',
      minSetting: 0,
      maxSetting: 30,
      scaleType: 'step',
      description: 'Hand grinder',
    });
  });

  it('maps empty optional fields to null', () => {
    const request = toCreateGrinderRequest(
      validForm({ scaleType: '   ', description: '' })
    );
    expect(request.scaleType).toBeNull();
    expect(request.description).toBeNull();
  });
});
