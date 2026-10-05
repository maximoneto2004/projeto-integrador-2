import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PaginaSistema } from "@/components/PaginaSistema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LinhaVazia } from "@/components/estoque/LinhaVazia";
import { SeletorUnidadeTrabalho } from "@/components/estoque/SeletorUnidadeTrabalho";
import { useUnidadeTrabalho } from "@/hooks/sistema/useUnidadeTrabalho";
import { estoqueService, type Saldo } from "@/services/sistema/estoqueService";
import { getApiErrorMessage } from "@/lib/notifications";
import { toast } from "@/lib/sonner";

export default function SaldoEstoquePage() {
  const unidadeTrabalho = useUnidadeTrabalho();
  const { unidadeId } = unidadeTrabalho;

  const [saldos, setSaldos] = useState<Saldo[]>([]);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    if (!unidadeId) return;
    setCarregando(true);
    try {
      setSaldos(await estoqueService.saldo({ unidade: unidadeId }));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível carregar o saldo."));
    } finally {
      setCarregando(false);
    }
  }, [unidadeId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const saldosOrdenados = useMemo(
    () => [...saldos].sort((a, b) => Number(b.abaixo_minimo) - Number(a.abaixo_minimo) || a.medicamento.localeCompare(b.medicamento)),
    [saldos],
  );

  return (
    <PaginaSistema
      titulo="Saldo de medicamentos"
      subtitulo="Disponibilidade de cada medicamento na unidade"
      acoes={
        <Button variant="outline" className="gap-2" onClick={carregar} disabled={carregando}>
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      }
    >
      <SeletorUnidadeTrabalho {...unidadeTrabalho} />

      <div className="overflow-x-auto rounded-2xl bg-card shadow-md">
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead>Medicamento</TableHead>
              <TableHead className="text-right">Disponível</TableHead>
              <TableHead className="text-right">Vencido</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(carregando || !saldosOrdenados.length) && (
              <LinhaVazia colunas={5} carregando={carregando} texto="Nenhum lote registrado nesta unidade." />
            )}
            {!carregando &&
              saldosOrdenados.map((s) => (
                <TableRow key={s.medicamento_id}>
                  <TableCell className="font-medium">{s.medicamento}</TableCell>
                  <TableCell className="text-right">{s.saldo_disponivel}</TableCell>
                  <TableCell className="text-right">{s.saldo_vencido || "—"}</TableCell>
                  <TableCell className="text-right">{s.estoque_minimo || "—"}</TableCell>
                  <TableCell>
                    {s.abaixo_minimo ? <Badge variant="destructive">Abaixo do mínimo</Badge> : <Badge variant="secondary">OK</Badge>}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </PaginaSistema>
  );
}
