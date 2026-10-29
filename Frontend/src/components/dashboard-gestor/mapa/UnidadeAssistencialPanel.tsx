import { Pill, BriefcaseMedical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatSla } from "@/lib/sla";
import type { AnaliseUnidade } from "@/types/mapaAssistencial";
import { nomeMedicamento } from "@/lib/mapaAssistencial";

export function ServicosUnidadePanel({ analise }: { analise: AnaliseUnidade }) {
  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base"><BriefcaseMedical className="h-5 w-5 text-primary" />Serviços e tempo médio de atendimento</CardTitle>
      <CardDescription>Oferta cadastrada e consultas concluídas no período. O tempo é medido do início ao fim da consulta, antes da retirada na farmácia.</CardDescription>
    </CardHeader>
    <CardContent>
      {!analise.servicos.length ? <p className="text-sm text-muted-foreground">Nenhum serviço ofertado ou concluído no período.</p> : <Table>
        <TableHeader><TableRow><TableHead>Serviço</TableHead><TableHead>Concluídos</TableHead><TableHead>Tempo médio</TableHead><TableHead>Meta</TableHead><TableHead>Com medição</TableHead></TableRow></TableHeader>
        <TableBody>{analise.servicos.map((servico) => <TableRow key={servico.id}>
          <TableCell><p className="font-medium">{servico.nome}</p><p className="text-xs text-muted-foreground">{servico.ofertado ? "Ofertado nesta unidade" : "Registrado no histórico de atendimentos"}</p></TableCell>
          <TableCell>{servico.concluidos}</TableCell><TableCell className="whitespace-nowrap font-semibold">{formatSla(servico.media_min)}</TableCell><TableCell className="whitespace-nowrap">{servico.meta_min ? formatSla(servico.meta_min) : "Não definida"}</TableCell><TableCell>{servico.medidos} de {servico.concluidos}</TableCell>
        </TableRow>)}</TableBody>
      </Table>}
    </CardContent>
  </Card>;
}

export function MedicamentosUnidadePanel({ analise }: { analise?: AnaliseUnidade | null }) {
  if (!analise) return <p className="text-sm text-muted-foreground">Dados de medicamentos indisponíveis neste ambiente.</p>;
  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base"><Pill className="h-5 w-5 text-primary" />Medicamentos mais solicitados</CardTitle>
      <CardDescription>Receitas emitidas pela unidade no período. A quantidade dispensada é a acumulada dessas receitas e pode incluir retiradas posteriores.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      {!analise.medicamentos.length ? <p className="text-sm text-muted-foreground">Nenhuma solicitação de medicamento cadastrado neste período.</p> : <Table>
        <TableHeader><TableRow><TableHead>Medicamento / apresentação</TableHead><TableHead>Receitas</TableHead><TableHead>Quantidade prescrita</TableHead><TableHead>Já dispensada</TableHead></TableRow></TableHeader>
        <TableBody>{analise.medicamentos.map((med) => <TableRow key={med.id}>
          <TableCell><p className="font-medium">{nomeMedicamento(med)}</p>{med.itens_sem_quantidade > 0 && <p className="text-xs text-muted-foreground">{med.itens_sem_quantidade} itens sem quantidade informada</p>}</TableCell>
          <TableCell className="font-semibold">{med.solicitacoes}</TableCell><TableCell>{med.quantidade_prescrita ?? "Não informada"}</TableCell><TableCell>{med.quantidade_dispensada}</TableCell>
        </TableRow>)}</TableBody>
      </Table>}
      {analise.itens_legados_sem_catalogo > 0 && <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">{analise.itens_legados_sem_catalogo} itens de receitas antigas não têm vínculo com o catálogo. Eles não são agrupados por medicamento no mapa.</p>}
      <p className="text-xs text-muted-foreground">Quantidades são unidades de dispensação de cada apresentação (comprimidos, frascos etc.).</p>
    </CardContent>
  </Card>;
}
