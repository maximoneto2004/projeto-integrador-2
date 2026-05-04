import type { StatusOption } from "./types";
import type { Appointment } from "@/types/agenda";
import type { Situacao } from "@/types/api";

// Converte as situações do backend para os status exibidos na UI.
export const SITUACAO_PARA_STATUS: Record<Situacao, Appointment["status"]> = {
  AGENDADO: "Marcado",
  CANCELADO_CIDADAO: "Cancelado/Cidadão",
  CANCELADO_CRAS: "Cancelado/Cras",
  AUSENCIA_CIDADAO: "Ausente",
  ATIVADO: "Aguardando",
  ATENDIMENTO: "Atendimento",
  CHAMANDO: "Ativado - Aguardando Atendimento",
  ATIVADO_AUSENTE: "Não Compareceu",
  AGUARDANDO_FILA: "Aguardando fila",
  FINALIZADO: "Finalizado",
};
//faltando o finalizado

export const APPOINTMENT_STATUS_OPTIONS: StatusOption[] = [
  { value: "Marcado", label: "Marcado", colorClass: "bg-blue-100 text-blue-800" },
  { value: "Aguardando", label: "Aguardando", colorClass: "bg-amber-100 text-amber-800" },
  { value: "Aguardando fila", label: "Aguardando fila", colorClass: "bg-slate-200 text-slate-800" },
  { value: "Ativado - Aguardando Atendimento", label: "Chamado", colorClass: "bg-indigo-100 text-indigo-800" },
  { value: "Atendimento", label: "Em atendimento", colorClass: "bg-cyan-100 text-cyan-800" },
  { value: "Finalizado", label: "Finalizado", colorClass: "bg-green-100 text-green-800" },
  { value: "Cancelado/Cidadão", label: "Cancelado por Cidadão", colorClass: "bg-red-100 text-red-800" },
  { value: "Cancelado/Cras", label: "Cancelado por Cras", colorClass: "bg-red-100 text-red-800" },
  { value: "Ausente", label: "Ausente", colorClass: "bg-slate-100 text-slate-800" },
  { value: "Não Compareceu", label: "Não compareceu", colorClass: "bg-slate-200 text-slate-900" },
];

export const DEFAULT_APPOINTMENT_STATUS_COLOR = "bg-gray-500 text-gray-800";
