import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { AlertTriangle, MapPin, Clock } from "lucide-react";
import type { Appointment } from "@/types/agenda";
import { ptBR } from "date-fns/locale";

type CancelAgendamentoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAppointment: Appointment | null;
  onConfirm: () => void;
};

const parseAppointmentDate = (value: string) => new Date(value.includes("T") ? value : `${value}T00:00:00`);

const CancelAgendamentoModal = ({ open, onOpenChange, selectedAppointment, onConfirm }: CancelAgendamentoModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md bg-white rounded-none p-6 overflow-hidden border-none">
        <DialogHeader className="flex flex-row items-center gap-4 space-y-0 text-left mb-6">
          <div className="bg-orange-50 p-3 rounded-none">
            <AlertTriangle className="w-6 h-6 text-[#f26532]" />
          </div>
          <DialogTitle className="text-xl font-bold text-[#1e293b] leading-tight">CONFIRMAR CANCELAMENTO</DialogTitle>
        </DialogHeader>

        {selectedAppointment && (
          <div className="space-y-6">
            {/* SeÃ§Ã£o de Detalhes com labels em caixa alta conforme o padrÃ£o */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Unidade de Atendimento
                </span>
                <span className="text-sm text-slate-700 font-medium">{selectedAppointment.unidade || "—"}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Data e Horário
                </span>
                <span className="text-sm text-slate-700 font-medium uppercase">
                  {format(parseAppointmentDate(selectedAppointment.data), "dd MMM, yyyy", { locale: ptBR })} às {selectedAppointment.hora}
                </span>
              </div>
            </div>

            {/* Alerta de consequÃªncia */}
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-none">
              <p className="text-red-700 text-xs font-semibold leading-relaxed">
                ATENÇÃO: Pode ser que você não consiga mais agendar para essa data após o cancelamento.
              </p>
            </div>

            {/* AÃ§Ãµes conforme o padrÃ£o de botÃµes largos e retos */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={onConfirm}
                className="w-full h-14 bg-[#f26532] hover:bg-[#d95428] text-white rounded-none text-base font-bold uppercase tracking-wide transition-all"
              >
                Confirmar Cancelamento
              </Button>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="w-full h-12 text-slate-500 rounded-none text-sm font-bold uppercase tracking-wide hover:bg-slate-100"
              >
                Manter Agendamento
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CancelAgendamentoModal;
