import type { Appointment } from "@/types/agenda";
import { Eye, Edit, Phone, UserCheck, FileText, CircleX, ClipboardList, CheckCircle2, ReceiptText } from "lucide-react";
import { getAppointmentActionVisibility } from "./appointmentActionRules";
import { useAuth } from "@/contexts/AuthContext";

interface TabelaAtendimentosProps {
  appointments: Appointment[];

  // Permissões
  canCall: boolean;
  canEdit: boolean;
  canCancel: boolean;
  canConfirmArrival: boolean;
  canRegister: boolean;
  canAssume: boolean;
  canView: string;

  currentUserName: string | undefined;
  currentUserId: string | undefined;
  userRole: string | undefined;
  isAgendamentoAssumidoPorMim: (a: Appointment) => boolean;

  // Callbacks
  onVisualizar: (a: Appointment) => void;
  onConfirmarChegada: (a: Appointment) => void;
  onChamar: (a: Appointment) => void;
  onExcluir: (a: Appointment) => void;
  onEditar: (a: Appointment) => void;
  onRegistrarReceita: (a: Appointment) => void;
  onAssumir: (a: Appointment) => void;
  onFinalizar: (a: Appointment) => void;
  onAbrirFicha: (a: Appointment) => void;
  onAbrirEncaminhamento: (a: Appointment) => void;
  onAbrirServicos: (a: Appointment) => void;

  podeExibirBotaoChamar: (a: Appointment) => boolean;

  renderStatusBadge: (status: string) => JSX.Element;

  ordemHorario: "asc" | "desc" | null;
  onOrdenarHorario: () => void;
}

