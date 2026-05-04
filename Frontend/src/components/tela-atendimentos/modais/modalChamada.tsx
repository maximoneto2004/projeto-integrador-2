import type { Appointment } from "@/types/agenda";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { User, Phone, Fingerprint, Stethoscope, MapPin, Clock, UserX, PlayCircle, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCpf } from "@/utils/cpfFormater";
interface ModalChamadaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  onIniciarAtendimento: () => void;
  onNaoCompareceu: () => void;
}

export function ModalChamada({ open, onOpenChange, appointment, onIniciarAtendimento, onNaoCompareceu }: ModalChamadaProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-none p-0 bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Barra de destaque superior laranja */}
        <div className="bg-[#f05a28] h-1.5 w-full flex-shrink-0" />

        <div className="p-8">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4 text-left">
              <div className="bg-orange-100 p-3 rounded-2xl text-[#f05a28]">
                <Megaphone className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-slate-800">Chamada de Atendimento</DialogTitle>
                <p className="text-sm text-slate-500">Confirme a presença para iniciar</p>
              </div>
            </div>
          </DialogHeader>

          {appointment && (
            <div className="space-y-6">
              {/* PAINEL DE NOME EM DESTAQUE */}
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl text-center space-y-1">
                <p className="text-[10px] font-black uppercase text-[#f05a28] tracking-[0.2em]">Cidadão Chamado</p>
                <p className="text-3xl font-black text-slate-800 break-words">{appointment.nomeCidadao}</p>
              </div>

              {/* GRID DE INFO RÁPIDA */}
              <div className="grid grid-cols-2 gap-6">
                <InfoItem icon={<Fingerprint className="w-3.5 h-3.5" />} label="CPF" value={formatCpf(appointment.cpfCidadao)} />
                <InfoItem icon={<Phone className="w-3.5 h-3.5" />} label="Telefone" value={appointment.telefoneCidadao || "Não informado"} />
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div className="flex items-start gap-3">
                  <div className="mt-1 bg-slate-100 p-2 rounded-lg text-slate-500">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Serviço</Label>
                    <p className="text-sm font-bold text-slate-700">{appointment.servico}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pl-11">
                  <div>
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Local</Label>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <MapPin className="w-3 h-3" />
                      <p className="text-xs font-semibold">{appointment.unidade}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Horário</Label>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Clock className="w-3 h-3" />
                      <p className="text-xs font-semibold">{appointment.hora}</p>
                    </div>
                  </div>
                </div>
              </div>

              {appointment.observacoes && (
                <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl">
                  <Label className="text-[10px] font-black uppercase text-amber-600 tracking-widest block mb-1">Observações</Label>
                  <p className="text-xs text-amber-800 leading-relaxed italic">"{appointment.observacoes}"</p>
                </div>
              )}

              {/* AÇÕES FIXAS NO FOOTER DO CONTEÚDO */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={onNaoCompareceu}
                  variant="outline"
                  className="flex-1 h-12 border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold rounded-xl gap-2 transition-all order-2 sm:order-1"
                >
                  <UserX className="h-4 w-4" />
                  Não Compareceu
                </Button>

                <Button
                  onClick={onIniciarAtendimento}
                  className="flex-1 h-12 bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold rounded-xl shadow-lg shadow-orange-100 gap-2 transition-all order-1 sm:order-2"
                >
                  <PlayCircle className="h-5 w-5" />
                  Iniciar Atendimento
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-slate-400">
        <span className="text-[#f05a28]/70">{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-sm font-bold text-slate-700">{value || "-"}</p>
    </div>
  );
}
