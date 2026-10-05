import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { PaginaSistema } from "@/components/PaginaSistema";
import { Paginacao } from "@/components/Paginacao";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LinhaVazia } from "@/components/estoque/LinhaVazia";
import { SeletorUnidadeTrabalho } from "@/components/estoque/SeletorUnidadeTrabalho";
import { useUnidadeTrabalho } from "@/hooks/sistema/useUnidadeTrabalho";
import { estoqueService, type Saldo } from "@/services/sistema/estoqueService";
import { getApiErrorMessage } from "@/lib/notifications";
import { toast } from "@/lib/sonner";

const TAMANHO_PAGINA = 10;

export default function SaldoEstoquePage() {
  const unidadeTrabalho = useUnidadeTrabalho();
  const { unidadeId } = unidadeTrabalho;

  const [saldos, setSaldos] = useState<Saldo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [texto, setTexto] = useState("");
  const [somenteAbaixoMinimo, setSomenteAbaixoMinimo] = useState(false);
  const [pagina, setPagina] = useState(1);

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

  // O endpoint de saldo devolve a lista agregada da unidade inteira; filtro e paginação são locais.
  const saldosFiltrados = useMemo(() => {
    const termo = texto.trim().toLowerCase();
    return saldos
      .filter((s) => (!somenteAbaixoMinimo || s.abaixo_minimo) && (!termo || s.medicamento.toLowerCase().includes(termo)))
      .sort((a, b) => Number(b.abaixo_minimo) - Number(a.abaixo_minimo) || a.medicamento.localeCompare(b.medicamento));
  }, [saldos, texto, somenteAbaixoMinimo]);

  const totalAbaixoMinimo = useMemo(() => saldos.filter((s) => s.abaixo_minimo).length, [saldos]);

  useEffect(() => setPagina(1), [texto, somenteAbaixoMinimo, unidadeId]);

  const paginaSaldos = saldosFiltrados.slice((pagina - 1) * TAMANHO_PAGINA, pagina * TAMANHO_PAGINA);

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

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar medicamento" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={somenteAbaixoMinimo} onCheckedChange={setSomenteAbaixoMinimo} />
          Somente abaixo do mínimo
          {totalAbaixoMinimo > 0 && <Badge variant="destructive">{totalAbaixoMinimo}</Badge>}
        </label>
      </div>

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
          <TableBody className={carregando && paginaSaldos.length ? "opacity-60 transition-opacity" : "transition-opacity"}>
            {!paginaSaldos.length && (
              <LinhaVazia
                colunas={5}
                carregando={carregando}
                texto={saldos.length ? "Nenhum medicamento para os filtros informados." : "Nenhum lote registrado nesta unidade."}
              />
            )}
            {paginaSaldos.map((s) => (
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

      <Paginacao paginaAtual={pagina} totalItens={saldosFiltrados.length} tamanhoPagina={TAMANHO_PAGINA} onMudarPagina={setPagina} />
    </PaginaSistema>
  );
}
