import type { ClassificacaoRisco, MeuDiaResult } from "@/types/api";

// Cores do protocolo de classificação de risco; sempre acompanhadas do nome e do número.
const RISCO: Record<ClassificacaoRisco, { cor: string; rotulo: string }> = {
  VERMELHO: { cor: "#dc2626", rotulo: "Vermelho · emergência" },
  LARANJA: { cor: "#ea580c", rotulo: "Laranja · muito urgente" },
  AMARELO: { cor: "#ca8a04", rotulo: "Amarelo · urgente" },
  VERDE: { cor: "#16a34a", rotulo: "Verde · pouco urgente" },
  AZUL: { cor: "#2563eb", rotulo: "Azul · não urgente" },
};

export function ClassificacaoRiscoBarra({ dados }: { dados: MeuDiaResult["classificacao_risco"] }) {
  const total = dados.reduce((acc, item) => acc + item.total, 0);
  if (!total) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma classificação de risco registrada.</p>;
  }
  const presentes = dados.filter((item) => item.total > 0);
  return (
    <div className="space-y-4">
      <div className="flex h-6 w-full gap-[2px] overflow-hidden rounded" role="img" aria-label="Distribuição da classificação de risco">
        {presentes.map((item) => (
          <div
            key={item.classificacao}
            style={{ width: `${(item.total / total) * 100}%`, backgroundColor: RISCO[item.classificacao].cor }}
            title={`${RISCO[item.classificacao].rotulo}: ${item.total} (${Math.round((item.total / total) * 100)}%)`}
          />
        ))}
      </div>
      <ul className="space-y-1 text-sm">
        {dados.map((item) => (
          <li key={item.classificacao} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: RISCO[item.classificacao].cor }} aria-hidden />
              {RISCO[item.classificacao].rotulo}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {item.total} · {Math.round((item.total / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
