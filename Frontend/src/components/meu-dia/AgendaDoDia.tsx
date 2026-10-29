import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APPOINTMENT_STATUS_OPTIONS, DEFAULT_APPOINTMENT_STATUS_COLOR, SITUACAO_PARA_STATUS } from "@/constants/agenda";
import { cn } from "@/lib/utils";
import type { MeuDiaAgendaItem } from "@/types/api";

const corDaSituacao = (item: MeuDiaAgendaItem) => {
  const status = SITUACAO_PARA_STATUS[item.situacao];
  const opcao = APPOINTMENT_STATUS_OPTIONS.find((o) => o.value === status);
  return { classe: opcao?.colorClass || DEFAULT_APPOINTMENT_STATUS_COLOR, rotulo: opcao?.label || item.situacao_nome };
};

const formatarDuracao = (item: MeuDiaAgendaItem) => {
  if (item.duracao_min === null) return "—";
  const duracao = `${Math.round(item.duracao_min)} min`;
  return item.meta_min ? `${duracao} / ${item.meta_min} min` : duracao;
};

export function AgendaDoDia({ itens }: { itens: MeuDiaAgendaItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Minha agenda do dia</CardTitle>
        <CardDescription>
          Agendamentos dos serviços que você atende. A espera conta a partir do horário marcado.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {itens.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-2 py-2 font-medium">Horário</th>
                <th className="px-2 py-2 font-medium">Paciente</th>
                <th className="px-2 py-2 font-medium">Serviço</th>
                <th className="px-2 py-2 font-medium">Situação</th>
                <th className="px-2 py-2 text-right font-medium">Duração / meta</th>
                <th className="px-2 py-2 text-right font-medium">Esperando há</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => {
                const { classe, rotulo } = corDaSituacao(item);
                const passouDaMeta = item.duracao_min !== null && !!item.meta_min && item.duracao_min > item.meta_min;
                return (
                  <tr key={item.id} className="border-t">
                    <td className="px-2 py-2 font-medium tabular-nums">{item.horario}</td>
                    <td className="px-2 py-2">{item.cidadao_nome}</td>
                    <td className="px-2 py-2 text-muted-foreground">{item.servico_nome}</td>
                    <td className="px-2 py-2">
                      <Badge variant="secondary" className={cn("font-medium", classe)}>{rotulo}</Badge>
                    </td>
                    <td className={cn("px-2 py-2 text-right tabular-nums", passouDaMeta && "font-semibold text-red-700")}>
                      {formatarDuracao(item)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {item.espera_min === null ? "—" : `${item.espera_min} min`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum agendamento para você neste dia.</p>
        )}
      </CardContent>
    </Card>
  );
}
