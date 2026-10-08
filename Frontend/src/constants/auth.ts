import type { UserRole } from "@/types/auth";
import type { StatusOption } from "./types";

export const USER_ROLE_OPTIONS: (StatusOption & { value: UserRole })[] = [
  { value: "admin", label: "Admin", colorClass: "bg-purple-100 text-purple-800" },
  { value: "gestor", label: "Gestor", colorClass: "bg-emerald-100 text-emerald-800" },
  { value: "supervisor", label: "Supervisor", colorClass: "bg-amber-100 text-amber-800" },
  { value: "recepcionista", label: "Recepcionista", colorClass: "bg-blue-100 text-blue-800" },
  { value: "medico", label: "Médico", colorClass: "bg-teal-100 text-teal-800" },
  { value: "enfermeiro", label: "Enfermeiro", colorClass: "bg-indigo-100 text-indigo-800" },
  { value: "farmaceutico", label: "Farmacêutico", colorClass: "bg-lime-100 text-lime-800" },
];

export const DEFAULT_ROLE_COLOR = "bg-gray-100 text-gray-800";
