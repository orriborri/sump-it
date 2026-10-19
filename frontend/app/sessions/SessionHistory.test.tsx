import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SessionHistory, type SessionHistoryClient } from './SessionHistory';
import type { ApiResponse, SessionListParams } from '@/lib/trpc/client';
import type { BrewingSession, PaginatedResponse } from '@/lib/api/types';
import { PAGE_SIZE } from '@/lib/sessions/history';

function makeSession(overrides: Partial<BrewingSession> = {}): BrewingSession {
  return {
    id: 'session-1',
    beanId: 'bean-1',
    grinderId: 'grinder-1',
    brewingMethod: 'V60',
    grindSetting: 20,
    waterTempCelsius: 93,
    brewTimeSeconds: 180,
    coffeeGrams: 20,
    waterGrams: 320,
    rating: 8,
    tastingNotes: 'bright and floral',
    feedback: null,
    suggestions: null,
    isTemplate: false,
    coffeeRatio: 16,
    createdAt: '2026-06-02T00:00:00Z',
    updatedAt: '2026-06-02T00:00:00Z',
    ...overrides,
  };
}

function page(
  items: BrewingSession[],
  total = items.length,
): PaginatedResponse<BrewingSession> {
  return { items, total, page: 1, pageSize: PAGE_SIZE, hasMore: false };
}

function makeClient(overrides: Partial<SessionHistoryClient> = {}): SessionHistoryClient {
  const ok = <T,>(data: T): Promise<ApiResponse<T>> => Promise.resolve({ data });
  return {
    list: (_params?: SessionListParams) => ok(page([makeSession()])),
    duplicate: (_id: string) => ok(makeSession({ id: 'session-dup' })),
    ...overrides,
  };
}

