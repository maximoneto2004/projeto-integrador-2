export type OrigemAtendimento = "Demanda Espontanea" | "Busca Ativa" | "Demanda Encaminhada";

export type TelefoneTipo = "Proprio" | "Comunitario" | "Recado";

export interface ComposicaoFamiliarItem {
  id: string;
  ordem: number;
  nome: string;
  parentesco: string;
  beneficio: string;
  dataNascimento: string;
  escolaridade: string;
  ocupacao: string;
  renda: string;
}

export interface FichaAtendimento {
  id: string;
  appointmentId?: string;
  cras?: string;
  numeroInscricao?: string;
  tecnicoResponsavel?: string;
  funcao?: string;
  dataInclusao?: string;
  origemAtendimento: OrigemAtendimento;
  origemDetalhe?: string;
  participacoes: string[];
  numeroProntuarioSuas?: string;
  participacaoOutros?: string;

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

  composicaoFamiliar: ComposicaoFamiliarItem[];
  demandaApresentada?: string;
  encaminhamentos?: string;
  observacoes?: string;


  formaIngresso?: string;

  orgaoEncaminhou?: string;
  motivoPrimeiroAtendimento?: string;
  beneficios?: [];
  outrosBeneficios?: string;
  contatoOrgao?: string;

  createdAt: string;
  updatedAt: string;
}
