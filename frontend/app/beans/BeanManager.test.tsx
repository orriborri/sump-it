import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BeanManager, type BeanClient } from './BeanManager';
import type {
  ApiResponse,
  ListParams,
} from '@/lib/trpc/client';
import type {
  BeanUsageRecord,
  CoffeeBean,
  CreateCoffeeBeanRequest,
} from '@/lib/api/types';

const NOW = () => new Date('2026-06-15T12:00:00Z');

function makeBean(overrides: Partial<CoffeeBean> = {}): CoffeeBean {
  return {
    id: 'bean-1',
    name: 'Ethiopia Yirgacheffe',
    origin: 'Ethiopia',
    roastDate: '2026-06-01',
    purchaseDate: '2026-06-02',
    remainingGrams: 250,
    variety: 'Heirloom',
    processingMethod: 'Washed',
    isActive: true,
    createdAt: '2026-06-02T00:00:00Z',
    updatedAt: '2026-06-02T00:00:00Z',
    ...overrides,
  };
}

/**
 * Builds a fake bean client. Each method defaults to a benign success but can
 * be overridden per test. Only the methods the component calls are implemented;
 * the unused `list`/`get` satisfy the structural `BeanClient` type.
 */
function makeClient(overrides: Partial<BeanClient> = {}): BeanClient {
  const ok = <T,>(data: T): Promise<ApiResponse<T>> => Promise.resolve({ data });
  const client: BeanClient = {
    list: (_params?: ListParams) =>
      ok({ items: [], total: 0, page: 1, pageSize: 50, hasMore: false }),
    get: (_id: string) => ok(makeBean()),
    create: (_data: CreateCoffeeBeanRequest) => ok(makeBean()),
    update: (_id: string, _data: CreateCoffeeBeanRequest) => ok(makeBean()),
    delete: (_id: string) => ok(undefined),
    getActive: () => ok<CoffeeBean[]>([]),
    getUsage: (_id: string) => ok<BeanUsageRecord[]>([]),
    ...overrides,
  };
  return client;
}

async function fillForm(user: ReturnType<typeof userEvent.setup>, overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    Name: 'Colombia',
    Origin: 'Colombia',
    'Roast date': '2026-06-10',
    'Purchase date': '2026-06-11',
    'Remaining grams': '500',
    Variety: 'Caturra',
    'Processing method': 'Natural',
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    const input = screen.getByLabelText(label);
    await user.clear(input);
    if (value !== '') {
      await user.type(input, value);
    }
  }
}

