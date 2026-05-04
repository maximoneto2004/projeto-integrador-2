import type { Appointment } from "@/types/agenda";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";

interface ModalRegistrarPosAtendimentoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  horaInicioReal: string;
  horaFimReal: string;
  observacoes: string;
  onHoraInicioChange: (value: string) => void;
  onHoraFimChange: (value: string) => void;
  onObservacoesChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ModalRegistrarPosAtendimento({
  open,
  onOpenChange,
  appointment,
  horaInicioReal,
  horaFimReal,
  observacoes,
  onHoraInicioChange,
  onHoraFimChange,
  onObservacoesChange,
  onSubmit,
  onCancel,
}: ModalRegistrarPosAtendimentoProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Atendimento</DialogTitle>
        </DialogHeader>
        {appointment && (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
              <p>
                <strong>Horário:</strong> {appointment.hora}
              </p>
              <p>
                <strong>Serviço:</strong> {appointment.servico}
              </p>
              <p>
                <strong>Categoria:</strong> {appointment.categoria}
              </p>
              <p>
                <strong>Status:</strong> {appointment.status}
              </p>
              <p>
                <strong>Nome:</strong> {appointment.nomeCidadao}
              </p>
            </div>

            {/* <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="horaInicioReal">Hora Início Real *</Label>
                <Input
                  id="horaInicioReal"
                  type="time"
                  value={horaInicioReal}
                  onChange={(e) => onHoraInicioChange(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="horaFimReal">Hora Fim Real *</Label>
                <Input
                  id="horaFimReal"
                  type="time"
                  value={horaFimReal}
                  onChange={(e) => onHoraFimChange(e.target.value)}
                />
              </div>
            </div> */}

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => onObservacoesChange(e.target.value)}
                placeholder="Registre informações relevantes sobre o atendimento..."
                rows={4}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={onSubmit} className="flex-1">
                <Save className="h-4 w-4 mr-1" />
                Registrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
