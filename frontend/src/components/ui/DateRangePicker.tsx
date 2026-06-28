import { TimeTrunc } from '../../types/balance.types';
import { format, subDays, subMonths } from 'date-fns';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  timeTrunc: TimeTrunc;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onTimeTruncChange: (v: TimeTrunc) => void;
}

const fmt = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");

const PRESETS = [
  { label: '7d', start: () => fmt(subDays(new Date(), 7)), end: () => fmt(new Date()), trunc: 'day' as TimeTrunc },
  { label: '30d', start: () => fmt(subDays(new Date(), 30)), end: () => fmt(new Date()), trunc: 'day' as TimeTrunc },
  { label: '3m', start: () => fmt(subMonths(new Date(), 3)), end: () => fmt(new Date()), trunc: 'day' as TimeTrunc },
  { label: '1a', start: () => fmt(subMonths(new Date(), 12)), end: () => fmt(new Date()), trunc: 'month' as TimeTrunc },
];

const TRUNC_OPTIONS: { value: TimeTrunc; label: string }[] = [
  { value: 'day', label: 'Por día' },
  { value: 'month', label: 'Por mes' },
];


export function DateRangePicker({
  startDate,
  endDate,
  timeTrunc,
  onStartChange,
  onEndChange,
  onTimeTruncChange,
}: DateRangePickerProps) {
  const inputClass =
    'bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors w-full';

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Presets */}
      <div className="flex items-center gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => { 
              onStartChange(p.start()); 
              onEndChange(p.end()); 
              onTimeTruncChange(p.trunc);
            }}
            className="px-2.5 py-1.5 text-xs text-zinc-400 border border-zinc-800 rounded hover:border-zinc-600 hover:text-zinc-200 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date inputs */}
      <div className="flex items-center gap-2">
        <div>
          <label className="block text-[10px] text-zinc-600 uppercase tracking-wider mb-1">
            Desde
          </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => onStartChange(e.target.value)}
            className={inputClass}
          />
        </div>
        <span className="text-zinc-700 mt-4">—</span>
        <div>
          <label className="block text-[10px] text-zinc-600 uppercase tracking-wider mb-1">
            Hasta
          </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => onEndChange(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Granularity */}
      <div>
        <label className="block text-[10px] text-zinc-600 uppercase tracking-wider mb-1">
          Granularidad
        </label>
        <select
          value={timeTrunc}
          onChange={(e) => onTimeTruncChange(e.target.value as TimeTrunc)}
          className={inputClass}
        >
          {TRUNC_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
