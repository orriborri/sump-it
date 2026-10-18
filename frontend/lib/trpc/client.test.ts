// Tests for the thin typed REST client (`lib/trpc/client.ts`).
//
// The client is the one piece of frontend code the spec-#138 review flagged for
// drift, so it is on the coverage gate (see `vitest.config.ts` `include`). These
// tests mock `global.fetch` and assert on the exact URL, method, headers and
// body each resource method sends, plus the three response shapes `apiFetch`
// distinguishes: a JSON success body, an error body (status not ok), a 204
// no-content, and a thrown network error. Every client method and every
// `buildQuery` branch is exercised so the module stays at 100% coverage.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiFetch,
  coffeeBrewerClient,
  type ApiResponse,
} from './client';

const BASE = 'http://localhost:3001/api';

/** Builds a `Response`-like stub for `global.fetch`. */
function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number; statusText?: string }) {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    statusText: init?.statusText ?? 'OK',
    json: async () => body,
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('apiFetch', () => {
  it('returns the parsed body on a 2xx JSON response', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'abc' }));

    const result: ApiResponse<{ id: string }> = await apiFetch('/beans/abc');

    expect(result).toEqual({ data: { id: 'abc' } });
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/beans/abc`,
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
  });

  it('merges caller-supplied headers over the default Content-Type', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch('/beans', { headers: { 'X-Test': '1' } });

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/beans`,
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json', 'X-Test': '1' },
      })
    );
  });

  it('surfaces the error/details from an error response body', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { error: 'Insufficient', details: ['available: 5g'] },
        { ok: false, status: 409, statusText: 'Conflict' }
      )
    );

    const result = await apiFetch('/sessions');

    expect(result).toEqual({ error: 'Insufficient', details: ['available: 5g'] });
  });

  it('falls back to an HTTP status message when the error body has no fields', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({}, { ok: false, status: 500, statusText: 'Server Error' })
    );

    const result = await apiFetch('/sessions');

    expect(result).toEqual({ error: 'HTTP 500: Server Error', details: undefined });
  });

  it('falls back to an HTTP status message when the error body is not JSON', async () => {
    // `.json()` rejects -> the `.catch(() => ({}))` yields an empty object.
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => {
        throw new Error('not json');
      },
    } as unknown as Response);

    const result = await apiFetch('/beans/missing');

    expect(result).toEqual({ error: 'HTTP 404: Not Found', details: undefined });
  });

  it('returns undefined data for a 204 No Content response', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(null, { ok: true, status: 204, statusText: 'No Content' })
    );

    const result = await apiFetch<void>('/beans/abc', { method: 'DELETE' });

    expect(result).toEqual({ data: undefined });
  });

  it('maps a thrown Error to the error field', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    const result = await apiFetch('/beans');

    expect(result).toEqual({ error: 'network down' });
  });

  it('maps a thrown non-Error to a generic message', async () => {
    fetchMock.mockRejectedValueOnce('boom');

    const result = await apiFetch('/beans');

    expect(result).toEqual({ error: 'Unknown error occurred' });
  });
});

describe('coffeeBrewerClient.beans', () => {
  beforeEach(() => fetchMock.mockResolvedValue(jsonResponse({})));

  it('list with no params sends no query string', async () => {
    await coffeeBrewerClient.beans.list();
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/beans`, expect.anything());
  });

  it('list with paging params sends a query string', async () => {
    await coffeeBrewerClient.beans.list({ page: 2, limit: 10 });
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/beans?page=2&limit=10`, expect.anything());
  });

  it('get targets the id', async () => {
    await coffeeBrewerClient.beans.get('b1');
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/beans/b1`, expect.anything());
  });

  it('create POSTs the body', async () => {
    const body = { name: 'X' } as never;
    await coffeeBrewerClient.beans.create(body);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/beans`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(body) })
    );
  });

  it('update PUTs the body to the id', async () => {
    const body = { name: 'Y' } as never;
    await coffeeBrewerClient.beans.update('b1', body);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/beans/b1`,
      expect.objectContaining({ method: 'PUT', body: JSON.stringify(body) })
    );
  });

  it('delete DELETEs the id', async () => {
    await coffeeBrewerClient.beans.delete('b1');
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/beans/b1`,
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('getActive targets /beans/active', async () => {
    await coffeeBrewerClient.beans.getActive();
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/beans/active`, expect.anything());
  });

  it('getUsage targets /beans/:id/usage', async () => {
    await coffeeBrewerClient.beans.getUsage('b1');
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/beans/b1/usage`, expect.anything());
  });
});

describe('coffeeBrewerClient.grinders', () => {
  beforeEach(() => fetchMock.mockResolvedValue(jsonResponse({})));

  it('list with no params', async () => {
    await coffeeBrewerClient.grinders.list();
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/grinders`, expect.anything());
  });

  it('list with params', async () => {
    await coffeeBrewerClient.grinders.list({ page: 1, limit: 5 });
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/grinders?page=1&limit=5`, expect.anything());
  });

  it('get', async () => {
    await coffeeBrewerClient.grinders.get('g1');
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/grinders/g1`, expect.anything());
  });

  it('create', async () => {
    const body = { brand: 'Z' } as never;
    await coffeeBrewerClient.grinders.create(body);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/grinders`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(body) })
    );
  });

  it('update', async () => {
    const body = { brand: 'Z2' } as never;
    await coffeeBrewerClient.grinders.update('g1', body);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/grinders/g1`,
      expect.objectContaining({ method: 'PUT', body: JSON.stringify(body) })
    );
  });

  it('delete', async () => {
    await coffeeBrewerClient.grinders.delete('g1');
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/grinders/g1`,
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});

describe('coffeeBrewerClient.sessions', () => {
  beforeEach(() => fetchMock.mockResolvedValue(jsonResponse({})));

  it('list with no params sends no query string', async () => {
    await coffeeBrewerClient.sessions.list();
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/sessions`, expect.anything());
  });

  it('list forwards every filter/search param', async () => {
    await coffeeBrewerClient.sessions.list({
      page: 1,
      limit: 20,
      offset: 40,
      beanOrigin: 'Ethiopia',
      roastDateFrom: '2026-01-01',
      roastDateTo: '2026-02-01',
      grinderType: 'BurrConical',
      brewingMethod: 'V60',
      ratingMin: 8,
      q: 'jasmine',
    });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('page=1');
    expect(url).toContain('limit=20');
    expect(url).toContain('offset=40');
    expect(url).toContain('beanOrigin=Ethiopia');
    expect(url).toContain('roastDateFrom=2026-01-01');
    expect(url).toContain('roastDateTo=2026-02-01');
    expect(url).toContain('grinderType=BurrConical');
    expect(url).toContain('brewingMethod=V60');
    expect(url).toContain('ratingMin=8');
    expect(url).toContain('q=jasmine');
  });

  it('create POSTs the body', async () => {
    const body = { beanId: 'b1' } as never;
    await coffeeBrewerClient.sessions.create(body);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/sessions`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(body) })
    );
  });

  it('duplicate POSTs to /sessions/:id/duplicate', async () => {
    await coffeeBrewerClient.sessions.duplicate('s1');
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/sessions/s1/duplicate`,
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('API base URL env branch', () => {
  it('uses NEXT_PUBLIC_API_URL when it is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test/api');
    vi.resetModules();
    const mod = await import('./client');
    const local = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal('fetch', local);

    await mod.apiFetch('/beans');

    expect(local).toHaveBeenCalledWith(
      'https://api.example.test/api/beans',
      expect.anything()
    );
    vi.unstubAllEnvs();
  });
});
