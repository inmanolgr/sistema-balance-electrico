import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartDataPoint } from '../../types/balance.types';

interface BalanceAreaChartProps {
  data: ChartDataPoint[];
  sources: string[];
  colors: string[];
  title?: string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded p-3 text-xs shadow-xl">
      <p className="text-zinc-400 mb-2 font-mono">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-zinc-400">{entry.name}</span>
          </div>
          <span className="text-zinc-200 font-mono tabular-nums">
            {entry.value.toLocaleString('es-ES')} GWh
          </span>
        </div>
      ))}
    </div>
  );
};

export function BalanceAreaChart({ data, sources, colors, title }: BalanceAreaChartProps) {
  if (!data.length) return null;

  return (
    <div className="w-full">
      {title && (
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">{title}</p>
      )}
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            {sources.map((source, i) => (
              <linearGradient key={source} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
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
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 10, color: '#71717a', paddingTop: 12 }}
            iconType="circle"
            iconSize={6}
          />
          {sources.map((source, i) => (
            <Area
              key={source}
              type="monotone"
              dataKey={source}
              stroke={colors[i % colors.length]}
              strokeWidth={1.5}
              fill={`url(#grad-${i})`}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
