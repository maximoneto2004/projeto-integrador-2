import { useCallback, useEffect, useRef, useState } from "react";
import type { Pagina } from "@/services/sistema/estoqueService";
import { getApiErrorMessage } from "@/lib/notifications";
import { toast } from "@/lib/sonner";

type Buscar<T> = (pagina: { limit: number; offset: number }) => Promise<Pagina<T>>;

/**
 * Lista paginada no servidor (limit/offset). `buscar` deve ser memoizada com os filtros como dependência:
 * quando ela muda, a lista volta para a primeira página. Passe null enquanto não houver o que buscar.
 */
export function useListaPaginada<T>(buscar: Buscar<T> | null, { tamanhoPagina = 10, mensagemErro = "Não foi possível carregar os dados." } = {}) {
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<Pagina<T>>({ itens: [], total: 0 });
  const [carregando, setCarregando] = useState(false);
  const ultimaRequisicao = useRef(0);

  // Reseta a página no mesmo render em que os filtros mudam, evitando uma requisição da página antiga.
  const [buscarAnterior, setBuscarAnterior] = useState(() => buscar);
  if (buscar !== buscarAnterior) {
    setBuscarAnterior(() => buscar);
    setPagina(1);
  }

  const carregar = useCallback(async () => {
    if (!buscar) return;
    const requisicao = ++ultimaRequisicao.current;
    setCarregando(true);
    try {
      const resultado = await buscar({ limit: tamanhoPagina, offset: (pagina - 1) * tamanhoPagina });
      // Ignora respostas de filtros/páginas que já foram substituídos.
      if (requisicao !== ultimaRequisicao.current) return;
      const ultimaPagina = Math.max(1, Math.ceil(resultado.total / tamanhoPagina));
      if (pagina > ultimaPagina) {
        // A lista encolheu (ex.: lote zerado saiu do filtro); vai para a última página existente.
        setPagina(ultimaPagina);
        return;
      }
      setDados(resultado);
    } catch (err) {
      if (requisicao === ultimaRequisicao.current) toast.error(getApiErrorMessage(err, mensagemErro));
    } finally {
      if (requisicao === ultimaRequisicao.current) setCarregando(false);
    }
  }, [buscar, pagina, tamanhoPagina, mensagemErro]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { ...dados, pagina, setPagina, tamanhoPagina, carregando, recarregar: carregar };
}
