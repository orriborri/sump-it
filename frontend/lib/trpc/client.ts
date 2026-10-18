// Thin, fully typed REST client for the Rust backend.
//
// The backend is a plain REST service (Axum), not a tRPC/Node server, so there
// is no router to infer types from. Instead the request/response types are
// generated from the Rust models by ts-rs (see `lib/generated/` and the
// backend `cargo test export_bindings`). This client wraps `fetch` and uses
// those generated types end to end, so there is no `any` in the contract.

import type {
  BeanUsageRecord,
  BrewFeedback,
  BrewingSession,
  CoffeeBean,
  CreateBrewingSessionRequest,
  CreateCoffeeBeanRequest,
  CreateGrinderRequest,
  ErrorResponse,
  Grinder,
  PaginatedResponse,
} from '../api/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/** Discriminated result wrapper returned by every client call. */
export type ApiResponse<T> = {
  data?: T;
  error?: string;
  details?: string[];
};

/** Query parameters accepted by the list endpoints. */
export interface ListParams {
  page?: number;
  limit?: number;
}

/** Extra filters accepted by the session list endpoint (ticket #146). */
export interface SessionListParams extends ListParams {
  offset?: number;
  beanOrigin?: string;
  roastDateFrom?: string;
  roastDateTo?: string;
  grinderType?: string;
  brewingMethod?: string;
  ratingMin?: number;
  /** Free-text search across bean name, origin, grinder brand, tasting notes. */
  q?: string;
}

/** Body accepted when writing brew feedback for a session. */
export type BrewFeedbackInput = Omit<
  BrewFeedback,
  'id' | 'sessionId' | 'createdAt' | 'updatedAt'
>;

function buildQuery(params?: Record<string, string | number | undefined>): string {
  if (!params) {
    return '';
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

/**
 * Perform a typed request against the backend. The caller declares the success
 * payload type `T`; errors are surfaced through the `error`/`details` fields
 * (shaped like the generated `ErrorResponse`) rather than thrown.
 */
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as Partial<ErrorResponse>;
      return {
        error: errorData.error ?? `HTTP ${response.status}: ${response.statusText}`,
        details: errorData.details ?? undefined,
      };
    }

    // 204 No Content (e.g. DELETE) has no body to parse.
    if (response.status === 204) {
      return { data: undefined };
    }

    const data = (await response.json()) as T;
    return { data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/** Typed client grouped by resource. Mirrors the backend REST routes. */
export const coffeeBrewerClient = {
  beans: {
    list: (params?: ListParams) =>
      apiFetch<PaginatedResponse<CoffeeBean>>(
        `/beans${buildQuery({ page: params?.page, limit: params?.limit })}`
      ),

    get: (id: string) => apiFetch<CoffeeBean>(`/beans/${id}`),

    create: (data: CreateCoffeeBeanRequest) =>
      apiFetch<CoffeeBean>('/beans', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: CreateCoffeeBeanRequest) =>
      apiFetch<CoffeeBean>(`/beans/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiFetch<void>(`/beans/${id}`, {
        method: 'DELETE',
      }),

    getActive: () => apiFetch<CoffeeBean[]>('/beans/active'),

    getUsage: (id: string) => apiFetch<BeanUsageRecord[]>(`/beans/${id}/usage`),
  },

  grinders: {
    list: (params?: ListParams) =>
      apiFetch<PaginatedResponse<Grinder>>(
        `/grinders${buildQuery({ page: params?.page, limit: params?.limit })}`
      ),

    get: (id: string) => apiFetch<Grinder>(`/grinders/${id}`),

    create: (data: CreateGrinderRequest) =>
      apiFetch<Grinder>('/grinders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: CreateGrinderRequest) =>
      apiFetch<Grinder>(`/grinders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiFetch<void>(`/grinders/${id}`, {
        method: 'DELETE',
      }),
  },

  sessions: {
    list: (params?: SessionListParams) =>
      apiFetch<PaginatedResponse<BrewingSession>>(
        `/sessions${buildQuery({
          page: params?.page,
          limit: params?.limit,
          offset: params?.offset,
          beanOrigin: params?.beanOrigin,
          roastDateFrom: params?.roastDateFrom,
          roastDateTo: params?.roastDateTo,
          grinderType: params?.grinderType,
          brewingMethod: params?.brewingMethod,
          ratingMin: params?.ratingMin,
          q: params?.q,
        })}`
      ),

    get: (id: string) => apiFetch<BrewingSession>(`/sessions/${id}`),

    create: (data: CreateBrewingSessionRequest) =>
      apiFetch<BrewingSession>('/sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: CreateBrewingSessionRequest) =>
      apiFetch<BrewingSession>(`/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiFetch<void>(`/sessions/${id}`, {
        method: 'DELETE',
      }),

    duplicate: (id: string) =>
      apiFetch<BrewingSession>(`/sessions/${id}/duplicate`, {
        method: 'POST',
      }),
  },

  feedback: {
    get: (sessionId: string) => apiFetch<BrewFeedback>(`/feedback/${sessionId}`),

    create: (sessionId: string, data: BrewFeedbackInput) =>
      apiFetch<BrewFeedback>(`/feedback/${sessionId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (sessionId: string, data: BrewFeedbackInput) =>
      apiFetch<BrewFeedback>(`/feedback/${sessionId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
};
