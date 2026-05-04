import { api } from "@/services/api";

export type Unidade = {
  id: string;
  nome: string;
};

type UnidadesEnvelope = {
  success?: boolean;
  result?: Unidade[];
};

type PaginatedEnvelope = {
  results?: Unidade[] | UnidadesEnvelope;
};

const isUnidadeArray = (value: unknown): value is Unidade[] =>
  Array.isArray(value) && value.every((item) => item && typeof item === "object" && "id" in item && "nome" in item);

const extractUnidades = (payload: unknown): Unidade[] => {
  if (isUnidadeArray(payload)) return payload;

  if (payload && typeof payload === "object") {
    const envelope = payload as UnidadesEnvelope & PaginatedEnvelope;

    if (isUnidadeArray(envelope.result)) return envelope.result;

    if (isUnidadeArray(envelope.results)) return envelope.results;

    if (envelope.results && typeof envelope.results === "object") {
      const inner = envelope.results as UnidadesEnvelope;
      if (isUnidadeArray(inner.result)) return inner.result;
    }
  }

  return [];
};

export const unidadeService = {
  async listar(): Promise<Unidade[]> {
    const res = await api.get("/unidade_cras_list/");
    return extractUnidades(res.data);
  },
};
