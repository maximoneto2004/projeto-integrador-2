import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardGestorSemana } from "@/services/sistema/dashboardGestorService";

type SerieSemanalChartProps = {
  serie: DashboardGestorSemana[];
  campo: "consultas" | "absenteismo" | "pct_dentro_meta";
  nome: string;
  sufixo?: string;
  meta?: { valor: number; rotulo: string };
};

const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

// Uma medida por gráfico: consultas e taxas têm escalas diferentes e não dividem eixo.
export function SerieSemanalChart({ serie, campo, nome, sufixo = "", meta }: SerieSemanalChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={serie} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.4} />
        <XAxis dataKey="semana" tickFormatter={diaMes} tick={{ fontSize: 12 }} minTickGap={16} tickLine={false} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={48} unit={sufixo} allowDecimals={false} />
        <Tooltip
          labelFormatter={(valor) => `Semana de ${diaMes(String(valor))}`}
          formatter={(valor: number) => [valor === null ? "—" : `${valor.toLocaleString("pt-BR")}${sufixo}`, nome]}
        />
        {meta && (
          <ReferenceLine
            y={meta.valor}
            // A meta precisa aparecer mesmo quando os dados ficam longe dela.
            ifOverflow="extendDomain"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            label={{ value: meta.rotulo, position: "insideTopRight", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
        )}
        <Line type="linear" dataKey={campo} name={nome} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
