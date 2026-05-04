import { TermsOfUseContent } from "@/components/portal/TermsOfUseContent";
import { X } from "lucide-react";

interface ModalTermosProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalTermos = ({ isOpen, onClose }: ModalTermosProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl border border-slate-300 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm uppercase tracking-widest font-bold text-slate-700">Termos de Uso e Privacidade</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-colors">
            <X size={20} />
          </button>
        </div>

        <TermsOfUseContent />

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white text-xs uppercase tracking-widest font-bold hover:bg-slate-800 transition-all active:scale-95"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

