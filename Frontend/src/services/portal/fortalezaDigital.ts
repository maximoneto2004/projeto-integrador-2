import type { AgendamentoRequest, AgendamentoResponse } from "@/types/api";

export type FortalezaDigitalIdentity = Record<string, unknown> | null;

export type FortalezaDigitalPerfil = {
  nome?: string;
  cpf?: string;
  name?: string;
  preferred_username?: string;
  email_preferencial?: string;
  email?: string;
  phone_number?: string;
  contatos?: Array<{
    nome?: string;
    tipo_contato?: { apelido?: string };
  }>;
  enderecos?: Array<{
    logradouro?: string;
    numero?: string;
    bairro?: string;
    complemento?: string;
    cep?: string;
  }>;
  [key: string]: unknown;
} | null;

export type FortalezaDigitalCadastro = {
  nome?: string | null;
  cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  complemento?: string | null;
  cep?: string | null;
};

export type PortalApiResult<T = unknown> = {
  success?: boolean;
  result?: T;
  errors?: Record<string, unknown>;
  [key: string]: unknown;
};

export const PORTAL_SESSION_EXPIRED_EVENT = "portal-session-expired";
const DEFAULT_OIDC_SCOPE = "openid";
const DEFAULT_OIDC_RESPONSE_TYPE = "code";

function notifyPortalSessionExpired(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PORTAL_SESSION_EXPIRED_EVENT));
}

function handleUnauthorized(resp: Response): void {
  if (resp.status !== 401) return;
  clearAccessTokenCookie();
  notifyPortalSessionExpired();
}

function getBackendRoot(): string {
  const apiUrl = import.meta.env.VITE_API_URL || "";
  return apiUrl.replace(/\/api\/v1\/?$/, "");
}

export function startLoginFortalezaDigital(): void {
  const url = getFortalezaDigitalAuthUrl();
  if (!url) return;
  window.location.href = url;
}

export function getFortalezaDigitalAuthUrl(): string {
  const base = String(import.meta.env.VITE_RHSSO_URL_BASE ?? "").replace(/\/+$/, "");
  const realm = String(import.meta.env.VITE_RHSSO_REALM ?? "");
  const clientId = String(import.meta.env.VITE_RHSSO_CLIENT_ID ?? "");
  const redirectUri = String(import.meta.env.VITE_RHSSO_REDIRECT_URI ?? "");

  if (!base || !realm || !clientId || !redirectUri) {
    return "";
  }

  const baseWithAuth = base ? `${base}/auth` : "";
  const path = realm ? `/realms/${realm}/protocol/openid-connect/auth` : "/realms//protocol/openid-connect/auth";
  const url = new URL(`${baseWithAuth}${path}`);
  url.searchParams.set("response_type", DEFAULT_OIDC_RESPONSE_TYPE);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", DEFAULT_OIDC_SCOPE);
  url.searchParams.set("redirect_uri", redirectUri);
  return url.toString();
}

export function getFortalezaDigitalEditCadastroUrl(): string {
  const clientId = String(import.meta.env.VITE_RHSSO_CLIENT_ID ?? "").trim();
  const editBaseUrl = String(import.meta.env.VITE_FORTALEZA_DIGITAL_EDIT_BASE_URL ?? "").trim();
  if (!editBaseUrl) return "";

  const url = new URL(editBaseUrl);
  if (clientId) {
    url.searchParams.set("back_client_id", clientId);
  }
  return url.toString();
}

// export async function fetchIdentidadeCidadao(): Promise<FortalezaDigitalIdentity> {
//   const root = getBackendRoot();
//   const resp = await fetch(`${root}/cidadao-identity`, {
//     credentials: "include",
//   });

//   if (!resp.ok) {
//     return null;
//   }

//   const body = await resp.json();
//   if (body && body.success) {
//     return body.result as FortalezaDigitalIdentity;
//   }

//   return null;
// }

const REFRESH_TOKEN_COOKIE = "refresh_token_fod";
const ACCESS_TOKEN_COOKIE = "access_token";

function getCookie(name: string): string | null {
  const target = `${name}=`;
  const parts = document.cookie.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (part.startsWith(target)) {
      return decodeURIComponent(part.slice(target.length));
    }
  }
  return null;
}

function setCookie(name: string, value: string, maxAgeSeconds?: number): void {
  const encoded = encodeURIComponent(value);
  const maxAge = maxAgeSeconds ? `; max-age=${maxAgeSeconds}` : "";
  document.cookie = `${name}=${encoded}; path=/${maxAge}; SameSite=Lax`;
}

function getFirstContato(perfil: FortalezaDigitalPerfil, aliases: string[]): string | null {
  if (!perfil || !Array.isArray(perfil.contatos)) return null;
  for (const contato of perfil.contatos) {
    const tipo = contato?.tipo_contato?.apelido;
    if (tipo && aliases.includes(tipo) && contato?.nome) {
      return contato.nome;
    }
  }
  return null;
}

