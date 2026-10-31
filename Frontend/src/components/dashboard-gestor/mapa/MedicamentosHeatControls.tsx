import { Pill } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { MapaMedicamentosResult } from "@/types/mapaAssistencial";
import { nomeMedicamento } from "@/lib/mapaAssistencial";
import { SeletorComBusca } from "@/components/SeletorComBusca";

type Props = {
  data?: MapaMedicamentosResult;
  loading: boolean;
  error: boolean;
  onChange: (id: string) => void;
  onRetry: () => void;
  semLocalizacao: number;
};

export function MedicamentosHeatControls({ data, loading, error, onChange, onRetry, semLocalizacao }: Props) {
  return (
    <div className="space-y-3 rounded-xl border border-primary/20 bg-card p-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-primary"><Pill className="h-4 w-4" />Demanda por medicamento</h2>
      <div>
        <Label htmlFor="medicamento-mapa">Medicamento e apresentação</Label>
        <div className="mt-1">
          <SeletorComBusca
            id="medicamento-mapa"
            opcoes={(data?.medicamentos ?? []).map((med) => ({ valor: med.id, rotulo: nomeMedicamento(med), detalhe: `${med.solicitacoes} receitas no período` }))}
            valor={data?.medicamento?.id ?? ""}
            onChange={onChange}
            placeholder={loading && !data ? "Carregando..." : "Nenhum medicamento cadastrado"}
            placeholderBusca="Buscar medicamento..."
            vazio="Nenhum medicamento encontrado."
            desabilitado={!data?.medicamentos.length}
          />
        </div>
      </div>
      {loading && <p role="status" className="text-xs text-muted-foreground">Atualizando demanda...</p>}
      {error && <div role="alert" className="text-xs text-destructive">Não foi possível carregar os medicamentos.<Button size="sm" variant="outline" className="mt-2" onClick={onRetry}>Tentar novamente</Button></div>}
      {data && <>
        <div className="flex items-baseline gap-2"><strong className="text-2xl tabular-nums">{data.total_solicitacoes}</strong><span className="text-xs text-muted-foreground">solicitações na rede, no período</span></div>
        <div className="h-2 rounded-full" style={{ background: "linear-gradient(to right, #14b8a6, #facc15, #f97316, #dc2626)" }} aria-hidden="true" />
        <div className="flex justify-between text-[11px] text-muted-foreground"><span>Menor demanda</span><span>Maior: {data.maior_demanda} receitas</span></div>
        {!data.total_solicitacoes && <p className="rounded-md bg-muted p-2 text-xs">Nenhuma solicitação deste medicamento no período.</p>}
      </>}
      {semLocalizacao > 0 && <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900">{semLocalizacao} solicitações pertencem a unidades sem coordenadas. Elas estão na lista e não aparecem na camada de calor.</p>}
      <p className="text-xs leading-relaxed text-muted-foreground">Cada solicitação é uma receita com o medicamento, na unidade que o prescreveu. A intensidade indica concentração de solicitações; não representa estoque nem quantidade de comprimidos.</p>
    </div>
  );
}
