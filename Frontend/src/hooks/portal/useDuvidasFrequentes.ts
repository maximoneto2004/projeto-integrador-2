import { useCallback, useState } from "react";

import { duvidaService } from "@/services/sistema/duvidasService";
import type { DuvidaPergunta } from "@/types/duvidaFrequentes";

export function useDuvidas() {
  const [duvidas, setDuvidas] = useState<DuvidaPergunta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetchDuvidas = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await duvidaService.listar();

      const lista = Array.isArray(data?.result) ? data.result : Array.isArray(data) ? data : [];

      if (!lista.length && data?.success === false) {
        throw new Error(data?.mensagem || "Nenhuma dúvida encontrada.");
      }

      setDuvidas(
        lista.map((item) => ({
          id: String(item.id),
          pergunta: item.pergunta || "",
          resposta: item.resposta || "",
          is_active: item.is_active ?? true,
        })),
      );
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { duvidas, loading, error, fetchDuvidas };
}
