import { api } from "@/services/api";

export type RelatorioReferenciaParams = {
  mes_referencia?: number;
  ano_referencia?: number;
  unidade_cras?: string;
};

export type RelatorioAtendimentosTecnicoParams = RelatorioReferenciaParams;

export type RelatorioAtendimentosTecnicoResult = {
  familias_em_acompanhamento: number;
  familias_que_iniciaram_acompanhamento_no_mes_referencia: number;
  familias_novas_em_extrema_pobreza_no_mes_referencia: number;
  familias_novas_com_bolsa_familia_no_mes_referencia: number;
  familias_novas_com_bpc_no_mes_referencia: number;
  familias_novas_com_descumprimento_condicionalidades_no_mes_referencia: number;
  familias_novas_com_trabalho_infantil_no_mes_referencia: number;
  familias_novas_com_acolhimento_familiar_no_mes_referencia: number;
  atendimentos_realizados_no_mes_referencia: number;
  servicos_adicionais_selecionados_no_mes_referencia?: Record<string, { nome: string; total: number }>;
  servicos_adicionais_agrupados_no_mes_referencia?: {
    servicos: Array<{ id: string; nome: string }>;
    total: number;
  } | null;
  servicos_adicionais_pcd_no_mes_referencia?: Record<string, { nome: string; total: number }>;
  faixas_etarias_servico_adicional_no_mes_referencia?: {
    servico_id: string;
    servico_nome: string;
    criancas_0_a_6_anos: number;
    criancas_adolescentes_7_a_14_anos: number;
    adolescentes_15_a_17_anos: number;
    adultos_18_a_59_anos: number;
    idosos: number;
  } | null;
  // Campos legados que ainda podem ser retornados por algumas versões do backend.
  agendamentos_com_encaminhamento_creas_no_mes_referencia?: number;
  atendimentos_com_encaminhamento_cadastro_unico_no_mes_referencia?: number;
  atendimentos_com_atualizacao_cadastro_unico_no_mes_referencia?: number;
  atendimentos_com_acesso_bpc_no_mes_referencia?: number;
  atendimentos_com_acompanhamento_particularizado_no_mes_referencia?: number;
  auxilios_natalidade_concedidos_no_mes_referencia: number;
  auxilios_funeral_concedidos_no_mes_referencia: number;
  outros_beneficios_eventuais_concedidos_no_mes_referencia: number;
  mes_referencia: number;
  ano_referencia: number;
  unidade_cras: string | null;
};

export type RelatorioAtividadesCadUnicoLinha = {
  indicador: string;
  total_mes: number;
} & Partial<Record<`dia_${number}`, number>>;

export type RelatorioAtividadesCadUnicoServico = {
  id: string | null;
  nome: string;
  valores: RelatorioAtividadesCadUnicoLinha;
};

export type RelatorioAtividadesCadUnicoGrupo = {
  indicador: string;
  servicos: RelatorioAtividadesCadUnicoServico[];
};

export type RelatorioAtividadesCadUnicoResult = {
  grupos_servicos: Record<string, RelatorioAtividadesCadUnicoGrupo>;
  mes_referencia: number;
  ano_referencia: number;
  unidade_cras: string | null;
};

type RelatorioAtendimentosTecnicoResponse = {
  success: boolean;
  result: RelatorioAtendimentosTecnicoResult;
  mensagem?: string;
};

type RelatorioAtividadesCadUnicoResponse = {
  success: boolean;
  result: RelatorioAtividadesCadUnicoResult;
  mensagem?: string;
};

export const relatorioService = {
  obterAtendimentosTecnico(params: RelatorioAtendimentosTecnicoParams) {
    return api.get<RelatorioAtendimentosTecnicoResponse>("/relatorios/atendimentos-tecnico/", { params });
  },

  obterAtividadesCadUnico(params: RelatorioReferenciaParams) {
    return api.get<RelatorioAtividadesCadUnicoResponse>("/relatorios/atividades-cadunico/", { params });
  },
};

