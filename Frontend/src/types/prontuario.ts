export interface Pessoa {
  id: string;
  cpf: string;
  nome: string;
  apelido: string;
  email?: string;
  telefone?: string;
  sexo?: string;
  dataNascimento?: string;
  nomeMae?: string;
  nis?: string;
  rg?: string;
  rgOrgao?: string;
  rgUf?: string;
  rgDataEmissao?: string;
  enderecoRua?: string;
  enderecoNumero?: string;
  enderecoComplemento?: string;
  enderecoBairro?: string;
  enderecoMunicipio?: string;
  enderecoUf?: string;
  enderecoCep?: string;
  enderecoPontoReferencia?: string;
  enderecoLocalizacao?: "Urbano" | "Rural";
  enderecoAbrigo?: boolean;
  especificidadeSocial?: string;
  povoEtnia?: string;
}

export interface MembroFamiliar extends Pessoa {
  parentesco: string;
  ordem: number;
}

export interface CondicaoHabitacional {
  id: string;
  tipoMoradia: string;
  numeroComodos: number;
  condicoesEstruturais: string;
  abastecimento: string;
  saneamento: string;
  coleta: string;
  energia: string;
  dataRegistro: string;
  possuiAguaCanalizada: string;
  numeroDormitorios: number;
  mediaPessoasPorDormitorio: string;
  acessibilidade: string;
  riscoDesabamento: string;
  dificilAcesso: string;
  areaConflito: string;
  materialParedes: string;
  observacoesDiagnostico?: string;
}

export interface CondicaoEducacional {
  id: string;
  membroId: string;
  cidadaoId: string;
  escolaridade: string;
  alfabetizado: boolean;
  frequenciaEscolar: string;
  situacaoEscolar: string;
  observacoes: string;
  observacoesDiagnostico?: string;
  dataRegistro: string;
  dataOcorrencia?: string;
  efeito?: string;
  solicitadaSuspensao?: string;
}

export interface CondicaoTrabalho {
  id: string;
  membroId: string;
  cidadaoId: string;
  membroNome: string;
  ocupacao: string;
  vinculo: string;
  rendaIndividual: number;
  carteiraAssinada: boolean;
  desempregado: boolean;
  observacoes: string;
  dataRegistro: string;
}

export interface CondicaoSaude {
  id: string;
  membroId: string;
  doencasCronicas?: string[];
  necessidadesEspecificas?: string;
  deficiencia?: string;
  acompanhamentoMedico?: string | boolean;
  necessitaCuidadosConstantes?: string;
  cuidadosConstantesResponsavel?: string;
  doencasGraves?: string;
  remediosTarjaPreta?: string;
  usoAlcool?: string;
  usoDrogas?: string;
  usoDrogasQuais?: string;
  tratamentos?: string;
  medicacao?: string;
  dataRegistro: string;
}

export interface BeneficioEventual {
  id: string;
  tipo: string;
  dataConcessao: string;
  valor?: number;
  observacoes: string;
  observacao?: any;
  cpfFalecido?: any;
  data?: any;
  registroNascimento?: any;
}

export interface TransferenciaRendaResumo {
  id: string;
  beneficio: string;
  beneficioId: string;
  valor: number;
  dataRegistro: string;
}

export interface ParticipacaoServico {
  id: string;
  membroId: string;
  cidadaoId?: string;
  membroNome?: string;
  servico: string;
  dataInicio: string;
  dataFim?: string;
  frequencia: string;
  unidadeRealizacao?: string;
  observacoes: string;
}

export interface SituacaoViolencia {
  id: string;
  membroId: string;
  tipoViolencia: string;
  dataOcorrencia: string;
  autorViolencia: string;
  acompanhamento: boolean;
  medidasProtetivas: string;
  observacoes: string;
}

export interface MedidaSocioeducativa {
  id: string;
  membroId: string;
  medida: string;
  dataInicio: string;
  dataTermino?: string;
  responsavel: string;
  observacoes: string;
  acompanhadoCreas?: "SIM" | "NAO" | "";
  dataAnotacao?: string;
  observacaoAcompanhamento?: string;
}

export interface AcolhimentoInstitucional {
  id: string;
  membroId: string;
  instituicao: string;
  dataEntrada: string;
  dataSaida?: string;
  motivo: string;
  observacoes: string;
}

export interface EvolucaoAcompanhamento {
  id: string;
  data: string;
  tecnico: string;
  metas: string;
  necessidades: string;
  evolucao: string;
  visitasTecnicas: number;
  observacoes: string;
}

