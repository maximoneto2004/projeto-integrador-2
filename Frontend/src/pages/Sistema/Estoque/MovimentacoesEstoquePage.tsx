import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PaginaSistema } from "@/components/PaginaSistema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LinhaVazia } from "@/components/estoque/LinhaVazia";
import { SeletorUnidadeTrabalho } from "@/components/estoque/SeletorUnidadeTrabalho";
import { TIPOS_MOVIMENTACAO } from "@/constants/medicamentos";
import { useUnidadeTrabalho } from "@/hooks/sistema/useUnidadeTrabalho";
import { estoqueService, type Movimentacao } from "@/services/sistema/estoqueService";
import { formatarData } from "@/utils/dataFormater";
import { getApiErrorMessage } from "@/lib/notifications";
import { toast } from "@/lib/sonner";

const TODOS = "__todos__";

export default function MovimentacoesEstoquePage() {
  const unidadeTrabalho = useUnidadeTrabalho();
  const { unidadeId } = unidadeTrabalho;

  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [tipoMov, setTipoMov] = useState<string>(TODOS);
  const [movInicio, setMovInicio] = useState("");
  const [movFim, setMovFim] = useState("");

  const carregar = useCallback(async () => {
    if (!unidadeId) return;
    setCarregando(true);
    try {
      setMovimentacoes(
        await estoqueService.listarMovimentacoes({
          unidade: unidadeId,
          tipo: tipoMov === TODOS ? undefined : tipoMov,
          data_inicio: movInicio || undefined,
          data_fim: movFim || undefined,
        }),
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível carregar as movimentações."));
    } finally {
      setCarregando(false);
    }
  }, [unidadeId, tipoMov, movInicio, movFim]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <PaginaSistema
      titulo="Movimentações de estoque"
      subtitulo="Histórico de entradas, saídas, ajustes e perdas da unidade"
      acoes={
        <Button variant="outline" className="gap-2" onClick={carregar} disabled={carregando}>
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      }
    >
      <SeletorUnidadeTrabalho {...unidadeTrabalho} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>Tipo</Label>
          <Select value={tipoMov} onValueChange={setTipoMov}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos</SelectItem>
              {TIPOS_MOVIMENTACAO.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="mov-inicio">De</Label>
          <Input id="mov-inicio" type="date" value={movInicio} onChange={(e) => setMovInicio(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mov-fim">Até</Label>
          <Input id="mov-fim" type="date" value={movFim} onChange={(e) => setMovFim(e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-card shadow-md">
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Medicamento / lote</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead className="text-right">Saldo após</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(carregando || !movimentacoes.length) && (
              <LinhaVazia colunas={7} carregando={carregando} texto="Nenhuma movimentação no período." />
            )}
            {!carregando &&
              movimentacoes.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap">{formatarData(m.data, true)}</TableCell>
                  <TableCell>
                    {m.tipo_display}
                    {m.receita_item && (
                      <Badge variant="outline" className="ml-2">
                        Receita
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {m.medicamento_descricao}
                    <span className="text-muted-foreground"> · lote {m.lote_numero}</span>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${m.quantidade < 0 ? "text-red-700" : "text-green-700"}`}>
                    {m.quantidade > 0 ? `+${m.quantidade}` : m.quantidade}
                  </TableCell>
                  <TableCell className="text-right">{m.saldo_apos}</TableCell>
                  <TableCell>{m.usuario_nome || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate" title={m.motivo ?? ""}>
                    {m.motivo || "—"}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </PaginaSistema>
  );
}
