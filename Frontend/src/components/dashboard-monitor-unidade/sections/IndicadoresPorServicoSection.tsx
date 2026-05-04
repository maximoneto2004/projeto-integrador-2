import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ServicoMetricaItem = {
  servico_id: string;
  servico_nome: string;
  esperado_min: number;
  total: number;
  tempo_medio_atendimento_min: number;
  pct_acima_esperado: number;
};

type IndicadoresPorServicoSectionProps = {
  data: ServicoMetricaItem[];
  loading: boolean;
};

const PAGE_SIZE = 10;

export function IndicadoresPorServicoSection({ data, loading }: IndicadoresPorServicoSectionProps) {
  const [paginaAtual, setPaginaAtual] = useState(1);

  const totalPaginas = Math.max(1, Math.ceil(data.length / PAGE_SIZE));

  useEffect(() => {
    setPaginaAtual(1);
  }, [data]);

  const servicosPaginados = useMemo(
    () => data.slice((paginaAtual - 1) * PAGE_SIZE, paginaAtual * PAGE_SIZE),
    [data, paginaAtual],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Indicadores por serviço</CardTitle>
        <CardDescription>Métricas de duração e desempenho (apenas atendimentos finalizados)</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="px-2 py-2">Serviço</th>
              <th className="px-2 py-2">Total</th>
              <th className="px-2 py-2">Esperado</th>
              <th className="px-2 py-2">Tempo médio</th>
              <th className="px-2 py-2">% acima esperado</th>
            </tr>
          </thead>
          <tbody>
            {servicosPaginados.map((item) => (
              <tr key={item.servico_id} className="border-t">
                <td className="px-2 py-2">{item.servico_nome}</td>
                <td className="px-2 py-2">{item.total}</td>
                <td className="px-2 py-2">{item.esperado_min} min</td>
                <td className="px-2 py-2">{Math.round(item.tempo_medio_atendimento_min || 0)} min</td>
                <td className="px-2 py-2">{Number(item.pct_acima_esperado || 0).toFixed(1)}%</td>
              </tr>
            ))}
            {data.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">
                  Nenhuma métrica de serviço no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {data.length > PAGE_SIZE && (
          <div className="flex items-center justify-end mt-4 pr-4 pb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual((pagina) => Math.max(1, pagina - 1))}
                disabled={paginaAtual === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {paginaAtual} / {totalPaginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual((pagina) => Math.min(totalPaginas, pagina + 1))}
                disabled={paginaAtual >= totalPaginas}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
