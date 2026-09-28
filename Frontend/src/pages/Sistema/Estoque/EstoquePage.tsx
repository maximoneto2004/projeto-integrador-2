import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRightLeft, Loader2, PackagePlus, Pencil, RefreshCw } from "lucide-react";
import { PaginaSistema } from "@/components/PaginaSistema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DialogEntradaLote } from "@/components/estoque/DialogEntradaLote";
import { DialogMovimentarLote } from "@/components/estoque/DialogMovimentarLote";
import { DialogEditarLote } from "@/components/estoque/DialogEditarLote";
import { TIPOS_MOVIMENTACAO, type TipoMovimentacao } from "@/constants/medicamentos";
import { useUnidadeTrabalho } from "@/hooks/sistema/useUnidadeTrabalho";
import { useAuth } from "@/contexts/AuthContext";
import { deriveRoleFromGroups } from "@/lib/authHelpers";
import { estoqueService, type Alertas, type Lote, type Movimentacao, type Saldo } from "@/services/sistema/estoqueService";
import { getApiErrorMessage } from "@/lib/notifications";
import { toast } from "@/lib/sonner";

type Aba = "saldo" | "lotes" | "movimentacoes" | "alertas";
const TODOS = "__todos__";

function formatarData(iso?: string | null, comHora = false) {
  if (!iso) return "-";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return comHora ? d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : d.toLocaleDateString("pt-BR");
}

function diasAte(iso: string) {
  const alvo = new Date(`${iso}T00:00:00`).getTime();
  const hoje = new Date(new Date().toLocaleDateString("en-CA") + "T00:00:00").getTime();
  return Math.round((alvo - hoje) / 86_400_000);
}

function LinhaVazia({ colunas, carregando, texto }: { colunas: number; carregando: boolean; texto: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colunas} className="py-8 text-center text-muted-foreground">
        {carregando ? (
          <>
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
            Carregando...
          </>
        ) : (
          texto
        )}
      </TableCell>
    </TableRow>
  );
}

