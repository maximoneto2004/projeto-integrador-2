export interface Professional {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  unidades: string[];
  unidadeIds?: string[];
  telefone: string;
  email: string;
  dataAdmissao?: string;
  status: "Ativo" | "Inativo";
  escalaTrabalho?: string[];
  groups?: string[];
  servico?: string[];
  servicoIds?: string[];
}
export type UsuarioApi = {
  id: string;
  nome_completo: string;
  cpf: string;
  email: string;
  telefone?: string;
  unidades: string[];
  cargo?: string;
  status?: "Ativo" | "Inativo";
  groups?: { name?: string }[] | string[];
  guiche_atual?: { id: string; nome?: string } | string | null;
};
export type Cargo = {
  id: string;
  name: string;
};
