import type { Appointment } from "@/types/agenda";

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
  showFinalizarAtendimento: boolean;
  showServicosAtendimento: boolean;
  showFichaAtendimento: boolean;
  showEncaminhamento: boolean;
  showRegistrarPosAtendimento: boolean;
  showAssumirAguardando: boolean;
  showAssumirEmAtendimento: boolean;
  showEditar: boolean;
  showExcluir: boolean;
  showVerDetalhes: boolean;
};

const normalize = (value?: string) =>
  typeof value === "string"
    ? value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
    : "";

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
  const isAtendente = user.userRole === "atendente" || user.userRole === "atendente 156";
  const tipoServicoNormalizado = normalize(appointment.tipoServicoNome || appointment.tipoAtendimento || "");
  const isEspecializado = tipoServicoNormalizado.includes("especializado");
  const isComum = tipoServicoNormalizado.includes("comum");
  const atendenteEspecializado = isAtendente && isEspecializado;

  return {
    showConfirmarChegada: permissions.canConfirmArrival && canAct && appointment.status === "Marcado",
    showChamar:
      canAct &&
      STATUS_PERMITE_CHAMAR.includes(appointment.status) &&
      (!isSupervisor || isComum) &&
      (permissions.canCall || permissions.canAssume) &&
      podeExibirBotaoChamar(appointment),
    showRegistrarReceita: atendenteEspecializado && permissions.canRegister && appointment.status === "Atendimento" && canAct,
    showFinalizarAtendimento: permissions.canRegister && canAct && appointment.status === "Atendimento",
    showServicosAtendimento: isAtendente && appointment.status === "Finalizado",
    showFichaAtendimento:
      isAtendente &&
      isEspecializado &&
      permissions.canRegister &&
      ["Atendimento", "Finalizado", "Atendido"].includes(appointment.status),
    showEncaminhamento: permissions.canRegister && ["Atendimento", "Finalizado"].includes(appointment.status),
    showRegistrarPosAtendimento:
      permissions.canRegister &&
      appointment.status === "Finalizado" &&
      (!appointment.registrosPosAtendimento || appointment.registrosPosAtendimento < 2),
    showAssumirAguardando:
      permissions.canAssume &&
      isSupervisor &&
      isComum &&
      canAct &&
      appointment.status === "Aguardando" &&
      !isAgendamentoAssumidoPorMim(appointment),
    showAssumirEmAtendimento:
      permissions.canAssume &&
      isSupervisor &&
      isComum &&
      appointment.status === "Atendimento" &&
      !isAgendamentoAssumidoPorMim(appointment),
    showEditar: permissions.canEdit && canAct && (appointment.status === "Marcado" || appointment.status === "Aguardando"),
    showExcluir: permissions.canCancel && canAct && (appointment.status === "Marcado" || appointment.status === "Aguardando"),
    showVerDetalhes: !!permissions.canView,
  };
}
