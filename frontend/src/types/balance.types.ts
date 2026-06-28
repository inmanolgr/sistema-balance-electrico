// ── API response types (mirror backend DTOs) ─────────────────────

export interface EnergySource {
  id: number;
  type: string;
  title: string;
  groupId?: string;
  color?: string;
  magnitude?: string;
}

export interface BalanceEntry {
  id: number;
  value: number;
  percentage?: number;
  datetime: string;
  timeTrunc: string;
  energySource: EnergySource;
}

export interface BalanceResponse {
  data: BalanceEntry[];
  total: number;
  startDate: string;
  endDate: string;
  timeTrunc: string;
  lastIngestion?: string;
}

export interface SourcesResponse {
  data: EnergySource[];
  total: number;
}

export interface LatestResponse {
  datetime: string;
  timeTrunc: string;
  data: BalanceEntry[];
}

// ── Query params ──────────────────────────────────────────────────

export interface BalanceQueryParams {
  start_date: string;
  end_date: string;
  time_trunc: TimeTrunc;
  source_type?: string;
}

export type TimeTrunc = 'hour' | 'day' | 'month' | 'year';

// ── Chart data shapes ─────────────────────────────────────────────

export interface ChartDataPoint {
  datetime: string;
  [sourceTitle: string]: number | string;
}

export interface PieSlice {
  name: string;
  value: number;
  color: string;
  fill: string;
}

export interface HealthStatus {
  status: string;
  ingestion: { isIngesting: boolean };
  builtWith: string;
}
