import { useEffect, useState } from "react";
import { toast } from "@/lib/sonner";

import { agendamentoService } from "@/services/sistema/agendamentoService";
import type { AgendaVaga, AgendaVagaListItem } from "@/types/api";
import { getApiErrorMessage } from "@/lib/notifications";

type UseAgendamentoPortalParams = {
  data?: string;
  tipoServico?: string;
  unidade?: string;
};

type VagaResponse = AgendaVaga[] | AgendaVagaListItem[];

export function useAgendamentoPortal(params: UseAgendamentoPortalParams) {
  const [vagas, setVagas] = useState<VagaResponse>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!params.data || !params.tipoServico || !params.unidade) {
      setVagas([]);
      return;
    }

    const carregar = async () => {
      setLoading(true);
      try {
        const { data: resposta } = await agendamentoService.listarVagas({
          data: params.data,
          tipo_servico: params.tipoServico,
          unidade: params.unidade,
        });
        if (!resposta?.success) {
          throw new Error((resposta as unknown as { result?: string }).result || "Falha ao carregar vagas.");
        }
        const lista = Array.isArray(resposta.result) ? resposta.result : [];
        setVagas(lista);
      } catch (err) {
        console.error(err);
        toast.error(getApiErrorMessage(err, "Não foi possível carregar vagas para a data selecionada."));
        setVagas([]);
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [params.data, params.tipoServico, params.unidade]);

  return { vagas, loading };
}
