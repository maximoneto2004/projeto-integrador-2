import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserCheck, MapPin, Clock, Calendar, User } from "lucide-react";
import type { Appointment } from "@/types/agenda";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ModalConfirmarChegadaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  onConfirm: () => void;
}

export function ModalConfirmarChegada({ open, onOpenChange, appointment, onConfirm }: ModalConfirmarChegadaProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md border-none p-0 bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Barra de destaque superior laranja (Identidade do Sistema) */}
        <div className="bg-[#f05a28] h-1.5 w-full" />

        <div className="p-8">
          <AlertDialogHeader className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
                <UserCheck className="h-6 w-6" />
              </div>
              <div className="text-left">
                <AlertDialogTitle className="text-xl font-bold text-slate-800">Confirmar chegada</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-500">
                  O status do agendamento será alterado para{" "}
                  <span className="text-emerald-600 font-bold uppercase text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded">Aguardando</span>.
                </AlertDialogDescription>
              </div>
            </div>

            {appointment && (
              <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4 text-left">
                {/* Nome do Cidadão em destaque */}
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-[#f05a28] shadow-sm">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cidadão</p>
                    <p className="text-base font-bold text-slate-700 truncate">{appointment.nomeCidadao}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Horário</span>
                    </div>
                    <p className="text-sm font-bold text-slate-600">{appointment.hora}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Data</span>
                    </div>
                    <p className="text-sm font-bold text-slate-600">
                      {format(new Date(`${appointment.data}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <MapPin className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Serviço</span>
                  </div>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed italic line-clamp-1">{appointment.servico}</p>
                </div>
              </div>
            )}
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-8 flex flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0 border-none text-slate-500 font-bold hover:bg-slate-100 rounded-xl h-11 transition-all">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              className="flex-1 bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold rounded-xl h-11 shadow-md shadow-orange-100 gap-2 transition-all"
            >
              Confirmar Chegada
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
