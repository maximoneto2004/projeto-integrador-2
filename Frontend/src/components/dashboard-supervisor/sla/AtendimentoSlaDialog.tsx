import { CheckCircle2, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatSla, formatSlaDate } from "@/lib/sla";
import type { AtendimentoSla } from "@/types/sla";

type Props = { atendimento: AtendimentoSla | null; onClose: () => void };

export function AtendimentoSlaDialog({ atendimento, onClose }: Props) {
  if (!atendimento) return null;
  const { medicao } = atendimento;
  // Apenas fatos registrados: o horário agendado aparece separado dos eventos realizados.
  const marcos = [
    { titulo: "Agendamento criado", data: atendimento.created_at },
    { titulo: "Início da consulta", data: medicao.inicio },
    { titulo: "Encerramento da consulta", data: medicao.fim },
  ];
  const informacoes = [
    ["Paciente", atendimento.cidadao_nome],
    ["Profissional responsável", atendimento.profissional_nome || "Não vinculado"],
    ["Serviço", atendimento.servico_nome],
    ["Unidade", atendimento.unidade_nome],
    ["Horário agendado", formatSlaDate(medicao.agendado_em)],
    ["Origem", atendimento.origem || "Não registrada"],
  ];
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl bg-card" preventOutsideClose={false}>
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>Atendimento #{atendimento.identificador}</DialogTitle>
          <DialogDescription>Histórico operacional e tempo da consulta.</DialogDescription>
        </DialogHeader>
        <Badge variant="secondary" className="w-fit">{atendimento.situacao_nome}</Badge>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {informacoes.map(([nome, valor]) => <div key={nome}><dt className="text-xs text-muted-foreground">{nome}</dt><dd className="mt-0.5 break-words font-medium">{valor}</dd></div>)}
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div><p className="text-xs text-muted-foreground">Duração da consulta</p><p className="text-2xl font-bold text-primary">{formatSla(medicao.duracao_min)}</p></div>
          <div className="text-right text-sm">
            <p>Meta do serviço: {atendimento.meta_min ? formatSla(atendimento.meta_min) : "Não definida"}</p>
            {medicao.dentro_meta !== null && <p className={medicao.dentro_meta ? "font-medium text-emerald-700" : "font-medium text-amber-700"}>{medicao.dentro_meta ? "Dentro da meta" : "Acima da meta"}</p>}
          </div>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold">Linha do tempo</h3>
          <ol className="ml-2 border-l border-primary/25">
            {marcos.map((marco) => (
              <li key={marco.titulo} className="relative pb-5 pl-6 last:pb-0">
                <span className="absolute -left-2.5 top-0 rounded-full bg-card text-primary">{marco.data ? <CheckCircle2 className="h-5 w-5" /> : <Clock3 className="h-5 w-5 text-muted-foreground" />}</span>
                <p className="text-sm font-medium">{marco.titulo}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatSlaDate(marco.data)}</p>
              </li>
            ))}
          </ol>
        </div>
        {medicao.motivo && <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{medicao.motivo}</p>}
        {medicao.historico && <p className="text-xs text-muted-foreground">Registro histórico: alguns marcos têm apenas a hora registrada e usam a data do agendamento como referência. A data real desses marcos não está disponível.</p>}
        <p className="break-all border-t pt-3 text-xs text-muted-foreground">Identificador completo: {atendimento.id}</p>
      </DialogContent>
    </Dialog>
  );
}
