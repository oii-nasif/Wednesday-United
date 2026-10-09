import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all transform translate-y-0 opacity-100 ${
            toast.type === 'success'
              ? 'bg-blue-900/90 border-blue-700 text-blue-100 dark:bg-blue-950 dark:border-blue-800'
              : toast.type === 'error'
              ? 'bg-red-900/90 border-red-700 text-red-100 dark:bg-red-950 dark:border-red-800'
              : 'bg-zinc-800/95 border-zinc-700 text-zinc-100 dark:bg-zinc-900 dark:border-zinc-800'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-orange-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
          <span className="flex-1">{toast.message}</span>
        </div>
      ))}
    </div>
  );
};
