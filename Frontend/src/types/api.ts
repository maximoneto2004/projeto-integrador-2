export type TokenRequest = { email: string; password: string };
export type PasswordResetRequest = { email: string };
export type PasswordResetResponse = {
  detail: string;
  reset?: { uid: string; token: string };
};
export type PasswordResetConfirmRequest = { uid: string; token: string; new_password: string };
export type PasswordResetConfirmResponse = { detail: string };

export type AuthUser = {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  grupos: string[];
  unidade_ativa: { id: string; nome: string } | null;
  guiche_atual?: Guiche | null;
};

export type TokenResponse = { access: string; usuario: AuthUser };
export type TokenRefreshRequest = void;
export type TokenRefreshResponse = { access: string; usuario?: AuthUser };

export type UnidadeResumo = { id: string; nome: string };

export type Bairro = { id: string; nome: string; is_active?: boolean };

export type GuicheDefineRequest = { guiche_id: string };
export type Guiche = { id: string; nome: string; unidade: UnidadeResumo; ocupado?: boolean };
export type GuicheDefineResponse = { detail: string; guiche: Guiche };
export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
export type GuicheListResponse = PaginatedResponse<Guiche>;

export type Situacao =
  | "AGENDADO"
  | "CANCELADO_CIDADAO"
  | "CANCELADO_CRAS"
  | "AUSENCIA_CIDADAO"
  | "ATIVADO"
  | "ATENDIMENTO"
  | "CHAMANDO"
  | "ATIVADO_AUSENTE"
  | "AGUARDANDO_FILA"
  | "FINALIZADO";

export type Origem = "156" | "RECEPCAO" | "SITE" | "FILA";

export type Prioridade = "NORMAL" | "PREFERENCIAL" | "PREFERENCIAL+";

export type UrgenciaAtendimento = "ALTA" | "NORMAL";

export type TipoMarcacao = "AGENDAMENTO" | "ENCAMINHAMENTO";

export type ServicoUnidadeResumo = {
  id?: string;
  servico?: string | { id?: string; nome?: string };
  servico_nome?: string;
  dias_semana?: string[] | null;
  mesmo_expediente?: boolean;
  hora_manha_inicio?: string | null;
  hora_manha_fim?: string | null;
  hora_tarde_inicio?: string | null;
  hora_tarde_fim?: string | null;
  is_active?: boolean;
};

export type UnidadeCras = {
  id: string;
  nome: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  cep: string;
  telefone: string;
  email: string;
  hora_manha_inicio: string | null;
  hora_manha_fim: string | null;
  hora_tarde_inicio: string | null;
  hora_tarde_fim: string | null;
  bairro: string;
  bairros_abrangencia?: (string | Bairro)[] | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  longitude: string;
  latitude: string;
  servicos?: ServicoUnidadeResumo[] | null;
};

export type Servico = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo_marcacao: TipoMarcacao;
  classe: string;
  tipo_servico: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type TipoServicoResumo = {
  id: string;
  nome: string;
  descricao: string | null;
  tempo_atendimento?: number;
  is_active?: boolean;
};

export type ClasseServicoResumo = {
  id: string;
  nome: string;
  descricao: string | null;
  is_active?: boolean;
};

export type ServicoDetalhado = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo_marcacao: TipoMarcacao;
  classe: ClasseServicoResumo;
  tipo_servico: TipoServicoResumo;
  is_active?: boolean;
};

