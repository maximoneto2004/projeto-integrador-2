import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  CalendarDays, 
  User, 
  MapPin, 
  Fingerprint, 
  UserCog,
  FileText,
  Clock,
  Calendar
} from "lucide-react";
import type { Appointment } from "@/types/agenda";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ModalDetalhesAgendamentoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
}

export function ModalDetalhesAgendamento({
  open,
  onOpenChange,
  appointment,
}: ModalDetalhesAgendamentoProps) {
  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl bg-white rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Barra de destaque superior laranja */}
        <div className="bg-[#f05a28] h-1.5 w-full flex-shrink-0" />

        <div className="p-8">
          <DialogHeader className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-orange-100 p-2.5 rounded-xl text-[#f05a28]">
                <CalendarDays className="h-5 w-5" />
              </div>
              <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider">
                {appointment.status}
              </Badge>
            </div>
            <DialogTitle className="text-1xl font-bold text-slate-800 text-left">
              {appointment.servico}
            </DialogTitle>
          </DialogHeader>

          {/* BLOCO DE DATA E HORA - ESTILO TICKET */}
          <div className="flex items-center justify-around bg-slate-50 py-5 rounded-2xl border border-slate-100 mb-8">
            <div className="text-center">
              <div className="flex items-center gap-1.5 justify-center text-slate-400 mb-1">
                <Calendar className="w-3 h-3" />
                <p className="text-[10px] uppercase font-black tracking-widest">Data</p>
              </div>
              <p className="text-lg font-bold text-slate-700">
                {format(parseISO(appointment.data), "dd MMM, yyyy", { locale: ptBR })}
              </p>
            </div>
            
            <Separator orientation="vertical" className="h-10 bg-slate-200" />
            
            <div className="text-center">
              <div className="flex items-center gap-1.5 justify-center text-slate-400 mb-1">
                <Clock className="w-3 h-3" />
                <p className="text-[10px] uppercase font-black tracking-widest">Horário</p>
              </div>
              <p className="text-lg font-bold text-slate-700">{appointment.hora}</p>
            </div>
          </div>

          {/* GRID DE INFORMAÇÕES */}
          <div className="grid grid-cols-1 gap-y-5 mb-8">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem 
                icon={<User className="w-4 h-4" />} 
                label="Cidadão" 
                value={appointment.nomeCidadao || "-"} 
              />
              <InfoItem 
                icon={<Fingerprint className="w-4 h-4" />} 
                label="CPF" 
                value={appointment.cpfCidadao || "-"} 
              />
            </div>
            
            <InfoItem 
              icon={<MapPin className="w-4 h-4" />} 
              label="Unidade de Atendimento" 
              value={appointment.unidade || "-"} 
            />
            
            <InfoItem 
              icon={<UserCog className="w-4 h-4" />} 
              label="Profissional / Local" 
              value={`${appointment.atendente || "---"} • ${appointment.guiche || "---"}`} 
            />

            {appointment.motivoOutraUnidade && (
              <InfoItem
                icon={<FileText className="w-4 h-4" />}
                label="Motivo para Outra Unidade"
                value={appointment.motivoOutraUnidade}
              />
            )}
          </div>

          {/* MOTIVO OU OBSERVAÇÕES */}
          {(appointment.motivo || appointment.observacoes) && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              {appointment.motivo && (
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-2 text-slate-400">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Motivo do Agendamento</span>
                  </div>
                  <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border-l-4 border-[#f05a28]">
                    {appointment.motivo}
                  </p>
                </div>
              )}

              {appointment.observacoes && (
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-2 text-slate-400">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Observações Internas</span>
                  </div>
                  <p className="text-sm text-slate-500 italic px-4">
                    "{appointment.observacoes}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-8 pt-0">
          <Button 
            variant="default" 
            className="w-full h-12 text-sm font-bold bg-[#f05a28] hover:bg-[#d84a1d] text-white rounded-xl shadow-md shadow-orange-100 transition-all"
            onClick={() => onOpenChange(false)}
          >
            Concluir Visualização
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="space-y-1.5 text-left">
      <div className="flex items-center gap-2 text-slate-400">
        <span className="text-[#f05a28]/70">{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-sm font-bold text-slate-700 leading-tight ml-6">
        {value}
      </p>
    </div>
  );
}
