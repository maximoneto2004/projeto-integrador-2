import { useMemo } from "react";

import { CardExpansivel } from "@/components/CardExpansivel";
import { cn } from "@/lib/utils";

type ServicoMetricaItem = {
  servico_id: string;
  servico_nome: string;
  esperado_min: number | null;
  total: number;
  tempo_medio_espera_min: number;
  tempo_medio_atendimento_min: number;
  pct_dentro_meta: number | null;
};

type IndicadoresPorServicoSectionProps = {
  data: ServicoMetricaItem[];
  loading: boolean;
};

// O card mostra os serviços de maior volume; o restante fica no modal.
const LIMITE = 6;

function TabelaServicos({ itens, loading, cabecalhoFixo }: { itens: ServicoMetricaItem[]; loading: boolean; cabecalhoFixo?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className={cn(cabecalhoFixo && "sticky top-0 z-10 bg-background")}>
          <tr className="text-left text-muted-foreground">
            <th className="px-2 py-2">Serviço</th>
            <th className="px-2 py-2">Total</th>
            <th className="px-2 py-2">Meta</th>
            <th className="px-2 py-2">Tempo médio</th>
            <th className="px-2 py-2">Espera média</th>
            <th className="px-2 py-2">% na meta</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.servico_id} className="border-t">
              <td className="px-2 py-2">{item.servico_nome}</td>
              <td className="px-2 py-2">{item.total}</td>
              <td className="px-2 py-2">{item.esperado_min ? `${item.esperado_min} min` : "—"}</td>
              <td className="px-2 py-2">{Math.round(item.tempo_medio_atendimento_min || 0)} min</td>
              <td className="px-2 py-2">{Math.round(item.tempo_medio_espera_min || 0)} min</td>
              <td className="px-2 py-2">{item.pct_dentro_meta === null ? "—" : `${item.pct_dentro_meta.toFixed(1)}%`}</td>
            </tr>
          ))}
          {itens.length === 0 && !loading && (
            <tr>
              <td colSpan={6} className="px-2 py-6 text-center text-muted-foreground">
                Nenhuma métrica de serviço no período.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function IndicadoresPorServicoSection({ data, loading }: IndicadoresPorServicoSectionProps) {
  const ordenados = useMemo(() => [...data].sort((a, b) => b.total - a.total), [data]);

  return (
    <CardExpansivel
      titulo="Indicadores por serviço"
      descricao="Consultas encerradas, incluindo as encaminhadas à farmácia"
      exibidos={Math.min(ordenados.length, LIMITE)}
      total={ordenados.length}
      rotuloItens="serviços, os de maior volume"
      expandido={() => <TabelaServicos itens={ordenados} loading={loading} cabecalhoFixo />}
    >
      <TabelaServicos itens={ordenados.slice(0, LIMITE)} loading={loading} />
    </CardExpansivel>
  );
}
