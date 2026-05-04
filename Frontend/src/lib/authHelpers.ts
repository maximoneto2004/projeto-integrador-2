import type { AuthUser } from "@/types/api";
import type { UserRole } from "@/types/auth";
import type { Guiche } from "@/types/api";

// Mapear nomes de grupos do backend para os roles usados no front
const GROUP_ROLE_MAP: Record<string, UserRole> = {
  admin: "admin",
  administrador: "admin",
  gestor: "gestor",
  supervisor: "supervisor",
  recepcionista: "recepcionista",
  atendente: "atendente",
  "atendente 156": "atendente 156",
  "atendente do 156": "atendente 156",
  coordenador: "coordenador",
};

const DEFAULT_REDIRECT_BY_ROLE: Record<UserRole, string> = {
  admin: "/sistema/administrador/unidades",
  gestor: "/sistema/dashboard-gestor",
  supervisor: "/sistema/dashboard",
  atendente: "/sistema/agendamentos",
  "atendente 156": "/sistema/agendamentos",
  recepcionista: "/sistema/agendamentos",
  coordenador: "/sistema/dashboard",
};

export function getDefaultRouteByRole(role?: UserRole): string {
  if (!role) return "/sistema/agendamentos";
  return DEFAULT_REDIRECT_BY_ROLE[role] || "/sistema/agendamentos";
}

export function deriveRoleFromGroups(grupos?: AuthUser["grupos"]): UserRole | undefined {
  if (!grupos?.length) return undefined;
  const normalized = grupos.map((g) => g.trim().toLowerCase());
  const match = normalized.find((g) => GROUP_ROLE_MAP[g]);
  return match ? GROUP_ROLE_MAP[match] : undefined;
}

const MESA_KEY = "cras_mesa_guiche";

export type MesaGuiche = { nome: string; ocupado?: boolean };

export function getMesaFromStorage(): MesaGuiche | undefined {
  const raw = localStorage.getItem(MESA_KEY);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as Guiche & { ocupado?: boolean; guiche?: Guiche & { ocupado?: boolean } };
    const nome = parsed?.nome || parsed?.guiche?.nome;
    const ocupado =
      typeof parsed?.ocupado === "boolean" ? parsed.ocupado : typeof parsed?.guiche?.ocupado === "boolean" ? parsed.guiche.ocupado : undefined;

    if (nome) {
      const mesa = ocupado === undefined ? { nome } : { nome, ocupado };
      if ((parsed as any)?.id || (parsed as any)?.unidade || (parsed as any)?.guiche) {
        setMesaInStorage(mesa);
      }
      return mesa;
    }
  } catch (err) {
    // fallback handled below
  }

  // suporte a valor string legado
  return { nome: raw };
}

export function setMesaInStorage(mesa: MesaGuiche) {
  const payload = typeof mesa.ocupado === "boolean" ? { nome: mesa.nome, ocupado: mesa.ocupado } : { nome: mesa.nome };
  localStorage.setItem(MESA_KEY, JSON.stringify(payload));
}

export function clearMesaInStorage() {
  localStorage.removeItem(MESA_KEY);
}
