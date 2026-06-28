import { useState, useEffect } from 'react';
import { format, subDays, subMonths } from 'date-fns';
import { Activity, RefreshCw } from 'lucide-react';
import {
  useBalanceData,
  useHealthStatus,
  toAreaChartData,
  toPieData,
  getSourceTitles,
  calcTotalGeneration,
  calcTotalDemand,
} from '../../hooks/useBalanceData';
import { DateRangePicker } from '../ui/DateRangePicker';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { BalanceAreaChart } from '../charts/BalanceAreaChart';
import { EnergyMixPieChart } from '../charts/EnergyMixPieChart';
import { GenerationBarChart } from '../charts/GenerationBarChart';
import { TimeTrunc } from '../../types/balance.types';

const fmt = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");

const SOURCE_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#64748b', '#94a3b8', '#475569', '#334155',
  '#0ea5e9', '#38bdf8', '#10b981', '#34d399',
  '#f59e0b', '#ef4444', '#ec4899', '#14b8a6',
];

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-2xl font-light text-zinc-100 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1 font-mono">{sub}</p>}
    </div>
  );
}

function ChartCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-lg p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Dashboard() {
  const [startDate, setStartDate] = useState(fmt(subDays(new Date(), 30)));
  const [endDate, setEndDate] = useState(fmt(new Date()));
  const [timeTrunc, setTimeTrunc] = useState<TimeTrunc>('day');

  // Debounce fechas — evita queries con valores incompletos al escribir
  const [debouncedStart, setDebouncedStart] = useState(startDate);
  const [debouncedEnd, setDebouncedEnd] = useState(endDate);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedStart(startDate), 800);
    return () => clearTimeout(t);
  }, [startDate]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedEnd(endDate), 800);
    return () => clearTimeout(t);
  }, [endDate]);

  const { data, isLoading, isError, error, refetch, isFetching } = useBalanceData({
    start_date: debouncedStart,
    end_date: debouncedEnd,
    time_trunc: timeTrunc,
  });

  const { data: health } = useHealthStatus();

  // Datos derivados — toda la lógica de negocio en los helpers, no en el componente
  const generationSources = getSourceTitles(data);
  const areaData = toAreaChartData(data);
  const pieData = toPieData(data, 'Renovable');
  const totalEntries = data?.total ?? 0;
  const lastIngestion = data?.lastIngestion
    ? format(new Date(data.lastIngestion), 'dd MMM HH:mm')
    : '—';

  const totalGeneration = data?.data ? calcTotalGeneration(data.data) : 0;
  const totalDemand = data?.data ? calcTotalDemand(data.data) : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="border-b border-zinc-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-medium text-zinc-100 leading-none">
              Balance Eléctrico
            </h1>
            <p className="text-[10px] text-zinc-600 mt-0.5">Red Eléctrica de España</p>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                health?.status === 'ok' ? 'bg-emerald-400' : 'bg-zinc-600'
              }`}
            />
            <span className="text-[10px] text-zinc-600">
              {health?.status === 'ok' ? 'Sistema activo' : 'Sin conexión'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Controls ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            timeTrunc={timeTrunc}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
            onTimeTruncChange={setTimeTrunc}
          />
          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 text-xs text-zinc-400 border border-zinc-800 rounded hover:border-zinc-600 hover:text-zinc-200 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* ── Stats row ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Generación total"
            value={totalGeneration.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
            sub="GWh en el período"
          />
          <StatCard
            label="Demanda total"
            value={totalDemand.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
            sub="GWh en el período"
          />
          <StatCard
            label="Registros"
            value={totalEntries.toLocaleString('es-ES')}
            sub="entradas en BD"
          />
          <StatCard
            label="Última ingesta"
            value={lastIngestion}
            sub={health?.ingestion?.isIngesting ? '⟳ ingiriendo...' : 'REE sync'}
          />
        </div>

        {/* ── Charts ───────────────────────────────────────────────── */}
        {isLoading && <LoadingSpinner label="Consultando base de datos..." />}

        {isError && (
          <ErrorMessage
            message={(error as Error).message}
            onRetry={() => void refetch()}
          />
        )}

        {!isLoading && !isError && data && (
          <>
            <ChartCard>
              <BalanceAreaChart
                data={areaData}
                sources={generationSources}
                colors={SOURCE_COLORS}
                title="Generación por fuente — evolución temporal"
              />
            </ChartCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChartCard>
                <EnergyMixPieChart
                  data={pieData}
                  title="Mix renovable — distribución total"
                />
              </ChartCard>

              <ChartCard>
                <GenerationBarChart
                  entries={data.data}
                  title="Generación · Demanda · Saldo"
                />
              </ChartCard>
            </div>

            {!data.data.length && (
              <div className="text-center py-16 text-zinc-600">
                <Activity className="w-8 h-8 mx-auto mb-3 opacity-30" strokeWidth={1} />
                <p className="text-sm">Sin datos para el rango seleccionado.</p>
                <p className="text-xs mt-1">
                  Prueba un rango más amplio o espera a que el sistema ingiera datos.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-900 px-6 py-4 mt-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[10px] text-zinc-700">
          <span>Datos: Red Eléctrica de España (REE) — apidatos.ree.es</span>
          <span>Sistema de Balance Eléctrico</span>
        </div>
      </footer>
    </div>
  );
}


