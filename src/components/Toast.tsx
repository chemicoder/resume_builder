import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

// Lightweight, dependency-free toast system. Replaces blocking `alert()` calls
// with non-blocking, auto-dismissing notifications. Wrap the app in
// <ToastProvider> and call `useToast()` to push messages.

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const KIND_STYLES: Record<ToastKind, { border: string; icon: React.ReactNode; iconColor: string }> = {
  success: { border: 'border-emerald-200', iconColor: 'text-emerald-600', icon: <CheckCircle2 size={18} /> },
  error: { border: 'border-red-200', iconColor: 'text-red-600', icon: <AlertCircle size={18} /> },
  info: { border: 'border-blue-200', iconColor: 'text-blue-600', icon: <Info size={18} /> },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, kind, message }]);
      // Errors linger a little longer so they can be read.
      const ttl = kind === 'error' ? 6000 : 3500;
      const timer = setTimeout(() => dismiss(id), ttl);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((timer) => clearTimeout(timer));
      map.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 print:hidden" role="status" aria-live="polite">
        {toasts.map((t) => {
          const style = KIND_STYLES[t.kind];
          return (
            <div
              key={t.id}
              className={`toast-enter flex items-start gap-3 bg-white border ${style.border} rounded-lg shadow-lg px-4 py-3 max-w-sm`}
            >
              <span className={`${style.iconColor} mt-0.5 shrink-0`}>{style.icon}</span>
              <p className="text-sm text-gray-800 leading-snug flex-1">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-gray-400 hover:text-gray-700 shrink-0"
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue['toast'] {
  const context = useContext(ToastContext);
  if (!context) {
    // Fail soft: if used outside the provider, fall back to a no-op + console
    // so a missing provider never crashes the app.
    return (message: string) => console.warn('[toast]', message);
  }
  return context.toast;
}
