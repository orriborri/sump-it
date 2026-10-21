import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import GrindersPage from './page';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GrindersPage', () => {
  it('renders the grinder manager with its default (real) client', async () => {
    // The default client hits the network; stub fetch so the default-prop
    // branches run without a real backend. A rejected fetch makes the client
    // surface an error, which proves the page mounted the manager end to end.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network disabled in test')))
    );

    render(<GrindersPage />);

    // The "Add Grinder" form heading renders immediately, proving the page
    // mounted the manager; the rejected list fetch then surfaces the error.
    expect(
      screen.getByRole('heading', { name: 'Add Grinder' })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('network disabled in test')).toBeInTheDocument()
    );

    vi.unstubAllGlobals();
  });
});
