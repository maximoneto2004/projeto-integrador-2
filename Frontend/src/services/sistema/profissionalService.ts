import { api } from "@/services/api";
import type { UsuarioApi, Cargo } from "@/types/professional";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

type PaginatedApiResponse<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: {
    success?: boolean;
    data?: T[];
  } | T[];
};

export type UsuariosPaginados = {
  items: UsuarioApi[];
  count: number;
  next: string | null;
  previous: string | null;
};

const ALLOWED_ROLES = new Set(["atendente", "recepcionista", "supervisor", "coordenador"]);

function getUserRole(user: any): string {
  if (typeof user?.cargo === "string") {
    return user.cargo;
  }

  const groups = user?.groups;
  if (Array.isArray(groups)) {
    for (const group of groups) {
      if (typeof group === "string") {
        return group;
      }
      if (group && typeof group.name === "string") {
        return group.name;
      }
    }
  }

  return "";
}

function isAllowedProfessional(user: any) {
  const role = getUserRole(user).trim().toLowerCase();
  return ALLOWED_ROLES.has(role);
}

const extractUsuarios = (payload: unknown): UsuarioApi[] => {
  if (!payload || typeof payload !== "object") return [];

  const body = payload as Record<string, unknown>;
  const bodyData = body.data;
  if (Array.isArray(bodyData)) {
    return bodyData as UsuarioApi[];
  }

  const results = body.results;
  if (Array.isArray(results)) {
    return results as UsuarioApi[];
  }

  if (results && typeof results === "object") {
    const nested = results as Record<string, unknown>;
    if (Array.isArray(nested.data)) {
      return nested.data as UsuarioApi[];
    }
  }

  return [];
};

export const usuarioService = {
  async listar(params?: Record<string, string | undefined>): Promise<UsuarioApi[]> {
    const res = await api.get<ApiResponse<UsuarioApi[]> | PaginatedApiResponse<UsuarioApi>>("/usuarios/", { params });
    const data = extractUsuarios(res.data);
    return data.filter(isAllowedProfessional);
  },

  async listarPaginado(params?: Record<string, string | undefined>): Promise<UsuariosPaginados> {
    const res = await api.get<ApiResponse<UsuarioApi[]> | PaginatedApiResponse<UsuarioApi>>("/usuarios/", { params });
    const items = extractUsuarios(res.data).filter(isAllowedProfessional);

    const body = (res.data && typeof res.data === "object" ? (res.data as Record<string, unknown>) : {}) as Record<string, unknown>;
    const countRaw = typeof body.count === "number" ? body.count : items.length;

    return {
      items,
      count: countRaw,
      next: typeof body.next === "string" ? body.next : null,
      previous: typeof body.previous === "string" ? body.previous : null,
    };
  },

  criar(payload: any) {
    return api.post<{ success: boolean; data: any }>("/usuarios/", payload).then((res) => res.data.data);
  },

  atualizar(id: string, payload: any) {
    return api.patch(`/usuarios/${id}/`, payload);
  },

  ativar(id: string) {
    return api.patch(`/usuarios/${id}/`, { is_active: true });
  },

  desativar(id: string) {
    return api.patch(`/usuarios/${id}/`, { is_active: false });
  },
  listarCargos(params?: Record<string, string | undefined>) {
    return api.get<ApiResponse<Cargo[]>>("/usuarios/groups/", { params }).then((res) => res.data.data);
  },
};
