import { useQuery } from '@tanstack/react-query';
import { balanceApi, queryKeys } from '../api/balance.api';
import { BalanceQueryParams, BalanceEntry, ChartDataPoint, PieSlice } from '../types/balance.types';
import { format } from 'date-fns';

// Constantes de negocio — fuentes que son agregados y deben excluirse de totales
const GENERATION_GROUPS = ['Renovable', 'No-Renovable'];
const AGGREGATE_TYPES = ['Generación renovable', 'Generación no renovable'];

// ── Hooks ─────────────────────────────────────────────────────────

export function useBalanceData(params: BalanceQueryParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.balance(params),
    queryFn: () => balanceApi.getBalance(params),
    enabled,
    staleTime: 0,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
  });
}

export function useSources() {
  return useQuery({
    queryKey: queryKeys.sources(),
    queryFn: balanceApi.getSources,
    staleTime: 10 * 60 * 1000,
  });
}

export function useLatestData() {
  return useQuery({
    queryKey: queryKeys.latest(),
    queryFn: balanceApi.getLatest,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}

export function useHealthStatus() {
  return useQuery({
    queryKey: queryKeys.health(),
    queryFn: balanceApi.getHealth,
    refetchInterval: 60_000,
    retry: 1,
  });
}

// ── Data transformation helpers ───────────────────────────────────

/**
 * Convierte las entradas en datos para el AreaChart.
 * Excluye agregados (Generación renovable, Generación no renovable).
 */
export function toAreaChartData(
  entries: ReturnType<typeof useBalanceData>['data'],
): ChartDataPoint[] {
  if (!entries?.data.length) return [];

  const filtered = entries.data.filter(
    (e) => !AGGREGATE_TYPES.includes(e.energySource.type),
  );

  const map = new Map<string, ChartDataPoint>();
  for (const entry of filtered) {
    const key = entry.datetime;
    const label = format(new Date(entry.datetime), 'dd MMM');
    if (!map.has(key)) map.set(key, { datetime: label });
    const point = map.get(key)!;
    point[entry.energySource.title] = Number(entry.value.toFixed(2));
  }

  return Array.from(map.values());
}

/**
 * Convierte las entradas en datos para el PieChart.
 * Filtra por groupId y excluye agregados.
 */
export function toPieData(
  entries: ReturnType<typeof useBalanceData>['data'],
  groupId: string = 'Renovable',
): PieSlice[] {
  if (!entries?.data.length) return [];

  const totals = new Map<string, { value: number; color?: string }>();

  for (const entry of entries.data) {
    if ((entry.energySource.groupId ?? '') !== groupId) continue;
    if (AGGREGATE_TYPES.includes(entry.energySource.type)) continue;

    const existing = totals.get(entry.energySource.title);
    totals.set(entry.energySource.title, {
      value: (existing?.value ?? 0) + Number(entry.value),
      color: entry.energySource.color ?? existing?.color,
    });
  }

  return Array.from(totals.entries()).map(([name, { value, color }]) => ({
    name,
    value: Number(value.toFixed(2)),
    color: color ?? '#64748b',
    fill: color ?? '#64748b',
  }));
}

/**
 * Devuelve los títulos únicos de fuentes excluendo agregados.
 */
export function getSourceTitles(
  entries: ReturnType<typeof useBalanceData>['data'],
): string[] {
  if (!entries?.data.length) return [];
  const titles = new Set(
    entries.data
      .filter((e) => !AGGREGATE_TYPES.includes(e.energySource.type))
      .map((e) => e.energySource.title),
  );
  return Array.from(titles);
}

/**
 * Calcula la generación total del período.
 * Suma fuentes Renovable + No-Renovable excluyendo agregados.
 */
export function calcTotalGeneration(entries: BalanceEntry[]): number {
  return entries
    .filter((e) => GENERATION_GROUPS.includes(e.energySource.groupId ?? ''))
    .filter((e) => !AGGREGATE_TYPES.includes(e.energySource.type))
    .reduce((acc, e) => acc + Number(e.value), 0);
}

/**
 * Calcula la demanda total del período.
 */
export function calcTotalDemand(entries: BalanceEntry[]): number {
  return entries
    .filter((e) => e.energySource.type === 'Demanda en b.c.')
    .reduce((acc, e) => acc + Number(e.value), 0);
}


