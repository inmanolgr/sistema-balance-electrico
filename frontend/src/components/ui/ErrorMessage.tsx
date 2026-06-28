import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
      <AlertTriangle className="w-8 h-8 text-amber-400 opacity-80" strokeWidth={1.5} />
      <div>
        <p className="text-sm text-zinc-400 mb-1">No se pudieron obtener los datos</p>
        <p className="text-xs text-zinc-600 font-mono max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 text-xs text-zinc-300 border border-zinc-700 rounded hover:border-zinc-500 hover:text-white transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Reintentar
        </button>
      )}
    </div>
  );
}
