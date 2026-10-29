import { useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAtendimentosSla } from "@/hooks/sistema/useAtendimentosSla";
import { formatSla, formatSlaDate } from "@/lib/sla";
import type { DashboardSupervisorParams } from "@/services/sistema/dashboardSupervisorService";
import type { AtendimentoSla, SlaResumo } from "@/types/sla";
import { AtendimentoSlaDialog } from "./AtendimentoSlaDialog";

export type SlaFiltros = { profissional_id: string; servico_id: string };
type Props = {
  params: DashboardSupervisorParams;
  resumo: SlaResumo;
  filtros: SlaFiltros;
  onFiltrosChange: (value: SlaFiltros) => void;
};
const PAGE_SIZE = 10;
const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AtendimentosSlaSection({ params, resumo, filtros, onFiltrosChange }: Props) {
  const [textoBusca, setTextoBusca] = useState("");
  const [busca, setBusca] = useState("");
  const [offset, setOffset] = useState(0);
  const [selecionado, setSelecionado] = useState<AtendimentoSla | null>(null);
  const { data, isLoading, isError, refetch, isFetching } = useAtendimentosSla({
    ...params, limit: PAGE_SIZE, offset,
    busca: busca || undefined,
    profissional_id: filtros.profissional_id || undefined,
    servico_id: filtros.servico_id || undefined,
  }, true);
  const total = data?.count ?? 0;

  return (
    <Card id="atendimentos-sla" className="scroll-mt-32">
      <CardHeader>
        <CardTitle className="text-lg">Atendimentos em detalhe</CardTitle>
        <CardDescription>Consulte cada atendimento e abra sua linha do tempo. O período e a unidade são os mesmos do dashboard.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr]">
          <form onSubmit={(event) => { event.preventDefault(); setBusca(textoBusca.trim()); setOffset(0); }}>
            <Label htmlFor="sla-busca">Buscar atendimento</Label>
            <div className="mt-1 flex gap-2">
              <Input id="sla-busca" placeholder="Paciente, identificador ou profissional" maxLength={150} value={textoBusca} onChange={(event) => setTextoBusca(event.target.value)} />
              <Button type="submit" variant="outline" size="icon" aria-label="Buscar atendimentos"><Search className="h-4 w-4" /></Button>
            </div>
          </form>
          <div>
            <Label htmlFor="sla-medico">Médico</Label>
            <select id="sla-medico" className={`${selectClass} mt-1`} value={filtros.profissional_id} onChange={(event) => onFiltrosChange({ ...filtros, profissional_id: event.target.value })}>
              <option value="">Todos os profissionais</option>
              {resumo.por_medico.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="sla-servico">Serviço</Label>
            <select id="sla-servico" className={`${selectClass} mt-1`} value={filtros.servico_id} onChange={(event) => onFiltrosChange({ ...filtros, servico_id: event.target.value })}>
              <option value="">Todos os serviços</option>
              {resumo.por_servico.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
            </select>
          </div>
        </div>
        {(filtros.profissional_id || filtros.servico_id) && <Button variant="ghost" size="sm" onClick={() => onFiltrosChange({ profissional_id: "", servico_id: "" })}>Limpar filtros de médico e serviço</Button>}
        <div aria-live="polite">
          {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Carregando atendimentos...</p>}
          {isError && <div role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm"><p>Não foi possível carregar os atendimentos.</p><Button variant="outline" size="sm" className="mt-2" onClick={() => void refetch()}>Tentar novamente</Button></div>}
          {!isLoading && !isError && !total && <p className="py-10 text-center text-sm text-muted-foreground">Nenhum atendimento encontrado para os filtros selecionados.</p>}
        </div>
        {!!data?.results.length && !isError && (
          <Table>
            <TableHeader><TableRow><TableHead>Atendimento / paciente</TableHead><TableHead>Profissional / serviço</TableHead><TableHead>Agendado para</TableHead><TableHead>Situação</TableHead><TableHead>Duração / meta</TableHead><TableHead><span className="sr-only">Ações</span></TableHead></TableRow></TableHeader>
            <TableBody>{data.results.map((item) => (
              <TableRow key={item.id}>
                <TableCell><p className="font-semibold text-primary">#{item.identificador}</p><p className="min-w-32 text-xs text-muted-foreground">{item.cidadao_nome}</p></TableCell>
                <TableCell><p className="min-w-36 font-medium">{item.profissional_nome || "Não vinculado"}</p><p className="text-xs text-muted-foreground">{item.servico_nome}</p></TableCell>
                <TableCell className="whitespace-nowrap text-xs">{formatSlaDate(item.medicao.agendado_em)}</TableCell>
                <TableCell><Badge variant="secondary" className="whitespace-nowrap">{item.situacao_nome}</Badge></TableCell>
                <TableCell className="whitespace-nowrap"><p className="font-semibold tabular-nums">{formatSla(item.medicao.duracao_min)}</p><p className="text-xs text-muted-foreground">Meta: {item.meta_min ? formatSla(item.meta_min) : "Não definida"}</p></TableCell>
                <TableCell><Button variant="outline" size="sm" aria-label={`Ver detalhes do atendimento ${item.identificador}`} onClick={() => setSelecionado(item)}>Ver detalhes</Button></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
        {!isLoading && !isError && total > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground" aria-live="polite">{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} de {total} atendimentos</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0 || isFetching} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button>
            <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total || isFetching} onClick={() => setOffset(offset + PAGE_SIZE)}>Próxima<ChevronRight className="ml-1 h-4 w-4" /></Button>
          </div>
        </div>}
        <AtendimentoSlaDialog atendimento={selecionado} onClose={() => setSelecionado(null)} />
      </CardContent>
    </Card>
  );
}
