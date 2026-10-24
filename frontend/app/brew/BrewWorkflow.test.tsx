import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BrewWorkflow, type BrewClient } from './BrewWorkflow';
import { UNREACHABLE_MESSAGE } from '@/lib/brew/recipe';
import type { ApiResponse } from '@/lib/trpc/client';
import type { BrewingSession, CoffeeBean, Grinder, PaginatedResponse } from '@/lib/api/types';

function bean(overrides: Partial<CoffeeBean> = {}): CoffeeBean {
  return {
    id: 'bean-1',
    name: 'Ethiopia Yirgacheffe',
    origin: 'Ethiopia',
    roastDate: '2026-06-01',
    purchaseDate: '2026-06-02',
    remainingGrams: 250,
    variety: null,
    processingMethod: null,
    isActive: true,
    createdAt: '2026-06-02T00:00:00Z',
    updatedAt: '2026-06-02T00:00:00Z',
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
    scaleType: 'step',
    description: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const ok = <T,>(data: T): Promise<ApiResponse<T>> => Promise.resolve({ data });

function page<T>(items: T[]): PaginatedResponse<T> {
  return { items, total: items.length, page: 1, pageSize: 5, hasMore: false };
}

function makeClient(overrides: Partial<{
  getActive: BrewClient['beans']['getActive'];
  listGrinders: BrewClient['grinders']['list'];
  listSessions: BrewClient['sessions']['list'];
  create: BrewClient['sessions']['create'];
}> = {}): { client: BrewClient; create: ReturnType<typeof vi.fn> } {
  const create =
    overrides.create ??
    vi.fn((_data) => ok<BrewingSession>({} as BrewingSession));
  const client: BrewClient = {
    beans: { getActive: overrides.getActive ?? (() => ok<CoffeeBean[]>([bean()])) },
    grinders: { list: overrides.listGrinders ?? (() => ok(page([grinder()]))) },
    sessions: {
      list: overrides.listSessions ?? (() => ok(page<BrewingSession>([]))),
      create: create as BrewClient['sessions']['create'],
    },
  };
  return { client, create: create as ReturnType<typeof vi.fn> };
}

/** Completes the equipment step so the workflow can advance. */
async function chooseEquipment(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText('Coffee Bean'));
  await user.click(within(screen.getByRole('listbox')).getByText('Ethiopia Yirgacheffe'));
  await user.click(screen.getByLabelText('Grinder'));
  await user.click(within(screen.getByRole('listbox')).getByText('Comandante C40'));
  await user.click(screen.getByLabelText('Brewing Method'));
  await user.click(within(screen.getByRole('listbox')).getByText('Espresso'));
}

describe('BrewWorkflow', () => {
  it('loads data and renders the first step with a disabled Next', async () => {
    const { client } = makeClient();
    render(<BrewWorkflow client={client} />);
    await waitFor(() => expect(screen.getByLabelText('Coffee Bean')).toBeInTheDocument());
    // Equipment not yet chosen: Next is disabled and the hint shows.
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(
      screen.getByText('Please complete all required fields before proceeding.')
    ).toBeInTheDocument();
  });

  it('shows a friendly error when the initial load fails', async () => {
    const { client } = makeClient({
      getActive: () => Promise.resolve({ error: 'Failed to fetch' }),
    });
    render(<BrewWorkflow client={client} />);
    await waitFor(() => expect(screen.getByText(UNREACHABLE_MESSAGE)).toBeInTheDocument());
  });

  it('gates past equipment only once bean, grinder and method are chosen', async () => {
    const user = userEvent.setup();
    const { client } = makeClient();
    render(<BrewWorkflow client={client} />);
    await waitFor(() => screen.getByLabelText('Coffee Bean'));

    await chooseEquipment(user);
    const next = screen.getByRole('button', { name: 'Next' });
    await waitFor(() => expect(next).toBeEnabled());
    await user.click(next);

    // Now on the parameters step: the live ratio is visible.
    expect(await screen.findByLabelText('coffee-ratio')).toBeInTheDocument();
  });

  it('navigates back to the previous step', async () => {
    const user = userEvent.setup();
    const { client } = makeClient();
    render(<BrewWorkflow client={client} />);
    await waitFor(() => screen.getByLabelText('Coffee Bean'));
    await chooseEquipment(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByLabelText('coffee-ratio');

    await user.click(screen.getByRole('button', { name: 'Back' }));
    // Back on the equipment step.
    expect(await screen.findByLabelText('Coffee Bean')).toBeInTheDocument();
  });

  it('saves a brew and shows the success snackbar', async () => {
    const user = userEvent.setup();
    const { client, create } = makeClient();
    render(<BrewWorkflow client={client} />);
    await waitFor(() => screen.getByLabelText('Coffee Bean'));

    await chooseEquipment(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByLabelText('coffee-ratio');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.click(await screen.findByRole('button', { name: 'Save Brew Session' }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0].brewingMethod).toBe('Espresso');
    expect(await screen.findByText('Brewing session saved.')).toBeInTheDocument();
  });

  it('dismisses the success snackbar on clickaway', async () => {
    const user = userEvent.setup();
    const { client } = makeClient();
    render(<BrewWorkflow client={client} />);
    await waitFor(() => screen.getByLabelText('Coffee Bean'));

    await chooseEquipment(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByLabelText('coffee-ratio');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Save Brew Session' }));

    await screen.findByText('Brewing session saved.');
    // Clicking away from the Snackbar invokes its onClose, clearing the message.
    await user.click(document.body);
    await waitFor(() =>
      expect(screen.queryByText('Brewing session saved.')).not.toBeInTheDocument()
    );
  });

  it('shows the backend error when the save is rejected (insufficient quantity)', async () => {
    const user = userEvent.setup();
    const message = 'Insufficient bean quantity: 5g available, 18g required';
    const { client } = makeClient({ create: vi.fn(() => Promise.resolve({ error: message })) });
    render(<BrewWorkflow client={client} />);
    await waitFor(() => screen.getByLabelText('Coffee Bean'));

    await chooseEquipment(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByLabelText('coffee-ratio');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Save Brew Session' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('shows a friendly error when the save hits a network failure', async () => {
    const user = userEvent.setup();
    const { client } = makeClient({
      create: vi.fn(() => Promise.resolve({ error: 'Failed to fetch' })),
    });
    render(<BrewWorkflow client={client} />);
    await waitFor(() => screen.getByLabelText('Coffee Bean'));

    await chooseEquipment(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByLabelText('coffee-ratio');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Save Brew Session' }));

    expect(await screen.findByText(UNREACHABLE_MESSAGE)).toBeInTheDocument();
  });

  it('includes a chosen rating and notes in the saved request', async () => {
    const user = userEvent.setup();
    const { client, create } = makeClient();
    render(<BrewWorkflow client={client} />);
    await waitFor(() => screen.getByLabelText('Coffee Bean'));

    await chooseEquipment(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByLabelText('coffee-ratio');
    await user.click(screen.getByRole('button', { name: 'Next' }));

    // Pick a rating and type tasting notes on the feedback step.
    await user.click(await screen.findByLabelText('Rating'));
    await user.click(within(screen.getByRole('listbox')).getByText('7.5'));
    await user.type(screen.getByLabelText('Tasting notes'), 'Chocolatey');

    await user.click(screen.getByRole('button', { name: 'Save Brew Session' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0].rating).toBe(7.5);
    expect(create.mock.calls[0][0].tastingNotes).toBe('Chocolatey');
  });

  it('does not stay stuck loading when a client method rejects during load (#170)', async () => {
    // The client contract is to resolve `{ error }`, but a rejecting adapter
    // must not leave the equipment step spinning forever. The workflow should
    // recover: render the step and surface the friendly unreachable message.
    const { client } = makeClient({
      getActive: () => Promise.reject(new Error('adapter exploded')),
    });
    render(<BrewWorkflow client={client} />);

    await waitFor(() => expect(screen.getByText(UNREACHABLE_MESSAGE)).toBeInTheDocument());
    // Loading cleared: the equipment dropdown is present (not the spinner).
    expect(screen.getByLabelText('Coffee Bean')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('routes a rejecting create through friendly error handling on submit (#170)', async () => {
    const user = userEvent.setup();
    const { client } = makeClient({
      create: vi.fn(() => Promise.reject(new Error('Failed to fetch'))),
    });
    render(<BrewWorkflow client={client} />);
    await waitFor(() => screen.getByLabelText('Coffee Bean'));

    await chooseEquipment(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByLabelText('coffee-ratio');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Save Brew Session' }));

    // A rejection (not a resolved `{ error }`) still reaches toFriendlyError.
    expect(await screen.findByText(UNREACHABLE_MESSAGE)).toBeInTheDocument();
  });

  it('surfaces a non-network rejection message on submit (#170)', async () => {
    const user = userEvent.setup();
    const { client } = makeClient({
      create: vi.fn(() => Promise.reject(new Error('Insufficient bean quantity'))),
    });
    render(<BrewWorkflow client={client} />);
    await waitFor(() => screen.getByLabelText('Coffee Bean'));

    await chooseEquipment(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByLabelText('coffee-ratio');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Save Brew Session' }));

    // A non-network rejection passes through toFriendlyError unchanged.
    expect(await screen.findByText('Insufficient bean quantity')).toBeInTheDocument();
  });

  it('handles a non-Error rejection on submit', async () => {
    const user = userEvent.setup();
    const { client } = makeClient({
      // Intentional: pins the fallback for an unknown rejected value.
      // skipcq: JS-0114
      create: vi.fn(() => Promise.reject('unexpected rejection')),
    });
    render(<BrewWorkflow client={client} />);
    await waitFor(() => screen.getByLabelText('Coffee Bean'));

    await chooseEquipment(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByLabelText('coffee-ratio');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Save Brew Session' }));

    expect(await screen.findByText(UNREACHABLE_MESSAGE)).toBeInTheDocument();
  });

  it('defaults to the real client when none is injected', async () => {
    // No client prop: exercises the default parameter. Stub fetch so the real
    // client surfaces an error (proving the workflow mounted end to end).
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network disabled in test')))
    );
    render(<BrewWorkflow />);
    await waitFor(() => expect(screen.getByText(UNREACHABLE_MESSAGE)).toBeInTheDocument());
    vi.unstubAllGlobals();
  });
});