function getEnderecoPrincipal(perfil: FortalezaDigitalPerfil): Record<string, unknown> | null {
  if (!perfil) return null;
  const p = perfil as Record<string, unknown>;
  const enderecos = p.enderecos;
  if (Array.isArray(enderecos) && enderecos.length > 0 && enderecos[0] && typeof enderecos[0] === "object") {
    return enderecos[0] as Record<string, unknown>;
  }
  if (enderecos && typeof enderecos === "object") {
    return enderecos as Record<string, unknown>;
  }
  const fallbackKeys = ["endereco", "endereco_principal", "enderecoPrincipal", "address"];
  for (const key of fallbackKeys) {
    const value = p[key];
    if (Array.isArray(value) && value.length > 0 && value[0] && typeof value[0] === "object") {
      return value[0] as Record<string, unknown>;
    }
    if (value && typeof value === "object") {
      return value as Record<string, unknown>;
    }
  }
  return null;
}

function getText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    const candidate = [v.nome, v.descricao, v.label, v.value].find((item) => typeof item === "string" && item.trim());
    if (typeof candidate === "string") return candidate.trim();
  }
  return null;
}

export function mapPerfilToCadastro(perfil: FortalezaDigitalPerfil): FortalezaDigitalCadastro {
  if (!perfil) {
    return {};
  }

  const endereco = getEnderecoPrincipal(perfil);
  const perfilRecord = perfil as Record<string, unknown>;
  const email = perfil.email_preferencial || getFirstContato(perfil, ["email"]) || perfil.email || null;
  const telefone = getFirstContato(perfil, ["telefone_celular", "telefone_residencial", "telefone"]) || perfil.phone_number || null;
  const bairro =
    getText(endereco?.bairro) ||
    getText(endereco?.bairro_nome) ||
    getText(endereco?.nome_bairro) ||
    getText(endereco?.bairroNome) ||
    getText(perfilRecord.bairro) ||
    getText(perfilRecord.bairro_nome) ||
    getText(perfilRecord.nome_bairro) ||
    getText(perfilRecord.bairroNome);

  return {
    nome: perfil.nome || perfil.name || null,
    cpf: perfil.cpf || perfil.preferred_username || null,
    email,
    telefone,
    logradouro:
      getText(endereco?.logradouro) ||
      getText(endereco?.endereco) ||
      getText(endereco?.rua) ||
      getText(perfilRecord.logradouro) ||
      getText(perfilRecord.endereco) ||
      getText(perfilRecord.rua) ||
      null,
    numero: getText(endereco?.numero) || getText(endereco?.num) || getText(perfilRecord.numero) || null,
    bairro: bairro || null,
    complemento: getText(endereco?.complemento) || getText(perfilRecord.complemento) || null,
    cep: getText(endereco?.cep) || getText(endereco?.codigo_postal) || getText(perfilRecord.cep) || null,
  };
}

export function getAccessTokenFromCookie(): string | null {
  return getCookie(ACCESS_TOKEN_COOKIE);
}

export function clearAccessTokenCookie(): void {
  setCookie(ACCESS_TOKEN_COOKIE, "", 0);
}

export async function refreshAccessTokenFromCookie(): Promise<string | null> {
  const root = getBackendRoot();
  const resp = await fetch(`${root}/api/sso/token/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!resp.ok) {
    handleUnauthorized(resp);
    return null;
  }

  const body = (await resp.json()) as {
    success?: boolean;
    result?: { access_token?: string };
  };
  const accessToken = body?.result?.access_token;
  if (!accessToken) return null;

  setCookie(ACCESS_TOKEN_COOKIE, accessToken, 60 * 60 * 24 * 7);
  return accessToken;
}

export async function logoutFortalezaDigital(): Promise<boolean> {
  const root = getBackendRoot();
  const resp = await fetch(`${root}/api/sso/logout/`, {
    method: "POST",
    credentials: "include",
  });

  return resp.ok;
}

export async function fetchFortalezaDigitalPerfil(accessToken: string): Promise<FortalezaDigitalPerfil> {
  const root = getBackendRoot();
  const resp = await fetch(`${root}/api/sso/perfil/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!resp.ok) {
    handleUnauthorized(resp);
    return null;
  }

  const body = (await resp.json()) as { success?: boolean; result?: unknown };

  return (body?.result as FortalezaDigitalPerfil) ?? null;
}

