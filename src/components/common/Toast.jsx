import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-lg transition-all duration-200 ${
              isSuccess
                ? 'bg-[#1C130E] text-[#F5EFEB] border-[#3E2415] shadow-black/20'
                : isError
                ? 'bg-rose-950 text-rose-100 border-rose-800 shadow-rose-950/30'
                : 'bg-[#2A1810] text-[#EFE7DE] border-[#4A2E1F] shadow-black/20'
            }`}
          >
            <div className="flex items-center gap-2.5 text-sm">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {isError && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              {!isSuccess && !isError && <Info className="w-4 h-4 text-[#D97706] shrink-0" />}
              <span className="font-medium text-xs sm:text-sm leading-snug">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-neutral-400 hover:text-white p-1 rounded transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
