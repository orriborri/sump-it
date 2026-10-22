import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { GrinderManager, type GrindersClient } from './GrinderManager';
import type { ApiResponse } from '@/lib/trpc/client';
import type { Grinder } from '@/lib/api/types';

function makeGrinder(overrides: Partial<Grinder> = {}): Grinder {
  return {
    id: 'g1',
    brand: 'Comandante',
    model: 'C40',
    grinderType: 'BurrConical',
    minSetting: 0,
    maxSetting: 40,
    scaleType: 'step',
    description: 'Hand grinder',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/** A fully-typed fake client whose responses are scripted per test. */
function makeClient(overrides: Partial<GrindersClient> = {}): GrindersClient {
  return {
    list: vi.fn(async (): Promise<ApiResponse<{ items: Grinder[] }>> => ({
      data: { items: [] },
    })),
    create: vi.fn(async (): Promise<ApiResponse<Grinder>> => ({ data: makeGrinder() })),
    update: vi.fn(async (): Promise<ApiResponse<Grinder>> => ({ data: makeGrinder() })),
    delete: vi.fn(async (): Promise<ApiResponse<void>> => ({ data: undefined })),
    ...overrides,
  };
}

async function fillField(label: string, value: string) {
  const input = screen.getByLabelText(label);
  await userEvent.clear(input);
  await userEvent.type(input, value);
}

describe('GrinderManager', () => {
  it('shows a loading spinner then an empty state', async () => {
    const client = makeClient();
    render(<GrinderManager client={client} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByText(/No grinders yet/i)).toBeInTheDocument();
  });

  it('surfaces a list load error', async () => {
    const client = makeClient({
      list: vi.fn(async () => ({ error: 'boom' })),
    });
    render(<GrinderManager client={client} />);

    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  it('treats a success response with no data as an empty list', async () => {
    // Covers the `response.data?.items ?? []` fallback when the body is absent.
    const client = makeClient({
      list: vi.fn(async () => ({ data: undefined })),
    });
    render(<GrinderManager client={client} />);

    expect(await screen.findByText(/No grinders yet/i)).toBeInTheDocument();
  });

  it('edits a grinder with null optional fields', async () => {
    // Covers the `scaleType ?? ''` / `description ?? ''` fallbacks.
    const client = makeClient({
      list: vi.fn(async () => ({
        data: { items: [makeGrinder({ scaleType: null, description: null })] },
      })),
    });
    render(<GrinderManager client={client} />);
    await screen.findByText('Comandante C40');

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Scale Type')).toHaveValue('');
    expect(screen.getByLabelText('Description')).toHaveValue('');
  });

  it('renders existing grinders', async () => {
    const client = makeClient({
      list: vi.fn(async () => ({ data: { items: [makeGrinder()] } })),
    });
    render(<GrinderManager client={client} />);

    expect(await screen.findByText('Comandante C40')).toBeInTheDocument();
    expect(screen.getByText('Settings: 0-40')).toBeInTheDocument();
  });

  it('blocks submission with a client-side validation error (max <= min)', async () => {
    const client = makeClient();
    render(<GrinderManager client={client} />);
    await screen.findByText(/No grinders yet/i);

    await fillField('Brand', 'Comandante');
    await fillField('Model', 'C40');
    await fillField('Minimum Setting', '40');
    await fillField('Maximum Setting', '40');
    await userEvent.click(screen.getByRole('button', { name: 'Add Grinder' }));

    expect(
      await screen.findByText(
        'Maximum setting (40) must be greater than minimum setting (40)'
      )
    ).toBeInTheDocument();
    expect(client.create).not.toHaveBeenCalled();
  });

  it('creates a grinder and reloads the list', async () => {
    const list = vi
      .fn<() => Promise<ApiResponse<{ items: Grinder[] }>>>()
      .mockResolvedValueOnce({ data: { items: [] } })
      .mockResolvedValueOnce({ data: { items: [makeGrinder()] } });
    const client = makeClient({ list });

    render(<GrinderManager client={client} />);
    await screen.findByText(/No grinders yet/i);

    await fillField('Brand', 'Comandante');
    await fillField('Model', 'C40');
    await userEvent.click(screen.getByRole('button', { name: 'Add Grinder' }));

    await waitFor(() => expect(client.create).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Comandante C40')).toBeInTheDocument();
    expect(client.create).toHaveBeenCalledWith(
      expect.objectContaining({ brand: 'Comandante', model: 'C40' })
    );
  });

  it('submits the optional scale-type and description fields', async () => {
    const client = makeClient();
    render(<GrinderManager client={client} />);
    await screen.findByText(/No grinders yet/i);

    await fillField('Brand', 'Comandante');
    await fillField('Model', 'C40');
    await fillField('Scale Type', 'step');
    await fillField('Description', 'Hand grinder');
    await userEvent.click(screen.getByRole('button', { name: 'Add Grinder' }));

    await waitFor(() =>
      expect(client.create).toHaveBeenCalledWith(
        expect.objectContaining({ scaleType: 'step', description: 'Hand grinder' })
      )
    );
  });

  it('surfaces an API error returned on create', async () => {
    const client = makeClient({
      create: vi.fn(async () => ({ error: 'max must exceed min' })),
    });
    render(<GrinderManager client={client} />);
    await screen.findByText(/No grinders yet/i);

    await fillField('Brand', 'Comandante');
    await fillField('Model', 'C40');
    await userEvent.click(screen.getByRole('button', { name: 'Add Grinder' }));

    expect(await screen.findByText('max must exceed min')).toBeInTheDocument();
  });

  it('edits an existing grinder then cancels back to add mode', async () => {
    const client = makeClient({
      list: vi.fn(async () => ({ data: { items: [makeGrinder()] } })),
    });
    render(<GrinderManager client={client} />);
    await screen.findByText('Comandante C40');

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('heading', { name: 'Edit Grinder' })).toBeInTheDocument();
    expect(screen.getByLabelText('Brand')).toHaveValue('Comandante');

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Add Grinder' })).toBeInTheDocument();
    expect(screen.getByLabelText('Brand')).toHaveValue('');
  });

  it('saves edits through update', async () => {
    const list = vi
      .fn<() => Promise<ApiResponse<{ items: Grinder[] }>>>()
      .mockResolvedValueOnce({ data: { items: [makeGrinder()] } })
      .mockResolvedValueOnce({
        data: { items: [makeGrinder({ model: 'C40 MK4' })] },
      });
    const client = makeClient({ list });

    render(<GrinderManager client={client} />);
    await screen.findByText('Comandante C40');

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await fillField('Model', 'C40 MK4');
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(client.update).toHaveBeenCalledWith(
        'g1',
        expect.objectContaining({ model: 'C40 MK4' })
      )
    );
    expect(await screen.findByText('Comandante C40 MK4')).toBeInTheDocument();
  });

  it('surfaces an API error returned on update', async () => {
    const client = makeClient({
      list: vi.fn(async () => ({ data: { items: [makeGrinder()] } })),
      update: vi.fn(async () => ({ error: 'update failed' })),
    });
    render(<GrinderManager client={client} />);
    await screen.findByText('Comandante C40');

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('update failed')).toBeInTheDocument();
  });

  it('removes a grinder and reloads', async () => {
    const list = vi
      .fn<() => Promise<ApiResponse<{ items: Grinder[] }>>>()
      .mockResolvedValueOnce({ data: { items: [makeGrinder()] } })
      .mockResolvedValueOnce({ data: { items: [] } });
    const client = makeClient({ list });

    render(<GrinderManager client={client} />);
    await screen.findByText('Comandante C40');

    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(client.delete).toHaveBeenCalledWith('g1'));
    expect(await screen.findByText(/No grinders yet/i)).toBeInTheDocument();
  });

  it('surfaces an API error returned on delete', async () => {
    const client = makeClient({
      list: vi.fn(async () => ({ data: { items: [makeGrinder()] } })),
      delete: vi.fn(async () => ({ error: 'delete failed' })),
    });
    render(<GrinderManager client={client} />);
    await screen.findByText('Comandante C40');

    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(await screen.findByText('delete failed')).toBeInTheDocument();
  });

  it('changes the grinder type via the select', async () => {
    const client = makeClient();
    render(<GrinderManager client={client} />);
    await screen.findByText(/No grinders yet/i);

    await userEvent.click(screen.getByRole('combobox', { name: 'Grinder Type' }));
    const listbox = await screen.findByRole('listbox');
    await userEvent.click(within(listbox).getByText('Manual'));

    await fillField('Brand', 'Timemore');
    await fillField('Model', 'C3');
    await userEvent.click(screen.getByRole('button', { name: 'Add Grinder' }));

    await waitFor(() =>
      expect(client.create).toHaveBeenCalledWith(
        expect.objectContaining({ grinderType: 'Manual' })
      )
    );
  });

  it('defaults to the real client when none is injected', () => {
    // Exercises the default-parameter branch. The real client will attempt a
    // fetch that rejects in jsdom; we only assert the component mounts with the
    // loading state, then suppress the unhandled rejection noise.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<GrinderManager />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    spy.mockRestore();
  });
});
