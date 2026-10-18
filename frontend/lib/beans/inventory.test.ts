import { describe, expect, it } from 'vitest';
import type { CoffeeBean } from '../api/types';
import {
  beanToForm,
  daysSinceRoast,
  emptyBeanForm,
  formatRemaining,
  formatUsageDate,
  formatUsageRating,
  formToRequest,
  isFresh,
  validateBeanForm,
  type BeanFormState,
} from './inventory';

const TODAY = new Date('2026-06-15T12:30:00Z');

function makeBean(overrides: Partial<CoffeeBean> = {}): CoffeeBean {
  return {
    id: 'bean-1',
    name: 'Ethiopia Yirgacheffe',
    origin: 'Ethiopia',
    roastDate: '2026-06-01',
    purchaseDate: '2026-06-02',
    remainingGrams: 250,
    variety: 'Heirloom',
    processingMethod: 'Washed',
    isActive: true,
    createdAt: '2026-06-02T00:00:00Z',
    updatedAt: '2026-06-02T00:00:00Z',
    ...overrides,
  };
}

function validForm(overrides: Partial<BeanFormState> = {}): BeanFormState {
  return {
    name: 'Ethiopia',
    origin: 'Ethiopia',
    roastDate: '2026-06-01',
    purchaseDate: '2026-06-02',
    remainingGrams: '250',
    variety: 'Heirloom',
    processingMethod: 'Washed',
    ...overrides,
  };
}

describe('emptyBeanForm', () => {
  it('returns an all-empty form', () => {
    expect(emptyBeanForm()).toEqual({
      name: '',
      origin: '',
      roastDate: '',
      purchaseDate: '',
      remainingGrams: '',
      variety: '',
      processingMethod: '',
    });
  });
});

describe('beanToForm', () => {
  it('maps a fully populated bean', () => {
    expect(beanToForm(makeBean())).toEqual({
      name: 'Ethiopia Yirgacheffe',
      origin: 'Ethiopia',
      roastDate: '2026-06-01',
      purchaseDate: '2026-06-02',
      remainingGrams: '250',
      variety: 'Heirloom',
      processingMethod: 'Washed',
    });
  });

  it('maps null optional fields to empty strings', () => {
    const form = beanToForm(
      makeBean({ remainingGrams: null, variety: null, processingMethod: null })
    );
    expect(form.remainingGrams).toBe('');
    expect(form.variety).toBe('');
    expect(form.processingMethod).toBe('');
  });
});

describe('daysSinceRoast', () => {
  it('counts whole days ignoring time of day', () => {
    expect(daysSinceRoast('2026-06-01', TODAY)).toBe(14);
  });

  it('is zero for a roast dated today', () => {
    expect(daysSinceRoast('2026-06-15', TODAY)).toBe(0);
  });
});

describe('isFresh', () => {
  it('is fresh within the 30-day window (inclusive)', () => {
    expect(isFresh('2026-05-16', TODAY)).toBe(true); // exactly 30 days
  });

  it('is not fresh beyond the window', () => {
    expect(isFresh('2026-05-15', TODAY)).toBe(false); // 31 days
  });
});

describe('formatRemaining', () => {
  it('labels an untracked quantity', () => {
    expect(formatRemaining(null)).toBe('Not tracked');
  });

  it('labels a tracked quantity', () => {
    expect(formatRemaining(250)).toBe('250g remaining');
  });
});

describe('validateBeanForm', () => {
  it('accepts a valid form', () => {
    expect(validateBeanForm(validForm(), TODAY)).toBeNull();
  });

  it('accepts a valid form with no remaining grams', () => {
    expect(validateBeanForm(validForm({ remainingGrams: '   ' }), TODAY)).toBeNull();
  });

  it('requires a name', () => {
    expect(validateBeanForm(validForm({ name: '  ' }), TODAY)).toBe('Name is required');
  });

  it('requires an origin', () => {
    expect(validateBeanForm(validForm({ origin: '' }), TODAY)).toBe('Origin is required');
  });

  it('requires a roast date', () => {
    expect(validateBeanForm(validForm({ roastDate: '' }), TODAY)).toBe(
      'Roast date is required'
    );
  });

  it('requires a purchase date', () => {
    expect(validateBeanForm(validForm({ purchaseDate: '' }), TODAY)).toBe(
      'Purchase date is required'
    );
  });

  it('rejects a future roast date', () => {
    expect(validateBeanForm(validForm({ roastDate: '2026-06-16' }), TODAY)).toBe(
      'Roast date cannot be in the future'
    );
  });

  it('rejects a future purchase date', () => {
    expect(validateBeanForm(validForm({ purchaseDate: '2026-06-16' }), TODAY)).toBe(
      'Purchase date cannot be in the future'
    );
  });

  it('rejects a non-numeric remaining grams', () => {
    expect(validateBeanForm(validForm({ remainingGrams: 'abc' }), TODAY)).toBe(
      'Remaining grams must be a number'
    );
  });

  it('rejects a negative remaining grams', () => {
    expect(validateBeanForm(validForm({ remainingGrams: '-5' }), TODAY)).toBe(
      'Remaining grams cannot be negative'
    );
  });
});

describe('formToRequest', () => {
  it('builds a request with trimmed values', () => {
    expect(formToRequest(validForm({ name: '  Ethiopia  ', origin: ' Ethiopia ' }))).toEqual({
      name: 'Ethiopia',
      origin: 'Ethiopia',
      roastDate: '2026-06-01',
      purchaseDate: '2026-06-02',
      remainingGrams: 250,
      variety: 'Heirloom',
      processingMethod: 'Washed',
    });
  });

  it('collapses empty optional fields to null', () => {
    const request = formToRequest(
      validForm({ remainingGrams: '  ', variety: '', processingMethod: '   ' })
    );
    expect(request.remainingGrams).toBeNull();
    expect(request.variety).toBeNull();
    expect(request.processingMethod).toBeNull();
  });
});

describe('formatUsageRating', () => {
  it('labels an unrated session', () => {
    expect(formatUsageRating(null)).toBe('Unrated');
  });

  it('formats a rating to one decimal', () => {
    expect(formatUsageRating(8)).toBe('8.0');
  });
});

describe('formatUsageDate', () => {
  it('extracts the calendar date from a timestamp', () => {
    expect(formatUsageDate({ brewDate: '2026-06-10T09:15:00Z' })).toBe('2026-06-10');
  });
});
