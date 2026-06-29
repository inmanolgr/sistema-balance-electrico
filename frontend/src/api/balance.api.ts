import {
  BalanceQueryParams,
  BalanceResponse,
  SourcesResponse,
  LatestResponse,
  HealthStatus,
} from '../types/balance.types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';
const API = `${BASE_URL}/api/v1`;

async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
    });
  }

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch {
    throw new Error('No se puede conectar al servidor. Comprueba que el backend está activo.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `API error ${res.status}: ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export const balanceApi = {
  getBalance: (params: BalanceQueryParams): Promise<BalanceResponse> =>
    apiFetch<BalanceResponse>('/balance', {
      start_date: params.start_date,
      end_date: params.end_date,
      time_trunc: params.time_trunc,
      ...(params.source_type ? { source_type: params.source_type } : {}),
    }),

  getSources: (): Promise<SourcesResponse> =>
    apiFetch<SourcesResponse>('/balance/sources'),

  getLatest: (): Promise<LatestResponse> =>
    apiFetch<LatestResponse>('/balance/latest'),

  getHealth: (): Promise<HealthStatus> =>
    apiFetch<HealthStatus>('/health'),
};

// ── React Query key factories ─────────────────────────────────────

export const queryKeys = {
  // Params planos en el array — React Query detecta cambios correctamente
  balance: (params: BalanceQueryParams) =>
    ['balance', params.start_date, params.end_date, params.time_trunc] as const,
  sources: () => ['sources'] as const,
  latest: () => ['latest'] as const,
  health: () => ['health'] as const,
};


