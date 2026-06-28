import { describe, it, expect } from 'vitest';
import { toAreaChartData, toPieData, getSourceTitles } from '../hooks/useBalanceData';
import { BalanceResponse } from '../types/balance.types';

const mockSource = (type: string, title: string, color?: string) => ({
  id: Math.random(),
  type,
  title,
  color,
  magnitude: 'GWh',
});

const mockEntry = (
  type: string,
  title: string,
  value: number,
  datetime: string,
  color?: string,
) => ({
  id: Math.random(),
  value,
  percentage: 0.1,
  datetime,
  timeTrunc: 'day',
  energySource: mockSource(type, title, color),
});

const makeResponse = (entries: ReturnType<typeof mockEntry>[]): BalanceResponse => ({
  data: entries,
  total: entries.length,
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-01-31T23:59:00Z',
  timeTrunc: 'day',
});

describe('toAreaChartData', () => {
  it('returns empty array for undefined data', () => {
    expect(toAreaChartData(undefined, 'Generación')).toEqual([]);
  });

  it('groups entries by datetime', () => {
    const response = makeResponse([
      mockEntry('Generación', 'Nuclear', 100, '2024-01-01T00:00:00.000Z'),
      mockEntry('Generación', 'Eólica', 200, '2024-01-01T00:00:00.000Z'),
      mockEntry('Generación', 'Nuclear', 110, '2024-01-02T00:00:00.000Z'),
    ]);

    const result = toAreaChartData(response, 'Generación');
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('Nuclear', 100);
    expect(result[0]).toHaveProperty('Eólica', 200);
  });

  it('filters by source type when provided', () => {
    const response = makeResponse([
      mockEntry('Generación', 'Nuclear', 100, '2024-01-01T00:00:00.000Z'),
      mockEntry('Demanda', 'Demanda real', 500, '2024-01-01T00:00:00.000Z'),
    ]);

    const result = toAreaChartData(response, 'Generación');
    expect(result[0]).toHaveProperty('Nuclear');
    expect(result[0]).not.toHaveProperty('Demanda real');
  });
});

describe('toPieData', () => {
  it('returns empty array for undefined data', () => {
    expect(toPieData(undefined)).toEqual([]);
  });

  it('sums values per source title across time range', () => {
    const response = makeResponse([
      mockEntry('Generación', 'Nuclear', 100, '2024-01-01T00:00:00.000Z'),
      mockEntry('Generación', 'Nuclear', 150, '2024-01-02T00:00:00.000Z'),
      mockEntry('Generación', 'Eólica', 300, '2024-01-01T00:00:00.000Z'),
    ]);

    const result = toPieData(response, 'Generación');
    const nuclear = result.find((p) => p.name === 'Nuclear');
    expect(nuclear?.value).toBe(250);
  });

  it('uses source color from API when available', () => {
    const response = makeResponse([
      mockEntry('Generación', 'Nuclear', 100, '2024-01-01T00:00:00.000Z', '#00AAFF'),
    ]);

    const result = toPieData(response, 'Generación');
    expect(result[0].color).toBe('#00AAFF');
  });

  it('filters out non-matching source types', () => {
    const response = makeResponse([
      mockEntry('Demanda', 'Demanda real', 500, '2024-01-01T00:00:00.000Z'),
    ]);

    const result = toPieData(response, 'Generación');
    expect(result).toHaveLength(0);
  });
});

describe('getSourceTitles', () => {
  it('returns unique source titles', () => {
    const response = makeResponse([
      mockEntry('Generación', 'Nuclear', 100, '2024-01-01T00:00:00.000Z'),
      mockEntry('Generación', 'Nuclear', 110, '2024-01-02T00:00:00.000Z'),
      mockEntry('Generación', 'Eólica', 200, '2024-01-01T00:00:00.000Z'),
    ]);

    const result = getSourceTitles(response, 'Generación');
    expect(result).toHaveLength(2);
    expect(result).toContain('Nuclear');
    expect(result).toContain('Eólica');
  });

  it('returns empty array for undefined data', () => {
    expect(getSourceTitles(undefined)).toEqual([]);
  });
});
