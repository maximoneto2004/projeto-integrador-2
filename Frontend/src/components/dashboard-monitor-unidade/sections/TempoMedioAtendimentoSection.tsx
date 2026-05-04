import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type TempoMedioAtendimentoSectionProps = {
  totalAgendamentos: number;
  tempoMedio: number;
};

const formatMinutes = (value: number) => `${Math.round(value)} min`;

export function TempoMedioAtendimentoSection({
  totalAgendamentos,
  tempoMedio,
}: TempoMedioAtendimentoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tempo médio de atendimento</CardTitle>
        <CardDescription>Calculado com início e fim registrados</CardDescription>
      </CardHeader>
      <CardContent className="flex h-72 items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold">{totalAgendamentos ? formatMinutes(tempoMedio) : "--"}</div>
          <p className="text-sm text-muted-foreground">Média no dia selecionado</p>
        </div>
      </CardContent>
    </Card>
  );
}
