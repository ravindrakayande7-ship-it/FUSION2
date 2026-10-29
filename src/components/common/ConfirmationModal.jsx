import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const ConfirmationModal = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#FFFFFF] border border-[#E8DFD8] rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDestructive ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-[#C87D32]'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#2C1810]">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-[#2C1810] p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-[#5C4538] leading-relaxed mb-6">{message}</p>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-[#5C4538] hover:text-[#2C1810] bg-[#F5EFEB] hover:bg-[#EBE2D8] rounded-xl transition-colors whitespace-nowrap"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-semibold rounded-xl text-white transition-colors whitespace-nowrap shadow-sm ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-[#2C1810] hover:bg-[#422418]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
