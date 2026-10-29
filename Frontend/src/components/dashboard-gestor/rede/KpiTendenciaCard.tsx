import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KpiTendenciaCardProps = {
  title: string;
  valor: number | null;
  formatar: (valor: number) => string;
  // Sem `anterior`, o card não compara períodos (por exemplo, uma foto do estoque agora).
  anterior?: number | null;
  // "maior" quando subir é bom, "menor" quando cair é bom, "neutro" quando só importa o volume.
  melhorQuando?: "maior" | "menor" | "neutro";
  unidadeVariacao?: "%" | "pp" | "min";
  meta?: { texto: string; atingida: boolean | null };
};

const descreverVariacao = (delta: number, unidade: KpiTendenciaCardProps["unidadeVariacao"]) => {
  const sinal = delta > 0 ? "+" : "";
  if (unidade === "pp") return `${sinal}${delta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.`;
  if (unidade === "min") return `${sinal}${Math.round(delta)} min`;
  return `${sinal}${delta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
};

export function KpiTendenciaCard({
  title,
  valor,
  formatar,
  anterior,
  melhorQuando = "neutro",
  unidadeVariacao = "%",
  meta,
}: KpiTendenciaCardProps) {
  let variacao: { texto: string; tom: "bom" | "ruim" | "neutro"; direcao: "sobe" | "desce" | "igual" } | null = null;
  if (valor !== null && anterior !== null && anterior !== undefined) {
    // Volume compara em %, taxas em pontos percentuais e tempos em minutos.
    const delta = unidadeVariacao === "%" ? (anterior ? ((valor - anterior) / anterior) * 100 : null) : valor - anterior;
    if (delta !== null) {
      const direcao = Math.abs(delta) < 0.05 ? "igual" : delta > 0 ? "sobe" : "desce";
      const melhorou = melhorQuando === "maior" ? delta > 0 : delta < 0;
      const tom = direcao === "igual" || melhorQuando === "neutro" ? "neutro" : melhorou ? "bom" : "ruim";
      variacao = { texto: direcao === "igual" ? "Estável" : descreverVariacao(delta, unidadeVariacao), tom, direcao };
    }
  }
  const IconeVariacao = variacao?.direcao === "sobe" ? ArrowUpRight : variacao?.direcao === "desce" ? ArrowDownRight : Minus;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-3xl font-bold tabular-nums">{valor === null ? "—" : formatar(valor)}</div>
        {anterior === undefined ? null : variacao ? (
          <p
            className={cn(
              "flex items-center gap-1 text-sm",
              variacao.tom === "bom" ? "text-emerald-700" : variacao.tom === "ruim" ? "text-red-700" : "text-muted-foreground",
            )}
          >
            <IconeVariacao className="h-4 w-4" aria-hidden />
            {variacao.texto} vs. período anterior
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Sem base no período anterior</p>
        )}
        {meta && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {meta.atingida === null ? null : meta.atingida ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-label="Meta atingida" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" aria-label="Fora da meta" />
            )}
            {meta.texto}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