describe('SessionHistory', () => {
  it('renders the newest-first list returned by the client', async () => {
    const client = makeClient();
    render(<SessionHistory client={client} />);

    await waitFor(() => expect(screen.getByText('V60')).toBeInTheDocument());
    expect(screen.getByText('1:16.0')).toBeInTheDocument();
    expect(screen.getByText('8.0 / 10')).toBeInTheDocument();
    expect(screen.getByText('bright and floral')).toBeInTheDocument();
    expect(screen.getByText(`Showing 1-1 of 1`)).toBeInTheDocument();
  });

  it('shows a load error and no rows when the list fails', async () => {
    const client = makeClient({
      list: () => Promise.resolve({ error: 'boom' }),
    });
    render(<SessionHistory client={client} />);

    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument());
    expect(screen.getByText('No sessions match your filters yet.')).toBeInTheDocument();
  });

  it('shows the empty state when there are no sessions', async () => {
    const client = makeClient({ list: () => Promise.resolve({ data: page([]) }) });
    render(<SessionHistory client={client} />);

    await waitFor(() =>
      expect(screen.getByText('No sessions match your filters yet.')).toBeInTheDocument(),
    );
  });

  it('falls back to an empty list when the response carries no data', async () => {
    // A success response with no body (e.g. a 204) exercises the `?? []` /
    // `?? 0` nullish fallbacks.
    const client = makeClient({ list: () => Promise.resolve({ data: undefined }) });
    render(<SessionHistory client={client} />);

    await waitFor(() =>
      expect(screen.getByText('No sessions match your filters yet.')).toBeInTheDocument(),
    );
  });

  it('passes filter and search values to the client and resets to page 1', async () => {
    const user = userEvent.setup();
    const list = vi.fn((_params?: SessionListParams) =>
      Promise.resolve({ data: page([makeSession()]) }),
    );
    render(<SessionHistory client={makeClient({ list })} />);

    await waitFor(() => expect(screen.getByText('V60')).toBeInTheDocument());

    await user.type(screen.getByLabelText('Search'), 'berry');
    await user.type(screen.getByLabelText('Bean Origin'), 'Ethiopia');
    await user.type(screen.getByLabelText('Minimum Rating'), '7');

    await waitFor(() => {
      const last = list.mock.calls.at(-1)?.[0];
      expect(last).toMatchObject({
        q: 'berry',
        beanOrigin: 'Ethiopia',
        ratingMin: 7,
        offset: 0,
      });
    });
  });

  it('passes the roast date range to the client', async () => {
    const user = userEvent.setup();
    const list = vi.fn((_params?: SessionListParams) =>
      Promise.resolve({ data: page([makeSession()]) }),
    );
    render(<SessionHistory client={makeClient({ list })} />);
    await waitFor(() => expect(screen.getByText('V60')).toBeInTheDocument());

    await user.type(screen.getByLabelText('Roast Date From'), '2026-01-01');
    await user.type(screen.getByLabelText('Roast Date To'), '2026-02-01');

    await waitFor(() => {
      const last = list.mock.calls.at(-1)?.[0];
      expect(last).toMatchObject({
        roastDateFrom: '2026-01-01',
        roastDateTo: '2026-02-01',
      });
    });
  });

  it('selects grinder type and method from the dropdowns', async () => {
    const user = userEvent.setup();
    const list = vi.fn((_params?: SessionListParams) =>
      Promise.resolve({ data: page([makeSession()]) }),
    );
    render(<SessionHistory client={makeClient({ list })} />);
    await waitFor(() => expect(screen.getByText('V60')).toBeInTheDocument());

    await user.click(screen.getByLabelText('Grinder Type'));
    await user.click(await screen.findByRole('option', { name: 'Flat Burr' }));

    await user.click(screen.getByLabelText('Brewing Method'));
    await user.click(await screen.findByRole('option', { name: 'Espresso' }));

    await waitFor(() => {
      const last = list.mock.calls.at(-1)?.[0];
      expect(last).toMatchObject({ grinderType: 'BurrFlat', brewingMethod: 'Espresso' });
    });
  });

  it('clears filters back to the unconstrained query', async () => {
    const user = userEvent.setup();
    const list = vi.fn((_params?: SessionListParams) =>
      Promise.resolve({ data: page([makeSession()]) }),
    );
    render(<SessionHistory client={makeClient({ list })} />);
    await waitFor(() => expect(screen.getByText('V60')).toBeInTheDocument());

    await user.type(screen.getByLabelText('Search'), 'berry');
    await waitFor(() => expect(list.mock.calls.at(-1)?.[0]).toMatchObject({ q: 'berry' }));

    await user.click(screen.getByRole('button', { name: 'Clear Filters' }));
    await waitFor(() =>
      expect(list.mock.calls.at(-1)?.[0]).toEqual({ limit: PAGE_SIZE, offset: 0 }),
    );
  });

  it('duplicates a session and reloads with a success notice', async () => {
    const user = userEvent.setup();
    const duplicate = vi.fn((_id: string) =>
      Promise.resolve({ data: makeSession({ id: 'dup' }) }),
    );
    const list = vi.fn((_params?: SessionListParams) =>
      Promise.resolve({ data: page([makeSession()]) }),
    );
    render(<SessionHistory client={makeClient({ list, duplicate })} />);
    await waitFor(() => expect(screen.getByText('V60')).toBeInTheDocument());

    const callsBefore = list.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Duplicate' }));

    await waitFor(() => expect(duplicate).toHaveBeenCalledWith('session-1'));
    expect(
      await screen.findByText(/Session duplicated\. The recipe was re-brewed/),
    ).toBeInTheDocument();
    expect(list.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('closes the success notice when dismissed', async () => {
    const user = userEvent.setup();
    render(<SessionHistory client={makeClient()} />);
    await waitFor(() => expect(screen.getByText('V60')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Duplicate' }));
    const notice = await screen.findByText(/Session duplicated/);
    const alert = notice.closest('.MuiAlert-root') as HTMLElement;
    await user.click(within(alert).getByRole('button'));

    await waitFor(() =>
      expect(screen.queryByText(/Session duplicated/)).not.toBeInTheDocument(),
    );
  });

  it('surfaces a duplicate error and does not show the notice', async () => {
    const user = userEvent.setup();
    const duplicate = vi.fn((_id: string) =>
      Promise.resolve({ error: 'Insufficient bean quantity' }),
    );
    render(<SessionHistory client={makeClient({ duplicate })} />);
    await waitFor(() => expect(screen.getByText('V60')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Duplicate' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Insufficient bean quantity'),
    );
    expect(screen.queryByText(/Session duplicated/)).not.toBeInTheDocument();
  });

  it('pages forward and back, requesting the right offsets', async () => {
    const user = userEvent.setup();
    // Enough rows to have a second page.
    const total = PAGE_SIZE + 1;
    const list = vi.fn((params?: SessionListParams) => {
      const offset = params?.offset ?? 0;
      const rows = offset === 0 ? [makeSession()] : [makeSession({ id: 'next-page' })];
      return Promise.resolve({ data: page(rows, total) });
    });
    render(<SessionHistory client={makeClient({ list })} />);
    await waitFor(() => expect(screen.getByText('V60')).toBeInTheDocument());

    const prev = screen.getByRole('button', { name: 'Previous' });
    const next = screen.getByRole('button', { name: 'Next' });
    expect(prev).toBeDisabled();
    expect(next).toBeEnabled();

    await user.click(next);
    await waitFor(() => expect(list.mock.calls.at(-1)?.[0]?.offset).toBe(PAGE_SIZE));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled(),
    );

    await user.click(screen.getByRole('button', { name: 'Previous' }));
    await waitFor(() => expect(list.mock.calls.at(-1)?.[0]?.offset).toBe(0));
  });

  it('renders a session without tasting notes or rating', async () => {
    const client = makeClient({
      list: () =>
        Promise.resolve({
          data: page([makeSession({ tastingNotes: null, rating: null, coffeeRatio: null })]),
        }),
    });
    render(<SessionHistory client={client} />);

    await waitFor(() => expect(screen.getByText('V60')).toBeInTheDocument());
    expect(screen.getByText('Unrated')).toBeInTheDocument();
    // Falls back to computed ratio when coffeeRatio is null.
    expect(screen.getByText('1:16.0')).toBeInTheDocument();
    expect(screen.queryByText('bright and floral')).not.toBeInTheDocument();
  });
});
