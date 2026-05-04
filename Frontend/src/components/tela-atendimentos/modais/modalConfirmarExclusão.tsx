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
import { AlertCircle, Calendar, Clock, User, Trash2 } from "lucide-react";
import type { Appointment } from "@/types/agenda";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ModalConfirmarExclusaoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  onConfirm: () => void;
}

const parseAppointmentDate = (value: string) => new Date(value.includes("T") ? value : `${value}T00:00:00`);

export function ModalConfirmarExclusao({
  open,
  onOpenChange,
  appointment,
  onConfirm,
}: ModalConfirmarExclusaoProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md border-none p-0 bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Barra de destaque superior laranja */}
        <div className="bg-[#f05a28] h-1.5 w-full" />

        <div className="p-8">
          <AlertDialogHeader className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="bg-red-50 p-3 rounded-2xl text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="text-left">
                <AlertDialogTitle className="text-xl font-bold text-slate-800">
                  Confirmar cancelamento
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-500">
                  Tem certeza que deseja cancelar este atendimento? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </div>
            </div>

            {appointment && (
              <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cidadão</p>
                    <p className="text-sm font-bold text-slate-700">{appointment.nomeCidadao || "Não informado"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600">
                      {format(parseAppointmentDate(appointment.data), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600">{appointment.hora}</span>
                  </div>
                </div>
                
                <div className="pt-2">
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Serviço</p>
                   <p className="text-xs font-medium text-slate-600">{appointment.servico}</p>
                </div>
              </div>
            )}
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-8 flex flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0 border-none text-slate-500 font-bold hover:bg-slate-100 rounded-xl h-11">
              Descartar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl h-11 shadow-md shadow-red-100 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
