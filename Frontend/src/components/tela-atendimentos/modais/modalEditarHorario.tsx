import type { Appointment } from "@/types/agenda";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ModalEditarHorarioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  novaData: string;
  novoServico: string;
  novoHorario: string;
  servicosDisponiveis: string[];
  horariosDisponiveis: string[];
  onChangeNovaData: (value: string) => void;
  onChangeNovoServico: (value: string) => void;
  onChangeNovoHorario: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const parseAppointmentDate = (value: string) => new Date(value.includes("T") ? value : `${value}T00:00:00`);

export function ModalEditarHorario({
  open,
  onOpenChange,
  appointment,
  novaData,
  novoServico,
  novoHorario,
  servicosDisponiveis,
  horariosDisponiveis,
  onChangeNovaData,
  onChangeNovoServico,
  onChangeNovoHorario,
  onSave,
  onCancel,
}: ModalEditarHorarioProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Horário do Agendamento</DialogTitle>
        </DialogHeader>
        {appointment && (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <p>
                <strong>Serviço:</strong> {appointment.servico}
              </p>
              <p>
                <strong>Data:</strong> {format(parseAppointmentDate(appointment.data), "dd/MM/yyyy", { locale: ptBR })}
              </p>
              <p>
                <strong>Horário Atual:</strong> {appointment.hora}
              </p>
            </div>

            <div>
              <Label htmlFor="novaData">Nova Data *</Label>
              <Input id="novaData" type="date" value={novaData} onChange={(e) => onChangeNovaData(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="novoServico">Novo Serviço *</Label>
              <Select value={novoServico} onValueChange={onChangeNovoServico}>
                <SelectTrigger id="novoServico">
                  <SelectValue placeholder="Selecione o novo serviço" />
                </SelectTrigger>
                <SelectContent>
                  {servicosDisponiveis.map((servico) => (
                    <SelectItem key={servico} value={servico}>
                      {servico}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="novoHorario">Novo Horário *</Label>
              <Select value={novoHorario} onValueChange={onChangeNovoHorario}>
                <SelectTrigger id="novoHorario">
                  <SelectValue placeholder="Selecione o novo horário" />
                </SelectTrigger>
                <SelectContent>
                  {horariosDisponiveis.map((horario) => (
                    <SelectItem key={horario} value={horario}>
                      {horario}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={onSave} className="flex-1">
                <Calendar className="h-4 w-4 mr-1" />
                Salvar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
