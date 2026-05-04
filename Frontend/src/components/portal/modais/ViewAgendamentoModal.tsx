import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays } from "lucide-react";
import type { Appointment } from "@/types/agenda";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ViewAgendamentoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAppointment: Appointment | null;
};

const parseAppointmentDate = (value: string) => new Date(value.includes("T") ? value : `${value}T00:00:00`);

const ViewAgendamentoModal = ({ open, onOpenChange, selectedAppointment }: ViewAgendamentoModalProps) => {
  const formatHora = (hora?: string | null) => {
    if (!hora) return "-";
    const trimmed = String(hora).trim();
    if (!trimmed) return "-";
    if (!trimmed.includes(":")) return trimmed;
    return trimmed.split(":").slice(0, 2).join(":");
  };

  const formatGuiche = (value?: string | null) => {
    if (!value) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    if (/^(guich[eê]|mesa)\b/i.test(trimmed)) return trimmed;
    return `Guichê ${trimmed}`;
  };

  const profissionalLocal = selectedAppointment
    ? [selectedAppointment.atendente || null, formatGuiche(selectedAppointment.guiche)].filter(Boolean).join(" - ")
    : "--- - ---";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md bg-white rounded-none p-4 sm:p-6 border-none max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 space-y-0 text-left mb-4 sm:mb-6">
          <div className="bg-orange-50 p-3 rounded-none w-fit">
            <CalendarDays className="w-6 h-6 text-[#f26532]" />
          </div>
          <DialogTitle className="text-lg sm:text-xl font-bold text-[#1e293b] uppercase tracking-tight leading-tight">
            Detalhes do Agendamento
          </DialogTitle>
        </DialogHeader>

        {selectedAppointment && (
          <div className="space-y-3 sm:space-y-4">
            {/* UNIDADE */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Unidade de Atendimento</label>
              {/* <Select disabled>
                <SelectTrigger className="h-11 bg-[#f8fafc] border-slate-100 text-slate-600 rounded-none opacity-100">
                  <SelectValue placeholder={selectedAppointment.unidade || "â€”"} />
                </SelectTrigger>
              
              </Select> */}
              <div className="min-h-[44px] px-3 py-2 bg-[#f8fafc] border border-slate-100 text-sm text-slate-600 font-medium leading-snug break-words">
                {selectedAppointment.unidade || "sem unidade"}
              </div>
            </div>

            {/* CATEGORIA (Baseado no seu pedido de manter campos do editar) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Categoria de Serviço</label>
              {/* <Select disabled>
                <SelectTrigger className="h-11 bg-[#f8fafc] border-slate-100 text-slate-600 rounded-none opacity-100">
                  <SelectValue placeholder={selectedAppointment.categoria || "—"} />
                </SelectTrigger>
              </Select> */}

              <div className="min-h-[44px] px-3 py-2 bg-[#f8fafc] border border-slate-100 text-sm text-slate-600 font-medium leading-snug break-words">
                {selectedAppointment.categoria || "—"}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Serviço</label>
              {/* <Select disabled>
                <SelectTrigger className="h-11 bg-[#f8fafc] border-slate-100 text-slate-600 rounded-none opacity-100">
                  <SelectValue placeholder={selectedAppointment.servico || "NÃ£o especificado"} />
                </SelectTrigger>
              </Select> */}
              <div className="min-h-[44px] px-3 py-2 bg-[#f8fafc] border border-slate-100 text-sm text-slate-600 font-medium leading-snug break-words">
                {selectedAppointment.servico || "Não especificado"}
              </div>
            </div>

            {/* VAGA (DATA/HORA) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vaga / Horário</label>
              <div className="min-h-[44px] px-3 py-2 bg-[#f8fafc] border border-slate-100 text-sm text-slate-600 font-medium leading-snug break-words">
                {format(parseAppointmentDate(selectedAppointment.data), "dd 'de' MMMM, yyyy", { locale: ptBR })} -{" "}
                {formatHora(selectedAppointment.hora)}
              </div>
            </div>

            {/* PROFISSIONAL / ATENDENTE (Se houver) */}
            <div className="space-y-1 mb-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Profissional / Local</label>
              <div className="min-h-[44px] px-3 py-2 bg-[#f8fafc] border border-slate-100 text-sm text-slate-600 font-medium leading-snug break-words">
                {profissionalLocal || "--- • ---"}
              </div>
            </div>

            {selectedAppointment.motivoOutraUnidade && (
              <div className="space-y-1 mb-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Motivo para agendar em outra unidade</label>
                <div className="min-h-[44px] px-3 py-2 bg-[#f8fafc] border border-slate-100 text-sm text-slate-600 font-medium leading-snug break-words">
                  {selectedAppointment.motivoOutraUnidade}
                </div>
              </div>
            )}

            <div className="pb-2 sm:pb-4">
              <Button
                onClick={() => onOpenChange(false)}
                className="w-full h-12 sm:h-14 bg-[#f26532] hover:bg-[#d95428] text-white rounded-none text-base font-bold uppercase tracking-wide transition-all"
              >
                Concluir Visualização
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewAgendamentoModal;
