export interface User {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
}

export interface ServicoRegistrado {
  id: string;
  servico: string;
  categoria: string;
  status:
    | "Realizado"
    | "Não Realizado - Pré-requisito"
    | "Não Realizado - Recusa do Cidadão"
    | "Não Realizado - Indisponibilidade de Recurso"
    | "Cancelado";
  observacoes: string;
}

export interface Appointment {
  id: string;
  unidade: string;
  unidadeId?: string;
  categoria: string;
  categoriaId?: string;
  servico: string;
  servicoId?: string;
  tipoId?: string;
  tipoAtendimento?: "Comum" | "Especial";
  tipoServicoNome?: string;
  data: string;
  hora: string;
  status:
    | "Marcado"
    | "Finalizado"
    | "Cancelado/Cidadão"
    | "Cancelado/Cras"
    | "Atendido"
    | "Aguardando"
    | "Ativado - Aguardando Atendimento"
    | "Atendimento"
    | "Ausente"
    | "Aguardando fila"
    | "Não Compareceu";
  nomeCidadao?: string;
  cpfCidadao?: string;
  telefoneCidadao?: string;
  atendente?: string;
  atendenteId?: string;
  guiche?: string;
  motivo?: string;
  motivoOutraUnidade?: string;
  servicosAdicionais?: string[];
  servicosRegistrados?: ServicoRegistrado[];
  horaInicioReal?: string;
  horaFimReal?: string;
  observacoes?: string;
  dataChamada?: string;
  horaChamada?: string;
  atendenteQueRealizouChamada?: string;
  tentativasChamada?: number;
  registrosPosAtendimento?: number;
  avaliacao?: {
    id?: string;
    nota: number;
    comentario: string;
  };
  prontuario?: unknown;
}
