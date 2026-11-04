import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MeuDiaResult } from "@/types/api";
import { SERIES } from "@/lib/coresGraficos";

type Ponto = MeuDiaResult["serie"][number];

const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function Dica({ active, payload }: { active?: boolean; payload?: Array<{ payload: Ponto }> }) {
  if (!active || !payload?.length) return null;
  const ponto = payload[0].payload;
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
      <div className="font-medium">{diaMes(ponto.data)}</div>
      {ponto.tempo_medio_atendimento_min === null ? (
        <div className="text-muted-foreground">Sem consultas medidas</div>
      ) : (
        <>
          <div>Meu tempo médio: {ponto.tempo_medio_atendimento_min.toFixed(1)} min</div>
          <div>Meta média: {ponto.tempo_medio_esperado_min?.toFixed(1) ?? "—"} min</div>
          <div>
            {ponto.consultas} consultas
            {ponto.pct_dentro_meta === null ? "" : ` · ${Math.round(ponto.pct_dentro_meta)}% na meta`}
          </div>
        </>
      )}
    </div>
  );
}

// Meu tempo e meta usam a mesma unidade (minutos), por isso dividem um único eixo.
export function TempoConsultaChart({ serie }: { serie: MeuDiaResult["serie"] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={serie} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.4} />
        <XAxis dataKey="data" tickFormatter={diaMes} tick={{ fontSize: 12 }} minTickGap={24} tickLine={false} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} unit=" min" width={64} />
        <Tooltip content={<Dica />} />
        <Legend verticalAlign="top" height={28} iconType="plainline" />
        <Line
          type="monotone"
          dataKey="tempo_medio_atendimento_min"
          name="Meu tempo médio"
          stroke={SERIES[0]}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 5 }}
          connectNulls={false}
        />
        <Line
          type="stepAfter"
          dataKey="tempo_medio_esperado_min"
          name="Meta do serviço"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