export async function fetchFortalezaDigitalPessoaBase(accessToken: string, cpf: string): Promise<FortalezaDigitalPerfil> {
  const normalizedCpf = String(cpf || "").replace(/\D/g, "");
  if (!normalizedCpf) return null;

  const root = getBackendRoot();
  const resp = await fetch(`${root}/api/sso/pessoa/${normalizedCpf}/base/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!resp.ok) {
    handleUnauthorized(resp);
    return null;
  }

  const body = (await resp.json()) as { success?: boolean; result?: unknown };
  return (body?.result as FortalezaDigitalPerfil) ?? null;
}

export type FortalezaDigitalAgendamentosPage = {
  items: AgendamentoResponse[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
};

export async function fetchFortalezaDigitalAgendamentos(
  accessToken: string,
  params?: { page?: number; pageSize?: number },
): Promise<FortalezaDigitalAgendamentosPage> {
  const root = getBackendRoot();
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("page_size", String(params.pageSize));
  const querySuffix = query.toString() ? `?${query.toString()}` : "";
  const resp = await fetch(`${root}/api/sso/agendamentos/${querySuffix}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!resp.ok) {
    handleUnauthorized(resp);
    return { items: [], total: 0, page: params?.page ?? 1, pageSize: params?.pageSize ?? 0, hasNext: false };
  }

  const body = (await resp.json()) as {
    success?: boolean;
    result?:
      | AgendamentoResponse[]
      | {
          items?: AgendamentoResponse[];
          total?: number;
          page?: number;
          page_size?: number;
          has_next?: boolean;
        };
  };
  if (Array.isArray(body?.result)) {
    return {
      items: body.result,
      total: body.result.length,
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? body.result.length,
      hasNext: false,
    };
  }

  const result = body?.result;
  return {
    items: Array.isArray(result?.items) ? result.items : [],
    total: Number(result?.total ?? 0),
    page: Number(result?.page ?? params?.page ?? 1),
    pageSize: Number(result?.page_size ?? params?.pageSize ?? 0),
    hasNext: Boolean(result?.has_next),
  };
}

export async function fetchFortalezaDigitalAgendamentoById(accessToken: string, id: string): Promise<AgendamentoResponse | null> {
  const root = getBackendRoot();
  const resp = await fetch(`${root}/api/sso/agendamentos/${id}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!resp.ok) {
    handleUnauthorized(resp);
    return null;
  }

  const body = (await resp.json()) as { success?: boolean; result?: AgendamentoResponse };
  return body?.result ?? null;
}

export type FortalezaDigitalAgendamentoPayload = {
  servico: string;
  unidade: string;
  vaga: string;
  motivo_territorio?: string | null;
};

export async function createFortalezaDigitalAgendamento(accessToken: string, payload: FortalezaDigitalAgendamentoPayload): Promise<unknown | null> {
  const root = getBackendRoot();
  const resp = await fetch(`${root}/api/sso/agendamentos/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    handleUnauthorized(resp);
    try {
      return (await resp.json()) as unknown;
    } catch {
      return { success: false, status: resp.status };
    }
  }

  return (await resp.json()) as unknown;
}

export async function patchFortalezaDigitalAgendamento(
  accessToken: string,
  id: string,
  payload: Partial<AgendamentoRequest> & Record<string, unknown>,
): Promise<AgendamentoResponse | null> {
  const root = getBackendRoot();
  const resp = await fetch(`${root}/api/sso/agendamentos/${id}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    handleUnauthorized(resp);
    return null;
  }

  const body = (await resp.json()) as { success?: boolean; result?: AgendamentoResponse };
  return body?.result ?? null;
}

export async function upsertCidadaoFromSso(accessToken: string): Promise<PortalApiResult> {
  const root = getBackendRoot();
  const resp = await fetch(`${root}/api/sso/cidadaos/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!resp.ok) {
    handleUnauthorized(resp);
    try {
      return (await resp.json()) as PortalApiResult;
    } catch {
      return { success: false, result: `Falha ao atualizar cadastro (${resp.status}).` };
    }
  }

  const body = (await resp.json()) as PortalApiResult;

  return body;
}

export async function fetchFortalezaDigitalCidadaoMe(accessToken: string): Promise<unknown | null> {
  const root = getBackendRoot();
  const resp = await fetch(`${root}/api/sso/cidadaos/me/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!resp.ok) {
    handleUnauthorized(resp);
    return null;
  }

  const body = (await resp.json()) as { success?: boolean; result?: unknown };
  return body?.result ?? null;
}

export type AvaliacaoFortalezaDigitalPayload = {
  agendamento: string;
  nota: number;
  comentario?: string;
};
export async function createFortalezaDigitalAvaliacao(accesToken: string, payload: AvaliacaoFortalezaDigitalPayload) {
  const root = getBackendRoot();
  const resp = await fetch(`${root}/api/sso/avaliacao/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accesToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    handleUnauthorized(resp);
    return null;
  }

  return (await resp.json()) as unknown;
}

export async function updateFortalezaDigitalAvaliacao(accesToken: string, avaliacaoId: string, payload: AvaliacaoFortalezaDigitalPayload) {
  const root = getBackendRoot();
  const resp = await fetch(`${root}/api/sso/avaliacao/${avaliacaoId}/`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accesToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    handleUnauthorized(resp);
    return null;
  }

  return (await resp.json()) as unknown;
}
