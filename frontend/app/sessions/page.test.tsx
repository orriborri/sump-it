import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import SessionsPage from './page';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SessionsPage', () => {
  it('renders the session history with its default (real) client', async () => {
    // The default client hits the network; stub fetch so the default-prop
    // branches run without a real backend. A rejected fetch makes the client
    // surface an error, which proves the page mounted the history view end to
    // end.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network disabled in test'))),
    );

    render(<SessionsPage />);

    expect(
      screen.getByRole('heading', { name: 'Brewing Session History' }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('network disabled in test')).toBeInTheDocument(),
    );

    vi.unstubAllGlobals();
  });
});
