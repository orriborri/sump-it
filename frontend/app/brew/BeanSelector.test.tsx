import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BeanSelector } from './BeanSelector';
import { BREWING_METHODS } from '@/lib/brew/recipe';
import type { BrewingMethod } from '@/lib/api/types';

interface Bean {
  id: string;
  name: string;
  origin: string;
  roastDate: string;
  remainingGrams?: number | null;
  isFresh?: boolean;
}

interface Grinder {
  id: string;
  brand: string;
  model: string;
  grinderType: string;
  minSetting: number;
  maxSetting: number;
}

function bean(overrides: Partial<Bean> = {}): Bean {
  return {
    id: 'bean-1',
    name: 'Ethiopia Yirgacheffe',
    origin: 'Ethiopia',
    roastDate: '2026-06-01',
    remainingGrams: 250,
    isFresh: true,
    ...overrides,
  };
}

function grinder(overrides: Partial<Grinder> = {}): Grinder {
  return {
    id: 'grinder-1',
    brand: 'Comandante',
    model: 'C40',
    grinderType: 'BurrConical',
    minSetting: 0,
    maxSetting: 40,
    ...overrides,
  };
}

function setup(
  props: Partial<Parameters<typeof BeanSelector>[0]> = {},
  formOverrides: Partial<{ beanId: string; grinderId: string; brewingMethod: BrewingMethod | '' }> = {}
) {
  const updateFormData = vi.fn();
  const formData: { beanId: string; grinderId: string; brewingMethod: BrewingMethod | '' } = {
    beanId: '',
    grinderId: '',
    brewingMethod: '',
    ...formOverrides,
  };
  render(
    <BeanSelector
      formData={formData}
      updateFormData={updateFormData}
      beans={[bean()]}
      grinders={[grinder()]}
      isLoading={false}
      {...props}
    />
  );
  return { updateFormData };
}

describe('BeanSelector', () => {
  it('renders a spinner while loading', () => {
    setup({ isLoading: true });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('warns when there are no beans or grinders', () => {
    setup({ beans: [], grinders: [] });
    expect(screen.getByText('No coffee beans found. Please add beans first.')).toBeInTheDocument();
    expect(screen.getByText('No grinders found. Please add a grinder first.')).toBeInTheDocument();
  });

  it('selects a bean and shows its chips', async () => {
    const user = userEvent.setup();
    const { updateFormData } = setup();
    await user.click(screen.getByLabelText('Coffee Bean'));
    await user.click(within(screen.getByRole('listbox')).getByText('Ethiopia Yirgacheffe'));
    expect(updateFormData).toHaveBeenCalledWith({ beanId: 'bean-1' });
  });

  it('shows fresh/remaining chips and a summary for a selected bean', () => {
    setup({}, { beanId: 'bean-1' });
    expect(screen.getByText('Fresh beans')).toBeInTheDocument();
    expect(screen.getByText('250g remaining')).toBeInTheDocument();
    expect(screen.getByText(/Ethiopia Yirgacheffe \(Ethiopia\)/)).toBeInTheDocument();
  });

  it('shows an empty-bag chip when a selected bean has zero remaining', () => {
    setup({ beans: [bean({ remainingGrams: 0 })] }, { beanId: 'bean-1' });
    // remainingGrams is 0 (not null), so the "0g remaining" chip renders with
    // the error color branch.
    expect(screen.getByText('0g remaining')).toBeInTheDocument();
  });

  it('marks an aged bean and hides remaining when not tracked', () => {
    setup(
      { beans: [bean({ isFresh: false, remainingGrams: null })] },
      { beanId: 'bean-1' }
    );
    expect(screen.getByText('Aged beans')).toBeInTheDocument();
    expect(screen.queryByText(/remaining/)).not.toBeInTheDocument();
  });

  it('selects a grinder and shows its chips', async () => {
    const user = userEvent.setup();
    const { updateFormData } = setup();
    await user.click(screen.getByLabelText('Grinder'));
    await user.click(within(screen.getByRole('listbox')).getByText('Comandante C40'));
    expect(updateFormData).toHaveBeenCalledWith({ grinderId: 'grinder-1' });
  });

  it('shows the grinder summary and setting chips when selected', () => {
    setup({}, { grinderId: 'grinder-1' });
    expect(screen.getByText('Settings: 0-40')).toBeInTheDocument();
    // The grinder name appears both in the dropdown value and the summary.
    expect(screen.getAllByText(/Comandante C40/).length).toBeGreaterThan(0);
  });

  it('selects a brewing method and shows its chip', async () => {
    const user = userEvent.setup();
    const { updateFormData } = setup();
    await user.click(screen.getByLabelText('Brewing Method'));
    await user.click(within(screen.getByRole('listbox')).getByText('French Press'));
    expect(updateFormData).toHaveBeenCalledWith({ brewingMethod: 'FrenchPress' });
  });

  it('shows the method in the summary when chosen', () => {
    setup({}, { brewingMethod: 'Espresso' });
    expect(screen.getByText(/Method:/)).toBeInTheDocument();
  });

  it('offers exactly the canonical brewing-method options from recipe.ts', async () => {
    // Single source of truth: the selector must render one option per entry in
    // the canonical BREWING_METHODS list (no second hand-maintained list).
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByLabelText('Brewing Method'));
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options).toHaveLength(BREWING_METHODS.length);
    for (const method of BREWING_METHODS) {
      expect(within(screen.getByRole('listbox')).getByText(method.label)).toBeInTheDocument();
    }
  });
});
