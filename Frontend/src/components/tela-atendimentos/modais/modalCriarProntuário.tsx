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
import type { Appointment } from "@/types/agenda";
import { FilePlus, User, IdCard, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useProntuario } from "@/hooks/prontuario/useProntuario";
import { toast } from "@/lib/sonner";
import { getApiErrorMessage } from "@/lib/notifications";
import { cidadaoService } from "@/services/sistema/cidadaoService";
import { pessoaReferenciaService } from "@/services/prontuario/pessoaReferenciaService";

interface ModalCriarProntuarioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  onConfirm: (prontuarioId?: string) => void;
}

const parseAppointmentDate = (value: string) => new Date(value.includes("T") ? value : `${value}T00:00:00`);

export function ModalCriarProntuario({ open, onOpenChange, appointment, onConfirm }: ModalCriarProntuarioProps) {
  const { user } = useAuth();
  const { mutateAsync: criarProntuario, isPending } = useProntuario();

  const normalizeCpf = (value?: string) => (value ? value.replace(/\D/g, "") : "");

  const extractProntuarioId = (payload: unknown) => {
    if (!payload || typeof payload !== "object") return null;
    const data = "result" in payload ? (payload as { result?: unknown }).result : payload;
    if (!data || typeof data !== "object") return null;
    const id = (data as { id?: string | number }).id;
    return id ? String(id) : null;
  };

  const handleConfirm = async () => {
    const unidadeId = user?.unidade_ativa?.id;
    if (!unidadeId) {
      toast.error("Unidade do atendente não encontrada.");
      return;
    }

    try {
      const criado = await criarProntuario({ unidade_inicial: unidadeId });
      const prontuarioId = extractProntuarioId(criado);
      if (!prontuarioId) {
        toast.error("Prontuário criado, mas não foi possível identificar o ID.");
        return;
      }

      const cpf = normalizeCpf(appointment?.cpfCidadao);
      if (!cpf) {
        toast.error("CPF do cidadão não encontrado no agendamento.");
        return;
      }

      const { data } = await cidadaoService.listar({ cpf, limit: 1 });
      const lista = Array.isArray(data) ? data : (data?.results ?? []);
      const cidadaoId = lista[0]?.id ? String(lista[0].id) : "";
      if (!cidadaoId) {
        toast.error("Prontuário criado, mas não foi possível localizar o cidadão pelo CPF.");
        return;
      }

      await pessoaReferenciaService.criar({
        prontuario: prontuarioId,
        pessoa_referencia: cidadaoId,
      });

      try {
        if (cpf) {
          localStorage.setItem(`prontuarioIdByCpf:${cpf}`, prontuarioId);
        }
      } catch {
        // ignore storage failures
      }

      toast.success("Prontuário criado e pessoa de referência vinculada.");
      onConfirm(prontuarioId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível criar o prontuário."));
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md border-none p-0 bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-[#f05a28] h-1.5 w-full" />

        <div className="p-8">
          <AlertDialogHeader className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                <FilePlus className="h-6 w-6" />
              </div>
              <div className="text-left">
                <AlertDialogTitle className="text-xl font-bold text-slate-800">Criar prontuário</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-500">
                  Você deseja iniciar o acompanhamento desse cidadão e criar um prontuário?
                </AlertDialogDescription>
              </div>
            </div>

            {appointment && (
              <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-[#f05a28] shadow-sm">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cidadãoo</p>
                    <p className="text-base font-bold text-slate-700 truncate">{appointment.nomeCidadao || "-"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <IdCard className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">CPF</span>
                    </div>
                    <p className="text-sm font-bold text-slate-600">{appointment.cpfCidadao || "-"}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Horário</span>
                    </div>
                    <p className="text-sm font-bold text-slate-600">{appointment.hora || "-"}</p>
                  </div>
                </div>

                <div className="pt-1">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Data</span>
                  </div>
                  <p className="text-sm font-bold text-slate-600">
                    {appointment.data ? format(parseAppointmentDate(appointment.data), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                  </p>
                </div>
              </div>
            )}
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-8 flex flex-row gap-3">
            <AlertDialogCancel className="flex-1 mt-0 border-none text-slate-500 font-bold hover:bg-slate-100 rounded-xl h-11 transition-all">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isPending}
              className="flex-1 bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold rounded-xl h-11 shadow-md shadow-orange-100 gap-2 transition-all"
            >
              {isPending ? "Criando..." : "Criar prontuário"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
