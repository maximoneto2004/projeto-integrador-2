import { useCallback, useState } from "react";
import { RefreshCw, Search, X } from "lucide-react";
import { PaginaSistema } from "@/components/PaginaSistema";
import { Paginacao } from "@/components/Paginacao";
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
import { useListaPaginada } from "@/hooks/sistema/useListaPaginada";
import { useDebounce } from "@/hooks/useDebounce";
import { estoqueService, type Movimentacao } from "@/services/sistema/estoqueService";
import { formatarData } from "@/utils/dataFormater";

const TODOS = "__todos__";

export default function MovimentacoesEstoquePage() {
  const unidadeTrabalho = useUnidadeTrabalho();
  const { unidadeId } = unidadeTrabalho;

  const [texto, setTexto] = useState("");
  const busca = useDebounce(texto.trim());
  const [tipoMov, setTipoMov] = useState<string>(TODOS);
  const [movInicio, setMovInicio] = useState("");
  const [movFim, setMovFim] = useState("");

  const temFiltro = !!texto || tipoMov !== TODOS || !!movInicio || !!movFim;
  const limparFiltros = () => {
    setTexto("");
    setTipoMov(TODOS);
    setMovInicio("");
    setMovFim("");
  };

  const buscarMovimentacoes = useCallback(
    (pagina: { limit: number; offset: number }) =>
      estoqueService.listarMovimentacoes({
        ...pagina,
        unidade: unidadeId,
        busca,
        tipo: tipoMov === TODOS ? undefined : tipoMov,
        data_inicio: movInicio || undefined,
        data_fim: movFim || undefined,
      }),
    [unidadeId, busca, tipoMov, movInicio, movFim],
  );
  const lista = useListaPaginada<Movimentacao>(unidadeId ? buscarMovimentacoes : null, {
    mensagemErro: "Não foi possível carregar as movimentações.",
  });
  const { itens: movimentacoes, carregando } = lista;

  return (
    <PaginaSistema
      titulo="Movimentações de estoque"
      subtitulo="Histórico de entradas, saídas, ajustes e perdas da unidade"
      acoes={
        <Button variant="outline" className="gap-2" onClick={lista.recarregar} disabled={carregando}>
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      }
    >
      <SeletorUnidadeTrabalho {...unidadeTrabalho} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-sm space-y-1">
          <Label htmlFor="mov-busca">Medicamento ou lote</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="mov-busca" className="pl-9" placeholder="Buscar..." value={texto} onChange={(e) => setTexto(e.target.value)} />
          </div>
        </div>
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
          <Input id="mov-inicio" type="date" max={movFim || undefined} value={movInicio} onChange={(e) => setMovInicio(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mov-fim">Até</Label>
          <Input id="mov-fim" type="date" min={movInicio || undefined} value={movFim} onChange={(e) => setMovFim(e.target.value)} />
        </div>
        {temFiltro && (
          <Button variant="ghost" className="gap-2" onClick={limparFiltros}>
            <X className="h-4 w-4" />
            Limpar filtros
          </Button>
        )}
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
          <TableBody className={carregando && movimentacoes.length ? "opacity-60 transition-opacity" : "transition-opacity"}>
            {!movimentacoes.length && (
              <LinhaVazia
                colunas={7}
                carregando={carregando}
                texto={temFiltro ? "Nenhuma movimentação para os filtros informados." : "Nenhuma movimentação registrada nesta unidade."}
              />
            )}
            {movimentacoes.map((m) => (
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

      <Paginacao
        paginaAtual={lista.pagina}
        totalItens={lista.total}
        tamanhoPagina={lista.tamanhoPagina}
        onMudarPagina={lista.setPagina}
        desabilitado={carregando}
      />
    </PaginaSistema>
  );
}
