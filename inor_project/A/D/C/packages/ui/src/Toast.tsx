'use client';
import { useState, useEffect, useCallback, type ReactNode, createContext, useContext } from 'react';
import { cn } from '@yt/shared';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface ToastData {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<ToastData, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.duration || 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => {
          const Icon = icons[toast.type || 'info'];
          return (
            <div
              key={toast.id}
              className={cn(
                'flex items-start gap-3 p-4 rounded-xl shadow-2xl border animate-in slide-in-from-bottom-2 fade-in duration-300',
                toast.type === 'success' && 'bg-green-900/90 border-green-700 text-green-100',
                toast.type === 'error' && 'bg-red-900/90 border-red-700 text-red-100',
                !toast.type && 'bg-[#272727] border-[#3a3a3a] text-white',
              )}
            >
              <Icon className="shrink-0 mt-0.5" size={18} />
              <p className="text-sm flex-1">{toast.message}</p>
              {toast.action && (
                <button
                  onClick={toast.action.onClick}
                  className="text-sm font-semibold text-blue-400 hover:text-blue-300 shrink-0"
                >
                  {toast.action.label}
                </button>
              )}
              <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-white shrink-0">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
