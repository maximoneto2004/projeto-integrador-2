export type DuvidaPergunta = {
  id: string;
  pergunta: string;
  resposta: string;
  is_active: boolean;
  criado_em?: string;
};
export type DuvidaListResponse = {
  success?: boolean;
  result?: DuvidaPergunta[];
  mensagem?: string;
};

export type DuvidaResponse = {
  success?: boolean;
  result?: DuvidaPergunta;
  mensagem?: string;
};

export type DuvidaPayload = {
  pergunta: string;
  resposta: string;
  is_active?: boolean;
};

export type DuvidaParams = {
  pergunta?: string;
};
