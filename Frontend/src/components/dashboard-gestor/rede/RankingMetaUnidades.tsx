import { META_DENTRO_PRAZO_MIN_PCT } from "@/constants/indicadores";
import { cn } from "@/lib/utils";
import type { DashboardGestorUnidade } from "@/services/sistema/dashboardGestorService";

export const unidadesMedidasNaMeta = (unidades: DashboardGestorUnidade[]) =>
  unidades.filter((u) => u.pct_dentro_meta !== null).sort((a, b) => (a.pct_dentro_meta ?? 0) - (b.pct_dentro_meta ?? 0));

// Barras em uma cor só; só as unidades abaixo da meta ganham destaque.
// Com `limite`, mostra só as piores, que são as que pedem ação.
export function RankingMetaUnidades({ unidades, limite }: { unidades: DashboardGestorUnidade[]; limite?: number }) {
  const medidas = unidadesMedidasNaMeta(unidades).slice(0, limite);
  if (!medidas.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma consulta medida no período.</p>;
  }
  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {medidas.map((unidade) => {
          const pct = unidade.pct_dentro_meta ?? 0;
          const abaixo = pct < META_DENTRO_PRAZO_MIN_PCT;
          return (
            <li key={unidade.unidade_id} title={`${unidade.nome_unidade}: ${pct.toFixed(1)}% de ${unidade.consultas} consultas`}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="truncate">{unidade.nome_unidade}</span>
                <span className={cn("shrink-0 tabular-nums", abaixo ? "font-semibold text-red-700" : "text-muted-foreground")}>
                  {Math.round(pct)}% · {unidade.consultas} consultas
                </span>
              </div>
              <div className="relative h-2 rounded bg-muted">
                <div className={cn("h-2 rounded", abaixo ? "bg-red-600" : "bg-primary")} style={{ width: `${pct}%` }} />
                <div className="absolute -top-1 h-4 w-0.5 bg-foreground/60" style={{ left: `${META_DENTRO_PRAZO_MIN_PCT}%` }} aria-hidden />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">A marca vertical indica a meta de {META_DENTRO_PRAZO_MIN_PCT}% das consultas dentro do tempo do serviço.</p>
    </div>
  );
}
