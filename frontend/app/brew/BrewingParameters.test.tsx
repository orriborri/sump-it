import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BrewingParameters } from './BrewingParameters';
import { emptyBrewForm, type BrewFormData } from '@/lib/brew/recipe';
import type { Grinder } from '@/lib/api/types';

function grinder(overrides: Partial<Grinder> = {}): Grinder {
  return {
    id: 'grinder-1',
    brand: 'Comandante',
    model: 'C40',
    grinderType: 'BurrConical',
    minSetting: 5,
    maxSetting: 30,
    scaleType: 'step',
    description: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function setup(overrides: Partial<BrewFormData> = {}, props: Partial<Parameters<typeof BrewingParameters>[0]> = {}) {
  const updateFormData = vi.fn();
  const formData = { ...emptyBrewForm(), ...overrides };
  render(
    <BrewingParameters
      formData={formData}
      updateFormData={updateFormData}
      previousSessions={[]}
      isLoading={false}
      {...props}
    />
  );
  return { updateFormData };
}

describe('BrewingParameters', () => {
  it('shows the live coffee ratio from the current amounts', () => {
    setup({ coffeeGrams: 20, waterGrams: 320 });
    expect(screen.getByLabelText('coffee-ratio')).toHaveTextContent('1:16.0');
  });

  it('maps a cleared coffee input to zero', async () => {
    const user = userEvent.setup();
    const { updateFormData } = setup({ coffeeGrams: 20 });
    await user.clear(screen.getByLabelText('Coffee'));
    // Clearing sends an empty string which maps to 0.
    expect(updateFormData).toHaveBeenLastCalledWith({ coffeeGrams: 0 });
  });

  it('updates coffee grams from a typed value', async () => {
    const user = userEvent.setup();
    const { updateFormData } = setup({ coffeeGrams: 0 });
    await user.type(screen.getByLabelText('Coffee'), '8');
    expect(updateFormData).toHaveBeenLastCalledWith({ coffeeGrams: 8 });
  });

  it('updates water grams from a typed value', async () => {
    const user = userEvent.setup();
    const { updateFormData } = setup({ waterGrams: 0 });
    await user.type(screen.getByLabelText('Water'), '5');
    expect(updateFormData).toHaveBeenLastCalledWith({ waterGrams: 5 });
  });

  it('clamps the grind setting to the selected grinder range', async () => {
    const user = userEvent.setup();
    // A grinder whose max is 5; typing a single digit 9 exceeds it and clamps.
    const { updateFormData } = setup(
      { grindSetting: 0 },
      { selectedGrinder: grinder({ minSetting: 0, maxSetting: 5 }) }
    );
    await user.type(screen.getByLabelText('Grind setting'), '9');
    // 9 is above max 5, so it clamps to 5.
    expect(updateFormData).toHaveBeenLastCalledWith({ grindSetting: 5 });
    expect(screen.getByText('Range for Comandante C40: 0-5')).toBeInTheDocument();
  });

  it('leaves the grind setting unbounded when no grinder is selected', async () => {
    const user = userEvent.setup();
    const { updateFormData } = setup({ grindSetting: 0 });
    await user.type(screen.getByLabelText('Grind setting'), '7');
    expect(updateFormData).toHaveBeenLastCalledWith({ grindSetting: 7 });
    expect(screen.getByText('Select a grinder to bound this setting')).toBeInTheDocument();
  });

  it('clears the optional temperature to undefined when blanked', async () => {
    const user = userEvent.setup();
    const { updateFormData } = setup({ waterTempCelsius: 93 });
    await user.clear(screen.getByLabelText('Water temperature'));
    expect(updateFormData).toHaveBeenLastCalledWith({ waterTempCelsius: undefined });
  });

  it('captures a typed temperature value', async () => {
    const user = userEvent.setup();
    // Start empty so a single keystroke yields exactly that number.
    const { updateFormData } = setup({ waterTempCelsius: undefined });
    await user.type(screen.getByLabelText('Water temperature'), '9');
    expect(updateFormData).toHaveBeenLastCalledWith({ waterTempCelsius: 9 });
  });

  it('clears the optional brew time to undefined when blanked', async () => {
    const user = userEvent.setup();
    const { updateFormData } = setup({ brewTimeSeconds: 180 });
    await user.clear(screen.getByLabelText('Brew time'));
    expect(updateFormData).toHaveBeenLastCalledWith({ brewTimeSeconds: undefined });
  });

  it('captures a typed brew time value', async () => {
    const user = userEvent.setup();
    const { updateFormData } = setup({ brewTimeSeconds: undefined });
    await user.type(screen.getByLabelText('Brew time'), '3');
    expect(updateFormData).toHaveBeenLastCalledWith({ brewTimeSeconds: 3 });
  });

  it('shows a loading note while previous sessions load', () => {
    setup({}, { isLoading: true });
    expect(screen.getByText('Loading previous sessions…')).toBeInTheDocument();
  });

  it('shows how many previous sessions are available', () => {
    render(
      <BrewingParameters
        formData={emptyBrewForm()}
        updateFormData={vi.fn()}
        previousSessions={[{} as never, {} as never]}
        isLoading={false}
      />
    );
    expect(
      screen.getByText('2 previous session(s) available for reference.')
    ).toBeInTheDocument();
  });
});
