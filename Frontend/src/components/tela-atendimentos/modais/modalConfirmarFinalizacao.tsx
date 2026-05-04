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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ModalConfirmarFinalizacaoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  onConfirm: () => void;
}

export function ModalConfirmarFinalizacao({ open, onOpenChange, appointment, onConfirm }: ModalConfirmarFinalizacaoProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
      }}
    >
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Finalizar atendimento</AlertDialogTitle>

          <AlertDialogDescription>
            Você quer finalizar esse atendimento?
            <br />
            <strong>O status será alterado para Finalizado.</strong>
            {appointment && (
              <div className="mt-3 bg-muted/30 p-3 rounded-lg text-sm text-foreground space-y-1">
                <p>
                  <strong>Nome:</strong> {appointment.nomeCidadao || "-"}
                </p>
                <p>
                  <strong>Serviço:</strong> {appointment.servico}
                </p>
                <p>
                  <strong>Horário:</strong> {appointment.hora}
                </p>
                <p>
                  <strong>Data:</strong>{" "}
                  {format(new Date(`${appointment.data}T00:00:00`), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>

          <AlertDialogAction onClick={onConfirm}>Finalizar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
