import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  META_ABSENTEISMO_MAX_PCT,
  META_DENTRO_PRAZO_MIN_PCT,
  META_ESPERA_MAX_MIN,
  META_OCUPACAO_MAX_PCT,
  META_OCUPACAO_MIN_PCT,
} from "@/constants/indicadores";
import type { DashboardGestorUnidade } from "@/services/sistema/dashboardGestorService";

const pct = (valor: number) => `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const opcional = (valor: number | null | undefined, formatar: (v: number) => string) =>
  valor === null || valor === undefined ? "—" : formatar(valor);

export function TabelaUnidades({ unidades, limite, cabecalhoFixo }: { unidades: DashboardGestorUnidade[]; limite?: number; cabecalhoFixo?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className={cn(cabecalhoFixo && "sticky top-0 z-10 bg-background")}>
          <tr className="text-left text-muted-foreground">
            <th className="px-2 py-2 font-medium">Unidade</th>
            <th className="px-2 py-2 text-right font-medium">Agendamentos</th>
            <th className="px-2 py-2 text-right font-medium">Consultas</th>
            <th className="px-2 py-2 text-right font-medium">Faltas</th>
            <th className="px-2 py-2 text-right font-medium">Na meta</th>
            <th className="px-2 py-2 text-right font-medium">Espera</th>
            <th className="px-2 py-2 text-right font-medium">Ocupação</th>
            <th className="px-2 py-2 text-right font-medium">Fila</th>
            <th className="px-2 py-2 text-right font-medium">Abaixo do mínimo</th>
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {unidades.slice(0, limite).map((u) => {
            const ocupacaoFora = u.ocupacao !== null && (u.ocupacao < META_OCUPACAO_MIN_PCT || u.ocupacao > META_OCUPACAO_MAX_PCT);
            return (
              <tr key={u.unidade_id} className="border-t">
                <td className="px-2 py-2 font-medium">{u.nome_unidade}</td>
                <td className="px-2 py-2 text-right tabular-nums">{u.total_agendamentos}</td>
                <td className="px-2 py-2 text-right tabular-nums">{u.consultas}</td>
                <td className={cn("px-2 py-2 text-right tabular-nums", u.taxa_nao_comparecimento > META_ABSENTEISMO_MAX_PCT && "font-semibold text-red-700")}>
                  {pct(u.taxa_nao_comparecimento)}
                </td>
                <td className={cn("px-2 py-2 text-right tabular-nums", u.pct_dentro_meta !== null && u.pct_dentro_meta < META_DENTRO_PRAZO_MIN_PCT && "font-semibold text-red-700")}>
                  {opcional(u.pct_dentro_meta, pct)}
                </td>
                <td className={cn("px-2 py-2 text-right tabular-nums", u.tempo_medio_espera_min > META_ESPERA_MAX_MIN && "font-semibold text-red-700")}>
                  {Math.round(u.tempo_medio_espera_min)} min
                </td>
                <td className={cn("px-2 py-2 text-right tabular-nums", ocupacaoFora && "font-semibold text-red-700")}>
                  {opcional(u.ocupacao, pct)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{u.fila_aguardando}</td>
                <td className={cn("px-2 py-2 text-right tabular-nums", u.rupturas > 0 && "font-semibold text-red-700")}>{u.rupturas}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right">
                  <Link className="text-primary underline-offset-4 hover:underline" to={`/sistema/monitor-unidade?unidade=${u.unidade_id}`}>
                    Ver unidade
                  </Link>
                </td>
              </tr>
            );
          })}
          {!unidades.length && (
            <tr>
              <td colSpan={10} className="px-2 py-6 text-center text-muted-foreground">Nenhum agendamento no período.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