describe('BeanManager', () => {
  it('shows a spinner then an empty state when there are no beans', async () => {
    render(<BeanManager client={makeClient()} now={NOW} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('No active beans. Add your first bag.')).toBeInTheDocument()
    );
  });

  it('treats a success with no payload as an empty list', async () => {
    // getActive resolves successfully but without a `data` field.
    const client = makeClient({ getActive: () => Promise.resolve({}) });
    render(<BeanManager client={client} now={NOW} />);
    await waitFor(() =>
      expect(screen.getByText('No active beans. Add your first bag.')).toBeInTheDocument()
    );
  });

  it('treats usage success with no payload as empty history', async () => {
    const user = userEvent.setup();
    const client = makeClient({
      getActive: () => Promise.resolve({ data: [makeBean()] }),
      getUsage: () => Promise.resolve({}),
    });
    render(<BeanManager client={client} now={NOW} />);
    await waitFor(() => screen.getByText('Ethiopia Yirgacheffe'));

    await user.click(screen.getByRole('button', { name: 'History' }));
    expect(await screen.findByText('No brewing sessions yet.')).toBeInTheDocument();
  });

  it('surfaces a load error', async () => {
    const client = makeClient({ getActive: () => Promise.resolve({ error: 'boom' }) });
    render(<BeanManager client={client} now={NOW} />);
    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument());
  });

  it('uses the real clock by default when rendering a bean', async () => {
    // No `now` prop: exercises the default `() => new Date()` parameter, which
    // is invoked by the freshness chip once a bean is rendered.
    const client = makeClient({
      getActive: () => Promise.resolve({ data: [makeBean({ roastDate: '2020-01-01' })] }),
    });
    render(<BeanManager client={client} />);
    await waitFor(() => expect(screen.getByText('Ethiopia Yirgacheffe')).toBeInTheDocument());
    // A 2020 roast is well outside the freshness window under the real clock.
    expect(screen.getByText('Aged')).toBeInTheDocument();
  });

  it('lists beans with fresh and aged chips and remaining grams', async () => {
    const client = makeClient({
      getActive: () =>
        Promise.resolve({
          data: [
            makeBean({ id: 'fresh', name: 'Fresh Bean', roastDate: '2026-06-10' }),
            makeBean({
              id: 'aged',
              name: 'Aged Bean',
              roastDate: '2026-01-01',
              remainingGrams: null,
            }),
          ],
        }),
    });
    render(<BeanManager client={client} now={NOW} />);

    await waitFor(() => expect(screen.getByText('Fresh Bean')).toBeInTheDocument());
    expect(screen.getByText('Fresh')).toBeInTheDocument();
    expect(screen.getByText('Aged')).toBeInTheDocument();
    expect(screen.getByText(/250g remaining/)).toBeInTheDocument();
    expect(screen.getByText(/Not tracked/)).toBeInTheDocument();
  });

  it('adds a bean through the dialog', async () => {
    const user = userEvent.setup();
    const create = vi.fn((_data: CreateCoffeeBeanRequest) =>
      Promise.resolve({ data: makeBean() })
    );
    // First load empty, then after create one bean so loadBeans re-runs.
    const getActive = vi
      .fn<() => Promise<ApiResponse<CoffeeBean[]>>>()
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [makeBean({ name: 'Colombia' })] });
    const client = makeClient({ create, getActive });

    render(<BeanManager client={client} now={NOW} />);
    await waitFor(() =>
      expect(screen.getByText('No active beans. Add your first bag.')).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: 'Add Bean' }));
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0].name).toBe('Colombia');
    await waitFor(() => expect(screen.getByText('Colombia')).toBeInTheDocument());
  });

  it('shows a client-side validation error without calling create', async () => {
    const user = userEvent.setup();
    const create = vi.fn();
    const client = makeClient({ create });
    render(<BeanManager client={client} now={NOW} />);
    await waitFor(() => screen.getByText('No active beans. Add your first bag.'));

    await user.click(screen.getByRole('button', { name: 'Add Bean' }));
    // Leave the required name empty.
    await fillForm(user, { Name: '' });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('surfaces a server error returned by create', async () => {
    const user = userEvent.setup();
    const client = makeClient({
      create: () => Promise.resolve({ error: 'Roast date cannot be in the future' }),
    });
    render(<BeanManager client={client} now={NOW} />);
    await waitFor(() => screen.getByText('No active beans. Add your first bag.'));

    await user.click(screen.getByRole('button', { name: 'Add Bean' }));
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Roast date cannot be in the future')
    ).toBeInTheDocument();
  });

  it('edits an existing bean', async () => {
    const user = userEvent.setup();
    const update = vi.fn((_id: string, _data: CreateCoffeeBeanRequest) =>
      Promise.resolve({ data: makeBean() })
    );
    const client = makeClient({
      getActive: () => Promise.resolve({ data: [makeBean()] }),
      update,
    });
    render(<BeanManager client={client} now={NOW} />);
    await waitFor(() => screen.getByText('Ethiopia Yirgacheffe'));

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    // The form is prefilled; change the name.
    const name = screen.getByLabelText('Name');
    await user.clear(name);
    await user.type(name, 'Ethiopia Guji');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][0]).toBe('bean-1');
    expect(update.mock.calls[0][1].name).toBe('Ethiopia Guji');
  });

  it('closes the editor with Cancel', async () => {
    const user = userEvent.setup();
    const client = makeClient({ getActive: () => Promise.resolve({ data: [makeBean()] }) });
    render(<BeanManager client={client} now={NOW} />);
    await waitFor(() => screen.getByText('Ethiopia Yirgacheffe'));

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByText('Edit Bean')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Edit Bean')).not.toBeInTheDocument());
  });

  it('soft-deletes a bean', async () => {
    const user = userEvent.setup();
    const del = vi.fn((_id: string) => Promise.resolve({ data: undefined }));
    const getActive = vi
      .fn<() => Promise<ApiResponse<CoffeeBean[]>>>()
      .mockResolvedValueOnce({ data: [makeBean()] })
      .mockResolvedValueOnce({ data: [] });
    const client = makeClient({ getActive, delete: del });
    render(<BeanManager client={client} now={NOW} />);
    await waitFor(() => screen.getByText('Ethiopia Yirgacheffe'));

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(del).toHaveBeenCalledWith('bean-1'));
    await waitFor(() =>
      expect(screen.getByText('No active beans. Add your first bag.')).toBeInTheDocument()
    );
  });

  it('surfaces a delete error', async () => {
    const user = userEvent.setup();
    const client = makeClient({
      getActive: () => Promise.resolve({ data: [makeBean()] }),
      delete: () => Promise.resolve({ error: 'delete failed' }),
    });
    render(<BeanManager client={client} now={NOW} />);
    await waitFor(() => screen.getByText('Ethiopia Yirgacheffe'));

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.getByText('delete failed')).toBeInTheDocument());
  });

  it('shows usage history with records', async () => {
    const user = userEvent.setup();
    const record: BeanUsageRecord = {
      sessionId: 'sess-1',
      brewDate: '2026-06-10T09:15:00Z',
      gramsUsed: 18,
      rating: 8,
      grinderUsed: 'Comandante C40',
      brewingMethod: 'V60',
      tastingNotes: 'Floral',
    };
    const client = makeClient({
      getActive: () => Promise.resolve({ data: [makeBean()] }),
      getUsage: () => Promise.resolve({ data: [record] }),
    });
    render(<BeanManager client={client} now={NOW} />);
    await waitFor(() => screen.getByText('Ethiopia Yirgacheffe'));

    await user.click(screen.getByRole('button', { name: 'History' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/2026-06-10 • 18g • V60/)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Grinder: Comandante C40 • Rating: 8.0/)
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows an empty usage history', async () => {
    const user = userEvent.setup();
    const client = makeClient({
      getActive: () => Promise.resolve({ data: [makeBean()] }),
      getUsage: () => Promise.resolve({ data: [] }),
    });
    render(<BeanManager client={client} now={NOW} />);
    await waitFor(() => screen.getByText('Ethiopia Yirgacheffe'));

    await user.click(screen.getByRole('button', { name: 'History' }));
    expect(await screen.findByText('No brewing sessions yet.')).toBeInTheDocument();
  });

  it('surfaces a usage-history error', async () => {
    const user = userEvent.setup();
    const client = makeClient({
      getActive: () => Promise.resolve({ data: [makeBean()] }),
      getUsage: () => Promise.resolve({ error: 'usage failed' }),
    });
    render(<BeanManager client={client} now={NOW} />);
    await waitFor(() => screen.getByText('Ethiopia Yirgacheffe'));

    await user.click(screen.getByRole('button', { name: 'History' }));
    await waitFor(() => expect(screen.getByText('usage failed')).toBeInTheDocument());
  });
});
