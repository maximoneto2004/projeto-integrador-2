import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Star, ClipboardCheck } from "lucide-react";
import type { Appointment } from "@/types/agenda";

type AvaliacaoAgendamentoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAppointment: Appointment | null;
  notaAvaliacao: number;
  setNotaAvaliacao: (nota: number) => void;
  comentarioAvaliacao: string;
  setComentarioAvaliacao: (comentario: string) => void;
  onSalvar: () => void;
};

const AvaliacaoAgendamentoModal = ({
  open,
  onOpenChange,
  selectedAppointment,
  notaAvaliacao,
  setNotaAvaliacao,
  comentarioAvaliacao,
  setComentarioAvaliacao,
  onSalvar,
}: AvaliacaoAgendamentoModalProps) => {
  const isReadOnly = !!selectedAppointment?.avaliacao?.id;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Removido arredondamento e scroll, bordas retas aplicadas */}
      <DialogContent className="max-w-[95vw] sm:max-w-md bg-white rounded-none p-6 overflow-hidden border-none">
        <DialogHeader className="flex flex-row items-center gap-4 space-y-0 text-left mb-6">
          {/* Ícone com fundo reto conforme solicitado */}
          <div className="bg-orange-50 p-3 rounded-none">
            <ClipboardCheck className="w-6 h-6 text-[#f26532]" />
          </div>
          <DialogTitle className="text-xl font-bold text-[#1e293b] uppercase tracking-tight">
            {selectedAppointment?.avaliacao ? "Sua Avaliação" : "Avaliar Atendimento"}
          </DialogTitle>
        </DialogHeader>

        {selectedAppointment && (
          <div className="space-y-6">
            {/* Container de estrelas com bordas retas */}
            <div className="bg-[#f8fafc] p-6 rounded-none border border-slate-100">
              <p className="text-center text-slate-500 text-sm font-medium mb-4">Como foi seu atendimento?</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((nota) => (
                  <button
                    key={nota}
                    onClick={() => setNotaAvaliacao(nota)}
                    disabled={isReadOnly}
                    className="transition-transform active:scale-95 disabled:opacity-50"
                  >
                    <Star className={`w-9 h-9 ${nota <= notaAvaliacao ? "fill-[#f26532] text-[#f26532]" : "text-slate-300"}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Comentário (opcional)</label>
              <Textarea
                value={comentarioAvaliacao}
                onChange={(e) => setComentarioAvaliacao(e.target.value)}
                disabled={isReadOnly}
                placeholder="Compartilhe sua experiência..."
                className="min-h-[120px] resize-none rounded-none border-slate-200 bg-[#fdfdfd] focus-visible:ring-[#f26532]"
              />
            </div>

            <div className="pt-2">
              <Button
                onClick={onSalvar}
                disabled={isReadOnly || notaAvaliacao === 0}
                className="w-full h-14 bg-[#f26532] hover:bg-[#d95428] text-white rounded-none text-base font-bold uppercase tracking-wide transition-all"
              >
                {isReadOnly ? "Avaliação Enviada" : selectedAppointment?.avaliacao ? "Atualizar Avaliação" : "Enviar Avaliação"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AvaliacaoAgendamentoModal;
