import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BrewFeedback } from './BrewFeedback';
import { emptyBrewForm, type BrewFormData } from '@/lib/brew/recipe';

function setup(overrides: Partial<BrewFormData> = {}) {
  const updateFormData = vi.fn();
  const onSubmit = vi.fn();
  render(
    <BrewFeedback
      formData={{ ...emptyBrewForm(), ...overrides }}
      updateFormData={updateFormData}
      onSubmit={onSubmit}
    />
  );
  return { updateFormData, onSubmit };
}

describe('BrewFeedback', () => {
  it('offers ratings from 1.0 to 10.0 in 0.5 steps plus a no-rating option', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByLabelText('Rating'));
    const listbox = screen.getByRole('listbox');
    // 1.0..10.0 in 0.5 steps = 19 values, plus the "No rating" option = 20.
    expect(within(listbox).getAllByRole('option')).toHaveLength(20);
    expect(within(listbox).getByText('1.0')).toBeInTheDocument();
    expect(within(listbox).getByText('7.5')).toBeInTheDocument();
    expect(within(listbox).getByText('10.0')).toBeInTheDocument();
  });

  it('sets a numeric rating when a value is picked', async () => {
    const user = userEvent.setup();
    const { updateFormData } = setup();
    await user.click(screen.getByLabelText('Rating'));
    await user.click(within(screen.getByRole('listbox')).getByText('8.5'));
    expect(updateFormData).toHaveBeenCalledWith({ rating: 8.5 });
  });

  it('clears the rating when "No rating" is picked', async () => {
    const user = userEvent.setup();
    const { updateFormData } = setup({ rating: 8 });
    await user.click(screen.getByLabelText('Rating'));
    const listbox = screen.getByRole('listbox');
    await user.click(within(listbox).getByText('No rating'));
    expect(updateFormData).toHaveBeenCalledWith({ rating: undefined });
  });

  it('captures tasting notes, feedback and suggestions', async () => {
    const user = userEvent.setup();
    const { updateFormData } = setup();
    await user.type(screen.getByLabelText('Tasting notes'), 'A');
    expect(updateFormData).toHaveBeenLastCalledWith({ tastingNotes: 'A' });
    await user.type(screen.getByLabelText('Feedback'), 'B');
    expect(updateFormData).toHaveBeenLastCalledWith({ feedback: 'B' });
    await user.type(screen.getByLabelText('Suggestions'), 'C');
    expect(updateFormData).toHaveBeenLastCalledWith({ suggestions: 'C' });
  });
});
