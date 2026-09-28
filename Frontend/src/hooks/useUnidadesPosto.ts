import { useCallback, useState } from "react";

import { unidadePostoService, type UnidadePostoPayload } from "@/services/sistema/unidadePostoService";
import type { UnidadePosto } from "@/types/api";

export type ServicoHorarioForm = {
  id: string;
  nome: string;
  diasSemana: string[];
  mesmoExpediente: boolean;
  horaManhaInicio: string;
  horaManhaFim: string;
  horaTardeInicio: string;
  horaTardeFim: string;
};

export type UnidadeForm = {
  id: string;
  nome: string;
  logradouro: string;
  numero: string;
  complemento: string;
  cep: string;
  bairroId: string;
  bairrosAbrangenciaIds: string[];
  telefone: string;
  email: string;
  turnoManhaInicio: string;
  turnoManhaFim: string;
  turnoTardeInicio: string;
  turnoTardeFim: string;
  ativo: boolean;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  servicos: string[];
  servicosDetalhes: ServicoHorarioForm[];
};

const parseLocalizacao = (value?: string | null): number | null => {
  if (!value) return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const parseHora = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.slice(0, 5);
};

const parseServicosDetalhes = (value: unknown): ServicoHorarioForm[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, idx) => {
      if (!item || typeof item !== "object") return "";
      const record = item as { servico_nome?: unknown; servico?: unknown; is_active?: unknown };
      if (record.is_active === false) return "";

      let nome = "";
      if (typeof record.servico_nome === "string") nome = record.servico_nome.trim();
      if (record.servico && typeof record.servico === "object") {
        const nomeObj = (record.servico as { nome?: unknown }).nome;
        if (typeof nomeObj === "string") nome = nomeObj.trim();
      }
      if (typeof record.servico === "string" && !nome) nome = record.servico.trim();
      if (!nome) return "";

      const servicoRecord = item as {
        id?: unknown;
        dias_semana?: unknown;
        mesmo_expediente?: unknown;
        hora_manha_inicio?: unknown;
        hora_manha_fim?: unknown;
        hora_tarde_inicio?: unknown;
        hora_tarde_fim?: unknown;
      };

      return {
        id: String(servicoRecord.id || `${nome}-${idx}`),
        nome,
        diasSemana: Array.isArray(servicoRecord.dias_semana)
          ? servicoRecord.dias_semana.filter((d): d is string => typeof d === "string")
          : [],
        mesmoExpediente: Boolean(servicoRecord.mesmo_expediente),
        horaManhaInicio: parseHora(servicoRecord.hora_manha_inicio),
        horaManhaFim: parseHora(servicoRecord.hora_manha_fim),
        horaTardeInicio: parseHora(servicoRecord.hora_tarde_inicio),
        horaTardeFim: parseHora(servicoRecord.hora_tarde_fim),
      };
    })
    .filter((item): item is ServicoHorarioForm => Boolean(item));
};

const normalizarUnidade = (unidade: UnidadePosto): UnidadeForm => {
  const servicosDetalhes = parseServicosDetalhes(
    (unidade as unknown as { servicos?: unknown }).servicos,
  );
  const servicos = Array.from(
    new Set(servicosDetalhes.map((servico) => servico.nome)),
  );

  return {
    id: String(unidade.id),
    nome: unidade.nome || "",
    logradouro: unidade.logradouro || "",
    numero: unidade.numero || "",
    complemento: unidade.complemento || "",
    cep: unidade.cep || "",
    bairroId: typeof unidade.bairro === "string" ? unidade.bairro : String((unidade.bairro as any)?.id || ""),
    bairrosAbrangenciaIds: Array.isArray(unidade.bairros_abrangencia)
      ? unidade.bairros_abrangencia
          .map((bairro) => (typeof bairro === "string" ? bairro : String((bairro as any)?.id || "")))
          .filter((bairroId) => bairroId)
      : [],
    telefone: unidade.telefone || "",
    email: unidade.email || "",
    turnoManhaInicio: parseHora(unidade.hora_manha_inicio),
    turnoManhaFim: parseHora(unidade.hora_manha_fim),
    turnoTardeInicio: parseHora(unidade.hora_tarde_inicio),
    turnoTardeFim: parseHora(unidade.hora_tarde_fim),
    ativo: unidade.is_active ?? true,
    longitude: parseLocalizacao(unidade.longitude),
    latitude: parseLocalizacao(unidade.latitude),
    createdAt: unidade.created_at || "",
    servicos,
    servicosDetalhes,
  };
};

const extrairUnidade = (data: unknown) => {
  if (!data) return null;
  const candidate =
    typeof data === "object" && data !== null && ("result" in data || "data" in data)
      ? ((data as { result?: unknown; data?: unknown }).result ?? (data as { data?: unknown }).data)
      : data;
  if (!candidate || typeof candidate !== "object") return null;
  return candidate as UnidadePosto;
};

type UseUnidadesPostoOptions = {
  page?: number;
  pageSize?: number;
  serverPagination?: boolean;
};

export function useUnidadesPosto(nome: string, options?: UseUnidadesPostoOptions) {
  const [unidades, setUnidades] = useState<UnidadeForm[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetchUnidades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (options?.serverPagination) {
        const page = options.page ?? 1;
        const pageSize = options.pageSize ?? 10;
        const offset = (page - 1) * pageSize;
        const { items, count } = await unidadePostoService.listarPaginado({
          ...(nome ? { nome } : {}),
          limit: pageSize,
          offset,
        });
        setUnidades(items.map(normalizarUnidade));
        setTotal(count);
      } else {
        const lista = await unidadePostoService.listar(nome);
        setUnidades(lista.map(normalizarUnidade));
        setTotal(lista.length);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [nome, options?.serverPagination, options?.page, options?.pageSize]);

  const createUnidade = useCallback(async (payload: UnidadePostoPayload) => {
    const { data } = await unidadePostoService.criar(payload);
    const unidade = extrairUnidade(data);
    if (unidade) {
      const normalizada = normalizarUnidade(unidade);
      setUnidades((atual) => [...atual, normalizada]);
      return normalizada;
    }
    return null;
  }, []);

  const updateUnidade = useCallback(async (id: string, payload: Partial<UnidadePostoPayload>) => {
    const { data } = await unidadePostoService.atualizar(id, payload);
    const unidade = extrairUnidade(data);
    if (unidade) {
      const normalizada = normalizarUnidade(unidade);
      setUnidades((atual) => atual.map((item) => (item.id === id ? normalizada : item)));
      return normalizada;
    }
    return null;
  }, []);

  return {
    unidades,
    total,
    loading,
    error,
    fetchUnidades,
    createUnidade,
    updateUnidade,
  };
}
