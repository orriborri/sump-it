import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import BeansPage from './page';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BeansPage', () => {
  it('renders the bean manager with its default (real) client', async () => {
    // The default client hits the network; stub fetch so the default-prop
    // branches run without a real backend. A rejected fetch makes the client
    // surface an error, which proves the page mounted the manager end to end.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network disabled in test')))
    );

    render(<BeansPage />);

    expect(
      screen.getByRole('heading', { name: 'Coffee Bean Inventory' })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('network disabled in test')).toBeInTheDocument()
    );

    vi.unstubAllGlobals();
  });
});
