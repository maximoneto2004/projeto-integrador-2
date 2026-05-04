import { useCallback } from "react";

import { getApiErrorMessage } from "@/lib/notifications";
import {
  downloadAtividadesCadunicoCsv,
  downloadAtividadesCadunicoXlsx,
} from "@/utils/relatorio/atividadesCadunicoExport";
import { relatorioService, type RelatorioReferenciaParams } from "@/services/sistema/relatorioService";

type GerarRelatorioAtividadesCadunicoArgs = RelatorioReferenciaParams & {
  unidadeNome: string;
  nomeArquivo: string;
  formato: "csv" | "xlsx";
};

export function useAtividadesCadunicoRelatorio() {
  const gerarRelatorioAtividadesCadunico = useCallback(
    async ({ unidadeNome, nomeArquivo, formato, ...params }: GerarRelatorioAtividadesCadunicoArgs) => {
      try {
        const { data } = await relatorioService.obterAtividadesCadUnico(params);
        if (!data?.success || !data?.result) {
          throw new Error(data?.mensagem || "Resposta de relatório inválida.");
        }

        if (formato === "xlsx") {
          await downloadAtividadesCadunicoXlsx(data.result, nomeArquivo, unidadeNome);
        } else {
          downloadAtividadesCadunicoCsv(data.result, nomeArquivo, unidadeNome);
        }
        return data.result;
      } catch (error) {
        throw new Error(getApiErrorMessage(error, "Não foi possível gerar o relatório de atividades do CadÚnico."));
      }
    },
    []
  );

  return { gerarRelatorioAtividadesCadunico };
}
