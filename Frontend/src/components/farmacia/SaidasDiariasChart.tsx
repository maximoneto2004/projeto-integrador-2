import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FarmaciaResult } from "@/types/api";

// Quatro primeiros tons da paleta categórica validada; a legenda traz nome e total de cada um.
const CORES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"];

const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function SaidasDiariasChart({ saidas }: { saidas: FarmaciaResult["saidas_diarias"] }) {
  if (!saidas.medicamentos.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma saída de estoque nos últimos 30 dias.</p>;
  }
  const totais = Object.fromEntries(
    saidas.medicamentos.map((m) => [m.id, saidas.dias.reduce((acc, dia) => acc + Number(dia[m.id] || 0), 0)]),
  );
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={saidas.dias} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.4} />
        <XAxis dataKey="data" tickFormatter={diaMes} tick={{ fontSize: 12 }} minTickGap={24} tickLine={false} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} width={48} />
        <Tooltip labelFormatter={(valor) => diaMes(String(valor))} formatter={(valor: number, nome: string) => [`${valor} un.`, nome]} />
        <Legend verticalAlign="top" height={48} iconType="plainline" />
        {saidas.medicamentos.map((medicamento, indice) => (
          <Line
            key={medicamento.id}
            type="linear"
            dataKey={medicamento.id}
            name={`${medicamento.nome} (${totais[medicamento.id]} un.)`}
            stroke={CORES[indice]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
