import { describe, expect, it } from 'vitest';

import {
  GRINDER_TYPE_OPTIONS,
  METHOD_OPTIONS,
  PAGE_SIZE,
  buildListParams,
  emptyFilterForm,
  formatRating,
  formatRatio,
  hasNextPage,
  hasPrevPage,
  methodLabel,
  pageSummary,
  type SessionFilterForm,
} from './history';

describe('emptyFilterForm', () => {
  it('starts fully unconstrained', () => {
    expect(emptyFilterForm()).toEqual({
      search: '',
      beanOrigin: '',
      roastDateFrom: '',
      roastDateTo: '',
      grinderType: '',
      brewingMethod: '',
      ratingMin: '',
    });
  });
});

describe('option tables', () => {
  it('expose every method and grinder type', () => {
    expect(METHOD_OPTIONS.map((m) => m.value)).toContain('Espresso');
    expect(GRINDER_TYPE_OPTIONS.map((g) => g.value)).toContain('BurrConical');
  });
});

describe('buildListParams', () => {
  it('includes only paging when the form is empty', () => {
    const params = buildListParams(emptyFilterForm(), 0);
    expect(params).toEqual({ limit: PAGE_SIZE, offset: 0 });
  });

  it('computes offset from the page index', () => {
    const params = buildListParams(emptyFilterForm(), 2);
    expect(params.offset).toBe(2 * PAGE_SIZE);
  });

  it('floors a negative page to offset 0', () => {
    const params = buildListParams(emptyFilterForm(), -3);
    expect(params.offset).toBe(0);
  });

  it('maps every constrained field, trimming text', () => {
    const form: SessionFilterForm = {
      search: '  berry ',
      beanOrigin: ' Ethiopia ',
      roastDateFrom: '2026-01-01',
      roastDateTo: '2026-02-01',
      grinderType: 'BurrConical',
      brewingMethod: 'V60',
      ratingMin: '7.5',
    };
    expect(buildListParams(form, 0)).toEqual({
      limit: PAGE_SIZE,
      offset: 0,
      q: 'berry',
      beanOrigin: 'Ethiopia',
      roastDateFrom: '2026-01-01',
      roastDateTo: '2026-02-01',
      grinderType: 'BurrConical',
      brewingMethod: 'V60',
      ratingMin: 7.5,
    });
  });

  it('drops whitespace-only text fields and blank rating', () => {
    const form: SessionFilterForm = {
      ...emptyFilterForm(),
      search: '   ',
      beanOrigin: '  ',
      ratingMin: '  ',
    };
    expect(buildListParams(form, 0)).toEqual({ limit: PAGE_SIZE, offset: 0 });
  });

  it('drops a non-numeric rating', () => {
    const form: SessionFilterForm = { ...emptyFilterForm(), ratingMin: 'abc' };
    const params = buildListParams(form, 0);
    expect(params.ratingMin).toBeUndefined();
  });
});

describe('formatRatio', () => {
  it('uses the stored ratio when present', () => {
    expect(formatRatio(20, 320, 16)).toBe('1:16.0');
  });

  it('falls back to computing the ratio', () => {
    expect(formatRatio(20, 320, null)).toBe('1:16.0');
  });

  it('shows a placeholder when the coffee dose is not positive', () => {
    expect(formatRatio(0, 320, null)).toBe('1:--');
  });
});

describe('formatRating', () => {
  it('formats a present rating out of ten', () => {
    expect(formatRating(8.5)).toBe('8.5 / 10');
  });

  it('labels an absent rating', () => {
    expect(formatRating(null)).toBe('Unrated');
  });
});

describe('methodLabel', () => {
  it('maps a known method to its friendly label', () => {
    expect(methodLabel('FrenchPress')).toBe('French Press');
  });

  it('falls back to the raw value for an unknown method', () => {
    expect(methodLabel('Siphon')).toBe('Siphon');
  });
});

describe('paging helpers', () => {
  it('detects a next page only when more rows remain', () => {
    expect(hasNextPage(PAGE_SIZE * 2, 0)).toBe(true);
    expect(hasNextPage(PAGE_SIZE, 0)).toBe(false);
    expect(hasNextPage(PAGE_SIZE + 1, 0)).toBe(true);
  });

  it('detects a previous page only after the first', () => {
    expect(hasPrevPage(0)).toBe(false);
    expect(hasPrevPage(1)).toBe(true);
  });

  it('summarises the current page', () => {
    expect(pageSummary(0, 0, 0)).toBe('No sessions found.');
    expect(pageSummary(25, 0, PAGE_SIZE)).toBe(`Showing 1-${PAGE_SIZE} of 25`);
    expect(pageSummary(25, 2, 5)).toBe(`Showing ${2 * PAGE_SIZE + 1}-${2 * PAGE_SIZE + 5} of 25`);
  });
});
