import { useCallback, useState } from "react";
import {
  // fetchIdentidadeCidadao,
  FortalezaDigitalIdentity,
  startLoginFortalezaDigital,
} from "@/services/portal/fortalezaDigital";

export function useFortalezaDigital() {
  const [identity, setIdentity] = useState<FortalezaDigitalIdentity>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(() => {
    startLoginFortalezaDigital();
  }, []);

  // const carregarIdentidade = useCallback(async () => {
  //   setLoading(true);
  //   setError(null);
  //   try {
  //     const data = await fetchIdentidadeCidadao();
  //     setIdentity(data);
  //     return data;
  //   } catch (err) {
  //     console.error(err);
  //     setError("Falha ao buscar identidade do Fortaleza Digital");
  //     return null;
  //   } finally {
  //     setLoading(false);
  //   }
  // }, []);

  const limparIdentidade = useCallback(() => {
    setIdentity(null);
  }, []);

  return {
    identity,
    loading,
    error,
    login,
    // carregarIdentidade,
    limparIdentidade,
  };
}

export type { FortalezaDigitalIdentity } from "@/services/portal/fortalezaDigital";