export function TabelaAtendimentos({
  appointments,
  canCall,
  canEdit,
  canCancel,
  canConfirmArrival,
  canRegister,
  canAssume,
  canView,
  currentUserName,
  currentUserId,
  userRole,
  isAgendamentoAssumidoPorMim,
  onVisualizar,
  onConfirmarChegada,
  onChamar,
  onEditar,
  onExcluir,
  onRegistrarReceita,
  onAssumir,
  onFinalizar,
  onAbrirFicha,
  onAbrirEncaminhamento,
  onAbrirServicos,
  podeExibirBotaoChamar,
  renderStatusBadge,
  ordemHorario,
  onOrdenarHorario,
}: TabelaAtendimentosProps) {
  const { user } = useAuth();
  const isSupervisor = user.grupos.includes("Supervisor");

  return (
    <div className="bg-card rounded-2xl shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary">
            <tr>
              <th className="px-6 py-4 text-left font-bold text-foreground">Cidadão</th>
              <th className="px-6 py-4 text-left font-bold text-foreground">Serviço</th>
              <th className="px-6 py-4 text-left font-bold text-foreground">
                Horário
                {/* <button type="button" className="inline-flex items-center gap-1 hover:text-foreground/80" onClick={onOrdenarHorario}>
                  Horário
                  <span className="text-xs text-muted-foreground">{ordemHorario === "asc" ? "v" : ordemHorario === "desc" ? "^" : "-"}</span>
                </button> */}
              </th>
              <th className="px-6 py-4 text-left font-bold text-foreground">Atendente</th>
              <th className="px-6 py-4 text-left font-bold text-foreground">Status</th>
              <th className="px-6 py-4 text-left font-bold text-foreground">Ações</th>
            </tr>
          </thead>

          <tbody>
            {appointments.map((appointment, index) => {
              const actions = getAppointmentActionVisibility({
                appointment,
                permissions: {
                  canCall,
                  canEdit,
                  canCancel,
                  canConfirmArrival,
                  canRegister,
                  canAssume,
                  canView,
                },
                user: {
                  userRole,
                  currentUserName,
                  currentUserId,
                },
                podeExibirBotaoChamar,
                isAgendamentoAssumidoPorMim,
              });
              const showChamarSupervisor =
                !isSupervisor ||
                appointment.status === "Ativado - Aguardando Atendimento" ||
                String(appointment.status).trim().toLowerCase() === "chamando";

              return (
                <tr key={appointment.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                  <td className="px-6 py-4 text-foreground">{appointment.nomeCidadao || "-"}</td>
                  <td className="px-6 py-4 text-foreground">{appointment.servico}</td>
                  <td className="px-6 py-4 text-foreground">{appointment.hora}</td>
                  <td className="px-6 py-4 text-foreground">{appointment.atendente || "-"}</td>

                  <td className="px-6 py-4 whitespace-nowrap">{renderStatusBadge(appointment.status)}</td>

                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {actions.showConfirmarChegada && (
                        <button
                          className="p-2 hover:bg-green-100 rounded-full"
                          title="Confirmar Chegada"
                          onClick={() => onConfirmarChegada(appointment)}
                        >
                          <UserCheck className="w-5 h-5 text-green-700" />
                        </button>
                      )}

                      {actions.showChamar && showChamarSupervisor && (
                        <button
                          className="p-2 rounded-full hover:bg-green-500/10 transition-colors"
                          title="Chamar"
                          onClick={() => onChamar(appointment)}
                        >
                          <Phone className="w-5 h-5 text-green-600" />
                        </button>
                      )}

                      {actions.showRegistrarReceita && (
                        <button
                          className="p-2 hover:bg-indigo-100 rounded-full"
                          title="Registrar receita"
                          onClick={() => onRegistrarReceita(appointment)}
                        >
                          <ReceiptText className="w-5 h-5 text-indigo-700" />
                        </button>
                      )}

                      {actions.showServicosAtendimento && (
                        <button
                          className="p-2 hover:bg-sky-100 rounded-full"
                          title="Serviços do Atendimento"
                          onClick={() => onAbrirServicos(appointment)}
                        >
                          <ClipboardList className="w-5 h-5 text-sky-700" />
                        </button>
                      )}

                      {/* {actions.showFichaAtendimento && (
                        <button
                          className="p-2 hover:bg-blue-50 rounded-full"
                          title="Ficha de atendimento"
                          onClick={() => onAbrirFicha(appointment)}
                        >
                          <ClipboardList className="w-5 h-5 text-sky-700" />
                        </button>
                      )} */}

                      {actions.showEncaminhamento && (
                        <button
                          className="p-2 hover:bg-amber-50 rounded-full"
                          title="Encaminhamento"
                          onClick={() => onAbrirEncaminhamento(appointment)}
                        >
                          <FileText className="w-5 h-5 text-amber-700" />
                        </button>
                      )}

                      {actions.showFinalizarAtendimento && (
                        <button
                          className="p-2 hover:bg-emerald-100 rounded-full"
                          title="Finalizar Atendimento"
                          onClick={() => onFinalizar(appointment)}
                        >
                          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                        </button>
                      )}

                      {/* {actions.showRegistrarPosAtendimento && (
                        <button
                          className="p-2 hover:bg-green-100 rounded-full"
                          title="Registrar Pos Atendimento"
                          onClick={() => onRegistrar(appointment)}
                        >
                          <Save className="w-5 h-5 text-green-700" />
                        </button>
                      )} */}

                      {actions.showAssumirAguardando && (
                        <button className="p-2 hover:bg-blue-100 rounded-full" title="Assumir Atendimento" onClick={() => onAssumir(appointment)}>
                          <UserCheck className="w-5 h-5 text-blue-600" />
                        </button>
                      )}

                      {actions.showAssumirEmAtendimento && (
                        <button className="p-2 hover:bg-blue-100 rounded-full" title="Assumir Atendimento" onClick={() => onAssumir(appointment)}>
                          <UserCheck className="w-5 h-5 text-blue-600" />
                        </button>
                      )}

                      {actions.showEditar && (
                        <button className="p-2 hover:bg-muted rounded-full" title="Editar" onClick={() => onEditar(appointment)}>
                          <Edit className="w-5 h-5 text-muted-foreground" />
                        </button>
                      )}

                      {actions.showExcluir && (
                        <button className="p-2 hover:bg-muted rounded-full" title="Excluir" onClick={() => onExcluir(appointment)}>
                          <CircleX className="w-5 h-5 text-destructive" />
                        </button>
                      )}

                      {actions.showVerDetalhes && (
                        <button className="p-2 hover:bg-muted rounded-full" title="Ver detalhes" onClick={() => onVisualizar(appointment)}>
                          <Eye className="w-5 h-5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