export default function EstoquePage() {
  const { user } = useAuth();
  const podeGerenciar = deriveRoleFromGroups(user?.grupos) === "supervisor";
  const { unidadeId, setUnidadeId, unidades, podeEscolherUnidade } = useUnidadeTrabalho();
  const unidadeNome = unidades.find((u) => u.id === unidadeId)?.nome;

  const [aba, setAba] = useState<Aba>("saldo");
  const [carregando, setCarregando] = useState(false);

  const [saldos, setSaldos] = useState<Saldo[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [alertas, setAlertas] = useState<Alertas | null>(null);

  const [textoLote, setTextoLote] = useState("");
  const [somenteComSaldo, setSomenteComSaldo] = useState(true);
  const [tipoMov, setTipoMov] = useState<string>(TODOS);
  const [movInicio, setMovInicio] = useState("");
  const [movFim, setMovFim] = useState("");
  const [diasAlerta, setDiasAlerta] = useState("30");

  const [entradaAberta, setEntradaAberta] = useState(false);
  const [loteMovimentar, setLoteMovimentar] = useState<Lote | null>(null);
  const [tipoMovimentacaoInicial, setTipoMovimentacaoInicial] = useState<TipoMovimentacao>("PERDA");
  const [loteEditar, setLoteEditar] = useState<Lote | null>(null);

  const carregar = useCallback(async () => {
    if (!unidadeId) return;
    setCarregando(true);
    try {
      if (aba === "saldo") {
        setSaldos(await estoqueService.saldo({ unidade: unidadeId }));
      } else if (aba === "lotes") {
        setLotes(await estoqueService.listarLotes({ unidade: unidadeId, com_saldo: somenteComSaldo ? true : undefined }));
      } else if (aba === "movimentacoes") {
        setMovimentacoes(
          await estoqueService.listarMovimentacoes({
            unidade: unidadeId,
            tipo: tipoMov === TODOS ? undefined : tipoMov,
            data_inicio: movInicio || undefined,
            data_fim: movFim || undefined,
          }),
        );
      } else {
        setAlertas(await estoqueService.alertas({ unidade: unidadeId, dias: diasAlerta }));
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível carregar o estoque."));
    } finally {
      setCarregando(false);
    }
  }, [aba, unidadeId, somenteComSaldo, tipoMov, movInicio, movFim, diasAlerta]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const saldosOrdenados = useMemo(
    () => [...saldos].sort((a, b) => Number(b.abaixo_minimo) - Number(a.abaixo_minimo) || a.medicamento.localeCompare(b.medicamento)),
    [saldos],
  );

  const lotesFiltrados = useMemo(() => {
    const termo = textoLote.trim().toLowerCase();
    if (!termo) return lotes;
    return lotes.filter((l) => l.medicamento_descricao.toLowerCase().includes(termo) || l.numero_lote.toLowerCase().includes(termo));
  }, [lotes, textoLote]);

  const abrirMovimentacao = (lote: Lote, tipo: TipoMovimentacao) => {
    setTipoMovimentacaoInicial(tipo);
    setLoteMovimentar(lote);
  };

  const totalAlertas = alertas ? alertas.estoque_baixo.length + alertas.vencendo.length + alertas.vencidos.length : 0;

  return (
    <PaginaSistema
      titulo="Estoque de medicamentos"
      subtitulo={podeGerenciar ? "Lotes, movimentações e alertas da unidade" : "Consulta de disponibilidade na unidade"}
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
          <span className="font-medium">{unidadeNome ?? "Nenhuma unidade ativa"}</span>
        )}
      </div>

      <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)}>
        <TabsList>
          <TabsTrigger value="saldo">Saldo</TabsTrigger>
          <TabsTrigger value="lotes">Lotes</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
          <TabsTrigger value="alertas" className="gap-1">
            Alertas
            {aba === "alertas" && totalAlertas > 0 && <Badge variant="destructive">{totalAlertas}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saldo">
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
        </TabsContent>

        <TabsContent value="lotes" className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <Input
              className="max-w-sm"
              placeholder="Filtrar por medicamento ou lote"
              value={textoLote}
              onChange={(e) => setTextoLote(e.target.value)}
            />
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
              <TableBody>
                {(carregando || !lotesFiltrados.length) && (
                  <LinhaVazia colunas={podeGerenciar ? 7 : 6} carregando={carregando} texto="Nenhum lote encontrado." />
                )}
                {!carregando &&
                  lotesFiltrados.map((l) => (
                    <TableRow key={l.id} className={l.is_active ? "" : "opacity-60"}>
                      <TableCell className="font-medium">{l.medicamento_descricao}</TableCell>
                      <TableCell>{l.numero_lote}</TableCell>
                      <TableCell>
                        {formatarData(l.validade)}{" "}
                        {l.vencido && <Badge variant="destructive">Vencido</Badge>}
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
                          <Button variant="ghost" size="icon" title="Movimentar" onClick={() => abrirMovimentacao(l, "PERDA")}>
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
        </TabsContent>

        <TabsContent value="movimentacoes" className="space-y-3">
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
        </TabsContent>

        <TabsContent value="alertas" className="space-y-4">
          <div className="flex items-center gap-3">
            <Label>Lotes que vencem em até</Label>
            <Select value={diasAlerta} onValueChange={setDiasAlerta}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["15", "30", "60", "90"].map((d) => (
                  <SelectItem key={d} value={d}>
                    {d} dias
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {carregando && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!carregando && alertas && totalAlertas === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum alerta para esta unidade.</p>
          )}

          {!carregando && alertas && alertas.vencidos.length > 0 && (
            <Card className="border-red-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Lotes vencidos com saldo ({alertas.vencidos.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {alertas.vencidos.map((l) => (
                  <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>
                      <strong>{l.medicamento_descricao}</strong> · lote {l.numero_lote} · venceu em {formatarData(l.validade)} ·{" "}
                      {l.quantidade_atual} un.
                    </span>
                    {podeGerenciar && (
                      <Button size="sm" variant="outline" onClick={() => abrirMovimentacao(l, "PERDA")}>
                        Registrar descarte
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {!carregando && alertas && alertas.vencendo.length > 0 && (
            <Card className="border-amber-300">
              <CardHeader>
                <CardTitle className="text-amber-700">Vencendo em até {diasAlerta} dias ({alertas.vencendo.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {alertas.vencendo.map((l) => (
                  <p key={l.id}>
                    <strong>{l.medicamento_descricao}</strong> · lote {l.numero_lote} · vence em {formatarData(l.validade)} (
                    {diasAte(l.validade)} dias) · {l.quantidade_atual} un.
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          {!carregando && alertas && alertas.estoque_baixo.length > 0 && (
            <Card className="border-orange-300">
              <CardHeader>
                <CardTitle className="text-orange-700">Abaixo do estoque mínimo ({alertas.estoque_baixo.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {alertas.estoque_baixo.map((s) => (
                  <p key={`${s.medicamento_id}-${s.unidade_id}`}>
                    <strong>{s.medicamento}</strong> · disponível {s.saldo_disponivel} de mínimo {s.estoque_minimo}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <DialogEntradaLote
        open={entradaAberta}
        onOpenChange={setEntradaAberta}
        unidadeId={unidadeId}
        unidadeNome={unidadeNome}
        onSalvo={carregar}
      />
      <DialogMovimentarLote
        lote={loteMovimentar}
        tipoInicial={tipoMovimentacaoInicial}
        onOpenChange={(open) => !open && setLoteMovimentar(null)}
        onSalvo={carregar}
      />
      <DialogEditarLote lote={loteEditar} onOpenChange={(open) => !open && setLoteEditar(null)} onSalvo={carregar} />
    </PaginaSistema>
  );
}
