// tRPC client setup for type-safe API calls
// This creates a tRPC client that communicates with our Rust backend
// The Rust backend exposes REST endpoints that we can call directly

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from './router';

export const trpc = createTRPCReact<AppRouter>();

// We'll create a custom client since our backend is Rust, not a tRPC Node.js server
// This is a wrapper around fetch calls with type safety

import superjson from 'superjson';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export type ApiResponse<T> = {
  data?: T;
  error?: string;
  details?: string[];
};

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
      const errorData = await response.json().catch(() => ({}));
      return {
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        details: errorData.details,
      };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Custom tRPC-like client for our Rust backend
export const coffeeBrewerClient = {
  beans: {
    list: (params?: { page?: number; limit?: number }) =>
      apiFetch<{
        items: any[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
      }>(`/beans?${new URLSearchParams(params as any)}`),
    
    get: (id: string) => apiFetch<any>(`/beans/${id}`),
    
    create: (data: any) =>
      apiFetch<any>('/beans', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: string, data: any) =>
      apiFetch<any>(`/beans/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id: string) =>
      apiFetch<void>(`/beans/${id}`, {
        method: 'DELETE',
      }),
    
    getActive: () => apiFetch<any[]>('/beans/active'),
    
    getUsage: (id: string) => apiFetch<any[]>(`/beans/${id}/usage`),
  },
  
  grinders: {
    list: (params?: { page?: number; limit?: number }) =>
      apiFetch<{
        items: any[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
      }>(`/grinders?${new URLSearchParams(params as any)}`),
    
    get: (id: string) => apiFetch<any>(`/grinders/${id}`),
    
    create: (data: any) =>
      apiFetch<any>('/grinders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: string, data: any) =>
      apiFetch<any>(`/grinders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id: string) =>
      apiFetch<void>(`/grinders/${id}`, {
        method: 'DELETE',
      }),
  },
  
  sessions: {
    list: (params?: { 
      page?: number; 
      limit?: number;
      beanOrigin?: string;
      ratingMin?: number;
      brewingMethod?: string;
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.beanOrigin) queryParams.set('beanOrigin', params.beanOrigin);
      if (params?.ratingMin) queryParams.set('ratingMin', params.ratingMin.toString());
      if (params?.brewingMethod) queryParams.set('brewingMethod', params.brewingMethod);
      
      return apiFetch<{
        items: any[];
        total: number;
        page: number;
        pageSize: number;
        hasMore: boolean;
      }>(`/sessions?${queryParams}`);
    },
    
    get: (id: string) => apiFetch<any>(`/sessions/${id}`),
    
    create: (data: any) =>
      apiFetch<any>('/sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: string, data: any) =>
      apiFetch<any>(`/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id: string) =>
      apiFetch<void>(`/sessions/${id}`, {
        method: 'DELETE',
      }),
    
    duplicate: (id: string) =>
      apiFetch<any>(`/sessions/${id}/duplicate`, {
        method: 'POST',
      }),
    
    search: (query: string) =>
      apiFetch<any[]>(`/sessions/search?q=${encodeURIComponent(query)}`),
  },
  
  feedback: {
    get: (sessionId: string) => apiFetch<any>(`/feedback/${sessionId}`),
    
    create: (sessionId: string, data: any) =>
      apiFetch<any>(`/feedback/${sessionId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (sessionId: string, data: any) =>
      apiFetch<any>(`/feedback/${sessionId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
};