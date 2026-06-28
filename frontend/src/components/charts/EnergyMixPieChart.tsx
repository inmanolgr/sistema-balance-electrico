import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { PieSlice } from '../../types/balance.types';

interface EnergyMixPieChartProps {
  data: PieSlice[];
  title?: string;
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: PieSlice }>;
}) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: slice } = payload[0];
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded p-3 text-xs shadow-xl">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: slice.color }}
        />
        <span className="text-zinc-300">{name}</span>
      </div>
      <span className="text-zinc-400 font-mono">
        {value.toLocaleString('es-ES')} GWh
      </span>
    </div>
  );
};

export function EnergyMixPieChart({ data, title }: EnergyMixPieChartProps) {
  if (!data.length) return null;

  return (
    <div className="w-full">
      {title && (
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">{title}</p>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((slice, i) => (
              <Cell key={`cell-${i}`} fill={slice.fill} opacity={0.85} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 9, color: '#71717a', paddingTop: 4 }}
            iconType="circle"
            iconSize={5}
            formatter={(value) => (
              <span style={{ color: '#a1a1aa', fontSize: 9 }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
