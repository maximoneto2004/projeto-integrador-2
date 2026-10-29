import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FarmaciaResult } from "@/types/api";

// Cores de status (bom, atenção, crítico), sempre com o nome na legenda e no tooltip.
const SERIES = [
  { chave: "dispensados", nome: "Dispensados", cor: "#0ca30c" },
  { chave: "parciais", nome: "Parciais", cor: "#fab219" },
  { chave: "pendentes", nome: "Pendentes", cor: "#d03b3b" },
] as const;

const semana = (iso: string) => `Semana de ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function ItensReceitaChart({ semanas }: { semanas: FarmaciaResult["itens_receita"]["semanas"] }) {
  if (!semanas.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma receita emitida nos últimos 30 dias.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={semanas} margin={{ top: 8, right: 16, bottom: 0, left: -8 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} strokeOpacity={0.4} />
        <XAxis dataKey="semana" tickFormatter={(v) => `${String(v).slice(8, 10)}/${String(v).slice(5, 7)}`} tick={{ fontSize: 12 }} tickLine={false} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
        <Tooltip labelFormatter={(valor) => semana(String(valor))} formatter={(valor: number, nome: string) => [`${valor} itens`, nome]} />
        <Legend verticalAlign="top" height={28} />
        {SERIES.map((serie, indice) => (
          <Bar
            key={serie.chave}
            dataKey={serie.chave}
            name={serie.nome}
            stackId="itens"
            fill={serie.cor}
            stroke="hsl(var(--background))"
            strokeWidth={2}
            radius={indice === SERIES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
