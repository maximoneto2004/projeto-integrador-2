import type { Appointment } from "@/types/agenda";
import { isProfissionalSaude } from "@/security/acess";

type ActionPermissions = {
  canCall: boolean;
  canEdit: boolean;
  canCancel: boolean;
  canConfirmArrival: boolean;
  canRegister: boolean;
  canAssume: boolean;
  canView: string;
};

type ActionUserContext = {
  userRole?: string;
  currentUserName?: string;
  currentUserId?: string;
};

type ActionRuleContext = {
  appointment: Appointment;
  permissions: ActionPermissions;
  user: ActionUserContext;
  podeExibirBotaoChamar: (a: Appointment) => boolean;
  isAgendamentoAssumidoPorMim: (a: Appointment) => boolean;
};

export type AppointmentActionVisibility = {
  showConfirmarChegada: boolean;
  showChamar: boolean;
  showRegistrarReceita: boolean;
  showRegistrarAtendimento: boolean;
  showDispensar: boolean;
  showFinalizarAtendimento: boolean;
  showServicosAtendimento: boolean;
  showRegistrarPosAtendimento: boolean;
  showAssumirAguardando: boolean;
  showAssumirEmAtendimento: boolean;
  showEditar: boolean;
  showExcluir: boolean;
  showVerDetalhes: boolean;
};

const STATUS_PERMITE_CHAMAR: Appointment["status"][] = ["Aguardando", "Ativado - Aguardando Atendimento"];

export function getAppointmentActionVisibility({
  appointment,
  permissions,
  user,
  podeExibirBotaoChamar,
  isAgendamentoAssumidoPorMim,
}: ActionRuleContext): AppointmentActionVisibility {
  const hasAssigned = !!(appointment.atendenteId || appointment.atendente);
  const isOwner =
    (!!appointment.atendenteId && appointment.atendenteId === user.currentUserId) ||
    (!!appointment.atendente && appointment.atendente === user.currentUserName);
  const canAct = !hasAssigned || isOwner;

  const isSupervisor = user.userRole === "supervisor";
  const isAtendente = isProfissionalSaude(user.userRole);
  // O Supervisor é o responsável pelo estoque: só atende serviços de dispensação de medicamentos.
  const supervisorPodeAtender = isSupervisor && !!appointment.envolveDispensacao;
  const podePrescrever = user.userRole === "medico" && !!appointment.geraReceita;

  return {
    showConfirmarChegada: permissions.canConfirmArrival && canAct && appointment.status === "Marcado",
    showChamar:
      canAct &&
      STATUS_PERMITE_CHAMAR.includes(appointment.status) &&
      (!isSupervisor || supervisorPodeAtender) &&
      (permissions.canCall || permissions.canAssume) &&
      podeExibirBotaoChamar(appointment),
    showRegistrarAtendimento:
      isAtendente && canAct && (appointment.status === "Atendimento" || appointment.status === "Finalizado"),
    showDispensar: supervisorPodeAtender && canAct && appointment.status === "Atendimento",
    showRegistrarReceita: podePrescrever && permissions.canRegister && appointment.status === "Atendimento" && canAct,
    showFinalizarAtendimento: permissions.canRegister && canAct && appointment.status === "Atendimento",
    showServicosAtendimento: isAtendente && appointment.status === "Finalizado",
    showRegistrarPosAtendimento:
      permissions.canRegister &&
      appointment.status === "Finalizado" &&
      (!appointment.registrosPosAtendimento || appointment.registrosPosAtendimento < 2),
    showAssumirAguardando:
      permissions.canAssume &&
      supervisorPodeAtender &&
      canAct &&
      appointment.status === "Aguardando" &&
      !isAgendamentoAssumidoPorMim(appointment),
    showAssumirEmAtendimento:
      permissions.canAssume &&
      supervisorPodeAtender &&
      appointment.status === "Atendimento" &&
      !isAgendamentoAssumidoPorMim(appointment),
    showEditar: permissions.canEdit && canAct && (appointment.status === "Marcado" || appointment.status === "Aguardando"),
    showExcluir: permissions.canCancel && canAct && (appointment.status === "Marcado" || appointment.status === "Aguardando"),
    showVerDetalhes: !!permissions.canView,
  };
}
