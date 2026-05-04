import type { StatusOption } from "./types";

export const PRIORITY_STATUS_OPTIONS: StatusOption[] = [
  { value: "Normal", label: "Normal", colorClass: "bg-blue-100 text-blue-800" },
  { value: "Preferêncial", label: "Preferêncial", colorClass: "bg-amber-100 text-amber-800" },
  { value: "Preferêncial 80+", label: "Preferêncial 80+", colorClass: "bg-indigo-100 text-indigo-800" },
  { value: "Em Atendimento", label: "Em atendimento", colorClass: "bg-cyan-100 text-cyan-800" },
];

export const DEFAULT_PRIORITY_STATUS_COLOR = "bg-gray-100 text-gray-800";