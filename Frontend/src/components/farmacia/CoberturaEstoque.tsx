import type { FarmaciaCobertura } from "@/types/api";
import { cn } from "@/lib/utils";

// Acima disso a barra fica cheia: o que importa é ver o que está perto de acabar.
const ESCALA_MAX_DIAS = 60;

type CoberturaEstoqueProps = {
  linhas: FarmaciaCobertura[];
  alertaDias: number;
};

const descreverCobertura = (linha: FarmaciaCobertura) => {
  if (linha.saldo_disponivel === 0) return "sem estoque";
  if (linha.dias_cobertura === null) return "sem consumo";
  return `${linha.dias_cobertura.toLocaleString("pt-BR")} dias`;
};

export function CoberturaEstoque({ linhas, alertaDias }: CoberturaEstoqueProps) {
  if (!linhas.length) return <p className="py-8 text-center text-sm text-muted-foreground">Nenhum medicamento em estoque.</p>;
  const marcaAlerta = (alertaDias / ESCALA_MAX_DIAS) * 100;
  return (
    <ul className="space-y-3">
      {linhas.map((linha) => {
        const dias = linha.saldo_disponivel === 0 ? 0 : linha.dias_cobertura;
        const largura = dias === null ? 100 : Math.min(dias / ESCALA_MAX_DIAS, 1) * 100;
        return (
          <li
            key={linha.medicamento_id}
            title={`${linha.medicamento}: ${linha.saldo_disponivel} em estoque, ${linha.consumo_30d} saídas em 30 dias`}
          >
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span className="truncate">{linha.medicamento}</span>
              <span className={cn("whitespace-nowrap tabular-nums", linha.em_alerta ? "font-semibold text-red-700" : "text-muted-foreground")}>
                {descreverCobertura(linha)} · {linha.saldo_disponivel} un.
              </span>
            </div>
            <div className="relative h-2 rounded bg-muted">
              <div
                className={cn("h-2 rounded", dias === null ? "bg-muted-foreground/30" : linha.em_alerta ? "bg-red-600" : "bg-primary")}
                style={{ width: `${largura}%` }}
              />
              <div className="absolute -top-1 h-4 w-0.5 bg-foreground/60" style={{ left: `${marcaAlerta}%` }} aria-hidden />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
