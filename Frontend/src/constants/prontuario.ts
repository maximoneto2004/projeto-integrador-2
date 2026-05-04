import type { StatusOption } from "./types";

export const SERVICO_ATENDIMENTO_STATUS: StatusOption[] = [
  { value: "Realizado", label: "Realizado", colorClass: "bg-green-100 text-green-800" },
  { value: "Não Realizado - Pré-requisito", label: "Não realizado (pré-requisito)", colorClass: "bg-amber-100 text-amber-800" },
  { value: "Não Realizado - Recusa do Cidadão", label: "Não realizado (recusa)", colorClass: "bg-orange-100 text-orange-800" },
  { value: "Não Realizado - Indisponibilidade de Recurso", label: "Não realizado (recurso)", colorClass: "bg-red-100 text-red-800" },
  { value: "Cancelado", label: "Cancelado", colorClass: "bg-slate-100 text-slate-800" },
];

export const DEFAULT_SERVICO_STATUS_COLOR = "bg-gray-100 text-gray-800";
