import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { BalanceEntry } from '../../types/balance.types';
import { format } from 'date-fns';

interface GenerationBarChartProps {
  entries: BalanceEntry[];
  title?: string;
}

interface BarDataPoint {
  datetime: string;
  Generación: number;
  Demanda: number;
  Saldo: number;
}

// Fuentes que son generación real (excluye agregados)
const GENERATION_GROUPS = ['Renovable', 'No-Renovable'];
const AGGREGATE_TYPES = ['Generación renovable', 'Generación no renovable'];

export function GenerationBarChart({ entries, title }: GenerationBarChartProps) {
  if (!entries.length) return null;

  const map = new Map<string, BarDataPoint>();

  for (const entry of entries) {
    const key = entry.datetime;
    const label = format(new Date(entry.datetime), 'dd MMM');
    if (!map.has(key)) {
      map.set(key, { datetime: label, Generación: 0, Demanda: 0, Saldo: 0 });
    }
    const point = map.get(key)!;

    if (
      GENERATION_GROUPS.includes(entry.energySource.groupId ?? '') &&
      !AGGREGATE_TYPES.includes(entry.energySource.type)
    ) {
      point.Generación += Number(entry.value);
    } else if (entry.energySource.type === 'Demanda en b.c.') {
      point.Demanda += Number(entry.value);
    }
  }

  const data = Array.from(map.values()).map((p) => ({
    ...p,
    Generación: Number(p.Generación.toFixed(0)),
    Demanda: Number(p.Demanda.toFixed(0)),
    Saldo: Number((p.Generación - p.Demanda).toFixed(0)),
  }));

  return (
    <div className="w-full">
      {title && (
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">{title}</p>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="datetime"
            tick={{ fill: '#52525b', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#27272a' }}
          />
          <YAxis
            tick={{ fill: '#52525b', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
            width={38}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: 4,
              fontSize: 11,
              color: '#a1a1aa',
            }}
            formatter={(value: number) => [`${value.toLocaleString('es-ES')} GWh`]}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, color: '#71717a', paddingTop: 12 }}
            iconType="circle"
            iconSize={6}
          />
          <ReferenceLine y={0} stroke="#3f3f46" />
          <Bar dataKey="Generación" fill="#6366f1" opacity={0.8} radius={[2, 2, 0, 0]} />
          <Bar dataKey="Demanda" fill="#64748b" opacity={0.8} radius={[2, 2, 0, 0]} />
          <Bar dataKey="Saldo" fill="#10b981" opacity={0.7} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


