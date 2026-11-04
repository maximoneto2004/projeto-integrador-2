import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { META_ABSENTEISMO_MAX_PCT, META_OCUPACAO_MAX_PCT } from "@/constants/indicadores";
import type { DashboardGestorUnidade } from "@/services/sistema/dashboardGestorService";
import { SERIES } from "@/lib/coresGraficos";

type Ponto = { nome: string; ocupacao: number; absenteismo: number; agendamentos: number };

function Dica({ active, payload }: { active?: boolean; payload?: Array<{ payload: Ponto }> }) {
  if (!active || !payload?.length) return null;
  const ponto = payload[0].payload;
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
      <div className="font-medium">{ponto.nome}</div>
      <div>Ocupação da agenda: {ponto.ocupacao.toFixed(1)}%</div>
      <div>Não comparecimento: {ponto.absenteismo.toFixed(1)}%</div>
      <div>{ponto.agendamentos} agendamentos</div>
    </div>
  );
}

// Unidade cheia e com muita falta pede confirmação de presença, não mais vagas.
export function DispersaoOcupacaoAbsenteismo({ unidades }: { unidades: DashboardGestorUnidade[] }) {
  const pontos: Ponto[] = unidades
    .filter((u) => u.ocupacao !== null)
    .map((u) => ({ nome: u.nome_unidade, ocupacao: u.ocupacao ?? 0, absenteismo: u.taxa_nao_comparecimento, agendamentos: u.total_agendamentos }));
  if (!pontos.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma agenda aberta no período.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 16, right: 24, bottom: 16, left: 0 }}>
        <CartesianGrid strokeOpacity={0.4} />
        <XAxis
          type="number"
          dataKey="ocupacao"
          name="Ocupação"
          unit="%"
          domain={[0, 100]}
          tick={{ fontSize: 12 }}
          label={{ value: "Ocupação da agenda", position: "insideBottom", offset: -8, fontSize: 12 }}
        />
        <YAxis
          type="number"
          dataKey="absenteismo"
          name="Não comparecimento"
          unit="%"
          domain={[0, (max: number) => Math.max(30, Math.ceil(max / 5) * 5)]}
          tick={{ fontSize: 12 }}
          width={56}
        />
        <ZAxis type="number" dataKey="agendamentos" range={[80, 400]} name="Agendamentos" />
        <ReferenceLine x={META_OCUPACAO_MAX_PCT} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
        <ReferenceLine
          y={META_ABSENTEISMO_MAX_PCT}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
          label={{ value: `meta de faltas ${META_ABSENTEISMO_MAX_PCT}%`, position: "insideTopRight", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip content={<Dica />} cursor={{ strokeDasharray: "3 3" }} />
        <Scatter data={pontos} fill={SERIES[0]} fillOpacity={0.8} stroke="hsl(var(--background))" strokeWidth={2} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
