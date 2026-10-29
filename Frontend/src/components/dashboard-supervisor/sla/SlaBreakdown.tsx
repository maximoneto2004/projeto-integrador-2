import { ArrowUpRight, Stethoscope, BriefcaseMedical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSla } from "@/lib/sla";
import type { SlaGrupo } from "@/types/sla";

type Props = { tipo: "medico" | "servico"; grupos: SlaGrupo[]; onSelect: (id: string) => void };

export function SlaBreakdown({ tipo, grupos, onSelect }: Props) {
  const Icon = tipo === "medico" ? Stethoscope : BriefcaseMedical;
  const ordenados = [...grupos].sort((a, b) => (b.media_min ?? -1) - (a.media_min ?? -1));
  const maior = Math.max(1, ...grupos.map((g) => g.media_min ?? 0));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5 text-primary" /> SLA por {tipo === "medico" ? "médico" : "serviço"}
        </CardTitle>
        <CardDescription>
          Média das consultas concluídas. Selecione uma linha para ver os atendimentos.
        </CardDescription>
      </CardHeader>
      <CardContent className="max-h-80 space-y-2 overflow-y-auto">
        {!grupos.length && <p className="py-6 text-sm text-muted-foreground">Nenhum {tipo === "medico" ? "médico com consulta concluída" : "serviço concluído"} no período.</p>}
        {ordenados.map((grupo) => (
          <Button key={grupo.id} variant="ghost" className="h-auto w-full flex-col items-stretch gap-2 whitespace-normal rounded-xl border border-border/60 p-3 text-left" onClick={() => onSelect(grupo.id)}>
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0 break-words font-medium">{grupo.nome}</span>
              <span className="flex shrink-0 items-center gap-2 font-semibold tabular-nums text-primary">{formatSla(grupo.media_min)}<ArrowUpRight className="h-4 w-4" /></span>
            </span>
            <span className="flex flex-wrap justify-between gap-1 text-xs font-normal text-muted-foreground">
              <span>{grupo.medidos} de {grupo.total} consultas com medição</span>
              {tipo === "servico" && <span>Meta: {grupo.meta_min ? formatSla(grupo.meta_min) : "Não definida"}</span>}
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <span className="block h-full rounded-full bg-primary/70" style={{ width: `${((grupo.media_min ?? 0) / maior) * 100}%` }} />
            </span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
