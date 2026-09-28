import { api, urlServidorApi } from "@/services/api";
import type { Receita } from "@/services/prontuario/receitaService";

export type ClassificacaoRisco = "VERMELHO" | "LARANJA" | "AMARELO" | "VERDE" | "AZUL";

export const CLASSIFICACAO_RISCO_OPCOES: { value: ClassificacaoRisco; label: string; cor: string }[] = [
  { value: "VERMELHO", label: "Vermelho - Emergência", cor: "bg-red-600" },
  { value: "LARANJA", label: "Laranja - Muito urgente", cor: "bg-orange-500" },
  { value: "AMARELO", label: "Amarelo - Urgente", cor: "bg-yellow-400" },
  { value: "VERDE", label: "Verde - Pouco urgente", cor: "bg-green-600" },
  { value: "AZUL", label: "Azul - Não urgente", cor: "bg-blue-600" },
];

export type RegistroAtendimentoPayload = {
  agendamento: string;
  classificacao_risco?: ClassificacaoRisco | null;
  queixa_principal: string;
  subjetivo?: string | null;
  objetivo?: string | null;
  avaliacao?: string | null;
  cid?: string | null;
  plano?: string | null;
  pressao_sistolica?: number | null;
  pressao_diastolica?: number | null;
  frequencia_cardiaca?: number | null;
  frequencia_respiratoria?: number | null;
  temperatura?: string | null;
  saturacao_o2?: number | null;
  glicemia_capilar?: number | null;
  peso?: string | null;
  altura?: number | null;
};

export type RegistroAtendimento = RegistroAtendimentoPayload & {
  id: string;
  cidadao: string;
  unidade: string;
  unidade_nome: string;
  profissional: string;
  profissional_nome: string;
  servico_nome: string;
  classificacao_risco_display: string | null;
  imc: string | null;
  created_at: string;
  updated_at: string;
};

export type CidadaoProntuario = {
  id: string;
  nome: string;
  cpf: string;
  cns: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  sexo_display: string | null;
  telefone: string | null;
  alergias: string | null;
  condicoes_cronicas: string | null;
};

export type DadosClinicosPayload = Partial<Pick<CidadaoProntuario, "cns" | "alergias" | "condicoes_cronicas">>;

export type ProntuarioPaciente = {
  cidadao: CidadaoProntuario;
  atendimentos: RegistroAtendimento[];
  receitas: Receita[];
};

type Envelope<T> = { success?: boolean; result: T };

const url = urlServidorApi;

export const prontuarioService = {
  async buscarRegistroDoAgendamento(agendamentoId: string): Promise<RegistroAtendimento | null> {
    const { data } = await api.get<Envelope<RegistroAtendimento[]>>(url("/api/prontuario/atendimento/"), {
      params: { agendamento: agendamentoId },
    });
    return data.result?.[0] ?? null;
  },

  async criarRegistro(payload: RegistroAtendimentoPayload): Promise<RegistroAtendimento> {
    const { data } = await api.post<Envelope<RegistroAtendimento>>(url("/api/prontuario/atendimento/"), payload);
    return data.result;
  },

  async atualizarRegistro(id: string, payload: Partial<RegistroAtendimentoPayload>): Promise<RegistroAtendimento> {
    const { data } = await api.patch<Envelope<RegistroAtendimento>>(url(`/api/prontuario/atendimento/${id}/`), payload);
    return data.result;
  },

  async obterProntuario(cidadaoId: string): Promise<ProntuarioPaciente> {
    const { data } = await api.get<Envelope<ProntuarioPaciente>>(url(`/api/prontuario/cidadao/${cidadaoId}/`));
    return data.result;
  },

  async atualizarDadosClinicos(cidadaoId: string, payload: DadosClinicosPayload): Promise<CidadaoProntuario> {
    const { data } = await api.patch<Envelope<CidadaoProntuario>>(
      url(`/api/prontuario/cidadao/${cidadaoId}/dados-clinicos/`),
      payload,
    );
    return data.result;
  },
};

export function mensagemErroApi(err: unknown, padrao: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (!data || typeof data !== "object") return padrao;
  const registro = data as Record<string, unknown>;
  const texto = registro.detail ?? registro.result ?? Object.values(registro)[0];
  const primeiro = Array.isArray(texto) ? texto.flat(3).find((v) => typeof v === "string") : texto;
  return typeof primeiro === "string" ? primeiro : padrao;
}
