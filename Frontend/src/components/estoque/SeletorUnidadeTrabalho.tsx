import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { useUnidadeTrabalho } from "@/hooks/sistema/useUnidadeTrabalho";

type Props = ReturnType<typeof useUnidadeTrabalho>;

export function SeletorUnidadeTrabalho({ unidadeId, setUnidadeId, unidades, podeEscolherUnidade }: Props) {
  return (
    <div className="flex items-center gap-3">
      <Label className="whitespace-nowrap">Unidade:</Label>
      {podeEscolherUnidade ? (
        <Select value={unidadeId} onValueChange={setUnidadeId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Selecione a unidade" />
          </SelectTrigger>
          <SelectContent>
            {unidades.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="font-medium">{unidades.find((u) => u.id === unidadeId)?.nome ?? "Nenhuma unidade ativa"}</span>
      )}
    </div>
  );
}
