import { api } from "@/services/api";
import type { Prontuario } from "@/types/prontuario";

export type PerfilFamiliarApiResult = Prontuario & {
  cpf: string;
  encontrado: boolean;
  versao?: string;
};

export type PerfilFamiliarApiResponse = {
  success?: boolean;
  results?: PerfilFamiliarApiResult;
};

export const perfilFamiliarService = {
  obterPorCpf(cpf: string) {
    return api.get<PerfilFamiliarApiResponse>("/perfil-familiar/", {
      params: { cpf },
    });
  },
};
