import { useCallback, useState } from "react";

import { bairroService } from "@/services/sistema/bairroService";
import type { Bairro } from "@/types/api";

export function useBairros() {
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetchBairros = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await bairroService.listar();
      const lista = Array.isArray(data?.result) ? data.result : Array.isArray(data) ? data : [];

      if (!lista.length && data?.success === false) {
        throw new Error(data?.mensagem || "Nenhum bairro encontrado.");
      }

      setBairros(lista.map((item) => ({ id: String(item.id), nome: item.nome || "" })));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { bairros, loading, error, fetchBairros };
}
