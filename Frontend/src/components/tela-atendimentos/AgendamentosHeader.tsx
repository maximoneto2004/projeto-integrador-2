import { Calendar, Phone, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgendamentosHeaderProps {
  onChamarProximo?: () => void;
  onNovoAgendamento?: () => void;
  onAtualizar?: () => void;
  canCall?: boolean;
  canCreateAppointment?: boolean;
  callingNext?: boolean;
  atualizando?: boolean;
}

export function AgendamentosHeader({
  onChamarProximo,
  onNovoAgendamento,
  onAtualizar,
  canCall,
  canCreateAppointment,
  callingNext,
  atualizando,
}: AgendamentosHeaderProps) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Atendimentos</h1>
        <p className="text-muted-foreground">Gerencie os agendamentos e acompanhe o status em tempo real.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onAtualizar} disabled={atualizando}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>

        {canCall && (
          <Button onClick={onChamarProximo} className="gap-2" size="lg" disabled={callingNext}>
            <Phone className="h-4 w-4" />
            {callingNext ? "Chamando..." : "Chamar Pr\u00f3ximo Fila"}
          </Button>
        )}

        {canCreateAppointment && (
          <Button onClick={onNovoAgendamento} className="gap-2" size="lg">
            <Calendar className="h-4 w-4" />
            Novo Agendamento
          </Button>
        )}
      </div>
    </div>
  );
}
