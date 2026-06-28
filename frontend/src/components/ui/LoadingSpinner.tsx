interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function LoadingSpinner({ size = 'md', label = 'Cargando datos...' }: LoadingSpinnerProps) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12" role="status">
      <div
        className={`${sizes[size]} border-2 border-zinc-700 border-t-indigo-400 rounded-full animate-spin`}
      />
      <span className="text-xs text-zinc-500 tracking-widest uppercase">{label}</span>
    </div>
  );
}
