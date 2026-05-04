import type { Appointment } from "@/types/agenda";
import type { Guiche } from "@/types/api";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { UserCheck, Layout, User, Stethoscope, Clock } from "lucide-react";

interface ModalAssumirAtendimentoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  guicheAssumir: string;
  guichesDisponiveis: Guiche[];
  onChangeGuiche: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ModalAssumirAtendimento({
  open,
  onOpenChange,
  appointment,
  guicheAssumir,
  guichesDisponiveis,
  onChangeGuiche,
  onConfirm,
  onCancel,
}: ModalAssumirAtendimentoProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-none p-0 bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Barra de destaque superior laranja */}
        <div className="bg-[#f05a28] h-1.5 w-full flex-shrink-0" />

        <div className="p-8">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4 text-left">
              <div className="bg-orange-100 p-3 rounded-2xl text-[#f05a28]">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-800">
                  Assumir Atendimento
                </DialogTitle>
                <p className="text-sm text-slate-500">Defina seu local de atendimento</p>
              </div>
            </div>
          </DialogHeader>

          {appointment && (
            <div className="space-y-6">
              {/* RESUMO DO ATENDIMENTO - CARD ESTILIZADO */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg border border-slate-100 text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cidadão</p>
                    <p className="text-sm font-bold text-slate-700">{appointment.nomeCidadao}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Stethoscope className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Serviço</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-600 truncate">{appointment.servico}</p>
                  </div>
                  <div className="space-y-1 border-l pl-4 border-slate-200/60">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Horário</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-600">{appointment.hora}</p>
                  </div>
                </div>
              </div>

              {/* SELEÇÃO DE GUICHÊ */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 ml-1">
                  <Layout className="w-4 h-4 text-[#f05a28]" />
                  <Label htmlFor="guicheAssumir" className="text-xs font-bold text-slate-600 uppercase tracking-tight">
                    Selecionar Guichê ou Mesa *
                  </Label>
                </div>
                <Select value={guicheAssumir} onValueChange={onChangeGuiche}>
                  <SelectTrigger 
                    id="guicheAssumir" 
                    className="h-12 rounded-xl border-slate-200 bg-white focus:ring-[#f05a28] focus:border-[#f05a28] shadow-sm"
                  >
                    <SelectValue placeholder="Onde você irá atender?" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                    {guichesDisponiveis
                      .filter((guiche) => !guiche.ocupado)
                      .map((guiche) => (
                        <SelectItem key={guiche.id} value={guiche.id} className="py-3">
                          {guiche.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {!guichesDisponiveis.some(g => !g.ocupado) && (
                  <p className="text-[10px] text-red-500 font-medium ml-1 italic">
                    * Todos os guichês parecem estar ocupados no momento.
                  </p>
                )}
              </div>

              {/* AÇÕES NO FOOTER */}
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="ghost" 
                  onClick={onCancel} 
                  className="flex-1 h-12 text-slate-500 font-bold rounded-xl hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={onConfirm} 
                  disabled={!guicheAssumir}
                  className="flex-1 h-12 bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold rounded-xl shadow-lg shadow-orange-100 transition-all disabled:opacity-50"
                >
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