export type ServicoUnidadeCras = {
  id: string;
  unidade: string;
  servico: string;
  dias_semana: string[];
  mesmo_expediente: boolean;
  hora_manha_inicio: string | null;
  hora_manha_fim: string | null;
  hora_tarde_inicio: string | null;
  hora_tarde_fim: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type AtendenteResumo = {
  id: string;
  nome_completo?: string | null;
  nome?: string | null;
  guiche_atual?: Guiche | string | null;
};

export type CidadaoAgendamentoResumo = {
  id: string;
  data: string; // date
  horario: string; // time
  situacao: Situacao;
  atendente: AtendenteResumo | null;
};

export type AgendaVaga = {
  id: string;
  data: string; // date
  horario: string; // time
  vagas: number;
  vagas_ocupadas: number;
  unidade: string;
  tipo_servico: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type Cidadao = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email?: string | null;
  dataNascimento?: string | null;
  sexo?: "MASCULINO" | "FEMININO" | "OUTRO" | "" | null;
  logradouro?: string;
  numero?: string;
  cep?: string;
  complemento?: string | null;
  bairro?: string | Bairro | null;
  unidade?: UnidadeResumo | string | null;
  unidade_origem?: UnidadeResumo | string | null;
  agendamentos?: CidadaoAgendamentoResumo[];
  origem?: Origem | "" | null;
  apelido?: string | null;
  nis?: string | null;
  nome_mae?: string | null;
  rg?: string | null;
  orgao_emissor?: string | null;
  rg_uf?: string | null;
  data_emissao_rg?: string | null;
};

export type CidadaoPayload = {
  nome: string;
  cpf: string;
  telefone: string;
  email?: string | null;
  data_nascimento?: string | null;
  sexo?: "MASCULINO" | "FEMININO" | "OUTRO" | "" | null;
  logradouro?: string;
  numero?: string;
  cep?: string;
  complemento?: string | null;
  bairro?: string | Bairro | null;
  unidade_origem?: string | null;
  origem?: Origem | "" | null;
  apelido?: string | null;
  nis?: string | null;
  mae?: string | null;
  rg?: string | null;
  orgao_emissor?: string | null;
  rg_uf?: string | null;
  data_emissao_rg?: string | null;
};

export type AgendamentoRequest = {
  cidadao: string; // uuid
  servico: string;
  unidade: string;
  vaga: string;
  atendente?: string | null;
  servicos_adicionais?: (string | null)[];
  origem?: Origem | "" | null;
  situacao?: Situacao; // default AGENDADO no backend
  is_active?: boolean;
  data_hora_inicio_atendimento?: string | null;
  data_hora_fim_atendimento?: string | null;
  observacoes_gerais?: string | null;
  final_atendimento?: string | null;
  motivo_territorio?: string | null;
};

export type AgendaVagaListItem = {
  id: string;
  horario: string;
  vagas: number;
  vagas_ocupadas: number;
  vagas_disponiveis: number;
};

export type AgendamentoResponse = {
  id: string;
  cidadao: Cidadao;
  atendente: Usuario | null;
  servico: Servico;
  unidade: UnidadeCras;
  data: string; // date
  horario: string; // time
  situacao: Situacao;
  servicos_adicionais?: string[] | null;
  observacoes_gerais?: string | null;
  final_atendimento?: string | null;
  motivo_territorio?: string | null;
  avaliacao?: { nota: number; comentario: string | null };
};

export type Agendamento = {
  id: string;
  cidadao: Cidadao;
  usuario: Usuario; // se precisar, defina abaixo
  servico: Servico;
  unidade: UnidadeCras;
  data: string; // date
  horario: string; // time
  situacao: Situacao;
};

export type Usuario = {
  id: string;
  nome_completo?: string;
  email: string;
  cpf: string;
  telefone: string;
  cargo_funcao: string;
  guiche_atual?: Guiche | null;
  // adicione o resto se precisar
};

export type FilaEsperaPayload = {
  cidadao: string;
  servico: string;
  unidade: string;
  prioridade: Prioridade;
  status?: Situacao;
  urgencia?: UrgenciaAtendimento;
};

export type FilaEsperaResponse = {
  id: string;
  cidadao: Cidadao;
  servico: Servico;
  unidade: UnidadeCras;
  prioridade: Prioridade;
  status: Situacao;
  urgencia: UrgenciaAtendimento;
};

export type DashboardSupervisorResult = {
  data_inicio: string;
  data_fim: string;
  unidade_id: string;
  total_agendamentos: number;
  agendados: number;
  em_atendimento: number;
  aguardando_atendimento_ativado: number;
  nao_compareceu: number;
  cancelados: number;
  aguardando_fila: number;
  finalizados: number;
  taxa_nao_comparecimento: number;
  tempo_medio: number;
  atendimentos_por_hora: Array<{ hour: number; total: number }>;
  origem_atendimentos: Array<{ origem: string | null; total: number }>;
  atendimentos_categoria: Array<{ servico__id: string; servico__nome: string; total: number }>;
  agendamentos_por_classe: Array<{ servico__classe__id: string; servico__classe__nome: string; total: number }>;
  servicos_metricas: Array<{
    servico_id: string;
    servico_nome: string;
    tipo_servico_nome: string;
    esperado_min: number;
    total: number;
    tempo_medio_espera_min: number;
    tempo_medio_atendimento_min: number;
    tempo_excedente_medio_min: number;
    pct_acima_esperado: number;
  }>;
};

export type DashboardGestorResult = {
  data_inicio: string;
  data_fim: string;
  unidade_id: string;
  total_agendamentos: number;
  em_atendimento: number;
  aguardando_atendimento_ativado: number;
  nao_compareceu: number;
  cancelados: number;
  aguardando_fila: number;
  taxa_nao_comparecimento: number;
  tempo_medio: number;
  atendimentos_por_hora: Array<{ hour: number; total: number }>;
  origem_atendimentos: Array<{ origem: string | null; total: number }>;
  atendimentos_categoria: Array<{ servico__id: string; servico__nome: string; total: number }>;
  servicos_metricas: Array<{
    servico_id: string;
    servico_nome: string;
    tipo_servico_nome: string;
    esperado_min: number;
    total: number;
    tempo_medio_espera_min: number;
    tempo_medio_atendimento_min: number;
    tempo_excedente_medio_min: number;
    pct_acima_esperado: number;
  }>;
};

export type DashboardMonitorUnidadeResult = {
  data_inicio: string;
  data_fim: string;
  unidade_id: string;
  total_agendamentos: number;
  em_atendimento: number;
  aguardando_atendimento_ativado: number;
  finalizados: number;
  nao_compareceu: number;
  cancelados: number;
  aguardando_fila: number;
  taxa_nao_comparecimento: number;
  tempo_medio: number;
  agendados: number;
  atendimentos_por_hora: Array<{ hour: number; total: number }>;
  origem_atendimentos: Array<{ origem: string | null; total: number }>;
  atendimentos_categoria: Array<{ servico__id: string; servico__nome: string; total: number }>;
  servicos_metricas: Array<{
    servico_id: string;
    servico_nome: string;
    tipo_servico_nome: string;
    esperado_min: number;
    total: number;
    tempo_medio_espera_min: number;
    tempo_medio_atendimento_min: number;
    tempo_excedente_medio_min: number;
    pct_acima_esperado: number;
  }>;
};
