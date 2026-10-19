import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import BrewPage from './page';
import { UNREACHABLE_MESSAGE } from '@/lib/brew/recipe';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('BrewPage', () => {
  it('mounts the brew workflow with its default (real) client', async () => {
    // The default client hits the network; stub fetch so the default-prop
    // branch runs without a real backend. A rejected fetch surfaces the
    // friendly unreachable message, proving the page mounted the workflow.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network disabled in test')))
    );

    render(<BrewPage />);

    expect(
      screen.getByRole('heading', { name: 'Coffee Brewing Tracker' })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(UNREACHABLE_MESSAGE)).toBeInTheDocument()
    );
  });
});
