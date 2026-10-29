import { useState } from "react";
import { Clock3, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatSla } from "@/lib/sla";
import type { DashboardSupervisorParams } from "@/services/sistema/dashboardSupervisorService";
import type { SlaResumo } from "@/types/sla";
import { SlaBreakdown } from "./SlaBreakdown";
import { AtendimentosSlaSection, type SlaFiltros } from "./AtendimentosSlaSection";

type Props = { params: DashboardSupervisorParams; resumo?: SlaResumo; loading: boolean; unidadeNome: string };

export function SupervisorSlaSection({ params, resumo, loading, unidadeNome }: Props) {
  const [filtros, setFiltros] = useState<SlaFiltros>({ profissional_id: "", servico_id: "" });
  const filtrar = (value: SlaFiltros) => {
    setFiltros(value);
    document.getElementById("atendimentos-sla")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  if (loading) return <Card aria-busy="true"><CardContent className="py-10 text-sm text-muted-foreground">Carregando indicadores de SLA...</CardContent></Card>;
  if (!resumo) return <Card><CardContent className="py-6 text-sm text-muted-foreground">Indicadores de SLA indisponíveis neste ambiente.</CardContent></Card>;
  return (
    <section aria-label="SLA de atendimento" className="space-y-4">
      <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-card to-primary/5">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary"><Clock3 className="h-5 w-5" />SLA médio de atendimento</p>
            <p className="text-5xl font-bold tracking-tight tabular-nums sm:text-6xl">{resumo.media_min === null ? "—" : formatSla(resumo.media_min)}</p>
            <p className="mt-3 text-sm font-medium">{unidadeNome}</p>
            <p className="mt-1 text-sm text-muted-foreground">Tempo entre o início e o encerramento de cada consulta.</p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-card p-4"><p className="text-2xl font-bold tabular-nums">{resumo.total_medidos}</p><p className="text-xs text-muted-foreground">Consultas usadas na média</p></div>
              <div className="rounded-xl border bg-card p-4"><p className="text-2xl font-bold tabular-nums">{resumo.sem_medicao}</p><p className="text-xs text-muted-foreground">Concluídas sem medição válida</p></div>
            </div>
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0" />A média considera apenas consultas encerradas com início e fim válidos. A retirada de medicamentos não aumenta esse tempo. As metas são as configuradas para cada serviço.</p>
            {resumo.media_min === null && <p className="text-sm text-muted-foreground">Ainda não há consultas com horários válidos neste período.</p>}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <SlaBreakdown tipo="medico" grupos={resumo.por_medico} onSelect={(id) => filtrar({ profissional_id: id, servico_id: "" })} />
        <SlaBreakdown tipo="servico" grupos={resumo.por_servico} onSelect={(id) => filtrar({ profissional_id: "", servico_id: id })} />
      </div>
      <AtendimentosSlaSection key={`${filtros.profissional_id}:${filtros.servico_id}`} params={params} resumo={resumo} filtros={filtros} onFiltrosChange={setFiltros} />
    </section>
  );
}