export interface AvaliacaoAcompanhamento {
  profissionalResponsavel: string;
  dataAvaliacao: string;
  mesesAcompanhamento: number;
  ofertasDisponibilizadas: "sim" | "parcialmente" | "nao";
  encaminhamentosResolutivos:
    | "sim"
    | "parcialmente"
    | "nao"
    | "nao_aplica";
  reconheceServico: "sim" | "parcialmente" | "nao";
  classificacaoResultados:
    | "agravamento"
    | "estavel"
    | "avanco"
    | "avanco_significativo";
  descricaoResultados: string;
}

export interface Encaminhamento {
  id: string;
  cpfReferencia: string;
  codigoArea: string;
  orgaoUnidadeDestino: string;
  objetivoMotivo: string;
  resumoAcompanhamento: string;
  dataRegistro: string;
  profissionalRegistro: string;
  unidadeOrigem: string;
  telefoneContatoOrigem?: string;
  unidadeDestino?: string;
  profissionalDestino?: string;
  observacoes?: string;
}

export interface ServicoAtendimento {
  id: string;
  servico: string;
  categoria: string;
  data?: string;
  membroNome?: string;
  status:
    | "Realizado"
    | "Não Realizado - Pré-requisito"
    | "Não Realizado - Recusa do Cidadão"
    | "Não Realizado - Indisponibilidade de Recurso"
    | "Cancelado";
  observacoes: string;
}

export interface ConvivenciaFamiliarResumo {
  tempoEstado?: number;
  tempoMunicipio?: number;
  tempoBairro?: number;
  vitimaAmeaca?: string;
  redeApoioParentes?: string;
  redeApoioVizinhos?: string;
  grupoReligioso?: string;
  movimentoSocial?: string;
  lazerCrianca?: string;
  lazerIdoso?: string;
  dependentesSemAdulto?: string;
  conflitosConjugais?: string;
  conflitosResponsaveis?: string;
  conflitosIrmaos?: string;
  conflitosOutros?: string;
  observacoes?: string;
}

export interface AvaliacaoAcompanhamentoResumo {
  ofertasAssistencia?: string;
  encaminhamentos?: string;
  vinculoFamilia?: string;
  statusVulnerabilidade?: string;
  analise?: string;
  dataRegistro?: string;
}

export interface CicloAcompanhamento {
  id: string;
  tipo: "INGRESSO" | "DESLIGAMENTO";
  data: string;
  motivo: string;
  observacoes?: string;
}

export interface DescumprimentoCondicionalidade {
  id: string;
  membroId: string;
  membroNome: string;
  dataOcorrencia: string;
  efeitoCodigo: string;
  efeito: string;
  ondeDescumpriu: string;
}

export interface Prontuario {
  versao: any;
  evolucaoAcompanhamento: any;
  numero: string;
  acompanhado?: boolean;
  unidade: string;
  pessoaReferenciaId: string;
  dataAbertura: string;
  rendaTotal?: number | string | null;
  rendaPerCapita?: number | string | null;
  membros: MembroFamiliar[];
  condicoesHabitacionais: CondicaoHabitacional[];
  condicoesEducacionais: CondicaoEducacional[];
  condicoesTrabalho: CondicaoTrabalho[];
  condicoesSaude: CondicaoSaude[];
  condicoesSaudeObservacoes?: string;
  beneficiosEventuais: BeneficioEventual[];
  transferenciasRenda?: TransferenciaRendaResumo[];
  participacoesServicos: ParticipacaoServico[];
  acessoBeneficiosServicos?: {
    beneficiosSociaisAtivos: string[];
    possuiBpc: boolean;
    possuiBolsaFamilia: boolean;
    beneficiosEventuaisTotal: number;
    ultimaConcessaoBeneficioEventual: string;
    servicosCrasEmAcompanhamento: string[];
    servicosCrasEmAcompanhamentoTotal: number;
    acompanhamentosCreasAtivos: number;
    proximaRenovacaoOuAcompanhamento: string;
  };
  convivenciaFamiliar?: ConvivenciaFamiliarResumo;
  avaliacaoAcompanhamento?: AvaliacaoAcompanhamentoResumo;
  ciclosAcompanhamento?: CicloAcompanhamento[];
  situacoesViolencia: SituacaoViolencia[];
  medidasSocioeducativas: MedidaSocioeducativa[];
  acolhimentos: AcolhimentoInstitucional[];
  evolucoes: EvolucaoAcompanhamento[];
  servicosAtendimento: ServicoAtendimento[];
  encaminhamentos: Encaminhamento[];
  descumprimentosCondicionalidades: DescumprimentoCondicionalidade[];
}
