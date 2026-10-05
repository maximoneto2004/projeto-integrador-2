import { useCallback, useState } from "react";
import { ArrowRightLeft, PackagePlus, Pencil, RefreshCw, Search } from "lucide-react";
import { PaginaSistema } from "@/components/PaginaSistema";
import { Paginacao } from "@/components/Paginacao";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DialogEntradaLote } from "@/components/estoque/DialogEntradaLote";
import { DialogMovimentarLote } from "@/components/estoque/DialogMovimentarLote";
import { DialogEditarLote } from "@/components/estoque/DialogEditarLote";
import { LinhaVazia } from "@/components/estoque/LinhaVazia";
import { SeletorUnidadeTrabalho } from "@/components/estoque/SeletorUnidadeTrabalho";
import { useUnidadeTrabalho } from "@/hooks/sistema/useUnidadeTrabalho";
import { useListaPaginada } from "@/hooks/sistema/useListaPaginada";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/contexts/AuthContext";
import { deriveRoleFromGroups } from "@/lib/authHelpers";
import { estoqueService, type Lote } from "@/services/sistema/estoqueService";
import { formatarData } from "@/utils/dataFormater";

export default function LotesEstoquePage() {
  const { user } = useAuth();
  // O administrador só consulta; o backend libera escrita apenas ao supervisor.
  const podeGerenciar = deriveRoleFromGroups(user?.grupos) === "supervisor";
  const unidadeTrabalho = useUnidadeTrabalho();
  const { unidadeId, unidades } = unidadeTrabalho;
  const unidadeNome = unidades.find((u) => u.id === unidadeId)?.nome;

  const [textoLote, setTextoLote] = useState("");
  const busca = useDebounce(textoLote.trim());
  const [somenteComSaldo, setSomenteComSaldo] = useState(true);

  const [entradaAberta, setEntradaAberta] = useState(false);
  const [loteMovimentar, setLoteMovimentar] = useState<Lote | null>(null);
  const [loteEditar, setLoteEditar] = useState<Lote | null>(null);

  const buscarLotes = useCallback(
    (pagina: { limit: number; offset: number }) =>
      estoqueService.listarLotes({ ...pagina, unidade: unidadeId, busca, com_saldo: somenteComSaldo ? true : undefined }),
    [unidadeId, busca, somenteComSaldo],
  );
  const lista = useListaPaginada<Lote>(unidadeId ? buscarLotes : null, { mensagemErro: "Não foi possível carregar os lotes." });
  const { itens: lotes, carregando, recarregar: carregar } = lista;

  return (
    <PaginaSistema
      titulo="Lotes de medicamentos"
      subtitulo="Lotes recebidos pela unidade"
      acoes={
        <>
          <Button variant="outline" className="gap-2" onClick={carregar} disabled={carregando}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          {podeGerenciar && (
            <Button className="gap-2" onClick={() => setEntradaAberta(true)} disabled={!unidadeId}>
              <PackagePlus className="h-4 w-4" />
              Entrada de lote
            </Button>
          )}
        </>
      }
    >
      <SeletorUnidadeTrabalho {...unidadeTrabalho} />

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por medicamento ou número do lote"
            value={textoLote}
            onChange={(e) => setTextoLote(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={somenteComSaldo} onCheckedChange={setSomenteComSaldo} />
          Somente lotes com saldo
        </label>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-card shadow-md">
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead>Medicamento</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Entrada</TableHead>
              {podeGerenciar && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody className={carregando && lotes.length ? "opacity-60 transition-opacity" : "transition-opacity"}>
            {!lotes.length && (
              <LinhaVazia
                colunas={podeGerenciar ? 7 : 6}
                carregando={carregando}
                texto={busca ? `Nenhum lote encontrado para "${busca}".` : "Nenhum lote encontrado."}
              />
            )}
            {lotes.map((l) => (
              <TableRow key={l.id} className={l.is_active ? "" : "opacity-60"}>
                <TableCell className="font-medium">{l.medicamento_descricao}</TableCell>
                <TableCell>{l.numero_lote}</TableCell>
                <TableCell>
                  {formatarData(l.validade)} {l.vencido && <Badge variant="destructive">Vencido</Badge>}
                  {!l.is_active && <Badge variant="outline">Inativo</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  {l.quantidade_atual}
                  <span className="text-muted-foreground"> / {l.quantidade_inicial}</span>
                </TableCell>
                <TableCell>{l.fornecedor || "—"}</TableCell>
                <TableCell>{formatarData(l.data_entrada)}</TableCell>
                {podeGerenciar && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" title="Movimentar" onClick={() => setLoteMovimentar(l)}>
                      <ArrowRightLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => setLoteEditar(l)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Paginacao
        paginaAtual={lista.pagina}
        totalItens={lista.total}
        tamanhoPagina={lista.tamanhoPagina}
        onMudarPagina={lista.setPagina}
        desabilitado={carregando}
      />

      <DialogEntradaLote
        open={entradaAberta}
        onOpenChange={setEntradaAberta}
        unidadeId={unidadeId}
        unidadeNome={unidadeNome}
        onSalvo={carregar}
      />
      <DialogMovimentarLote
        lote={loteMovimentar}
        tipoInicial="PERDA"
        onOpenChange={(open) => !open && setLoteMovimentar(null)}
        onSalvo={carregar}
      />
      <DialogEditarLote lote={loteEditar} onOpenChange={(open) => !open && setLoteEditar(null)} onSalvo={carregar} />
    </PaginaSistema>
  );
}
