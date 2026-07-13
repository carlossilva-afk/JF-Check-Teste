import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDanger = true
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="confirm-modal-overlay">
      <div className="bg-white border-2 border-zinc-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
        
        {/* Header */}
        <div className={`p-5 text-white flex items-center justify-between border-b-2 ${isDanger ? 'bg-rose-950 border-rose-500' : 'bg-zinc-950 border-amber-500'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ${isDanger ? 'bg-rose-500 text-rose-950' : 'bg-amber-500 text-zinc-950'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-widest block opacity-75 font-black">Confirmação</span>
              <h3 className="text-sm font-black uppercase tracking-tight">{title}</h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-lg transition"
            title="Fechar"
            id="btn-close-confirm-modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 bg-zinc-50 space-y-4">
          <p className="text-sm text-zinc-700 font-semibold leading-relaxed">
            {message}
          </p>
          
          {isDanger && (
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-xs flex gap-2.5 text-rose-900 font-medium">
              <span className="font-bold text-rose-950 uppercase text-[10px] tracking-wide">Atenção:</span>
              <p>Essa ação não poderá ser desfeita após ser confirmada.</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-zinc-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 text-xs font-black uppercase rounded-xl transition border border-zinc-200"
            id="btn-cancel-confirm"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2.5 text-white text-xs font-black uppercase rounded-xl transition shadow-sm border-b-4 ${
              isDanger 
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 border-rose-800' 
                : 'bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 border-zinc-950'
            }`}
            id="btn-confirm-confirm"
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
}
