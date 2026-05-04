import { useEffect, useMemo, useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreVertical, Edit3, Trash2, RefreshCcw } from "lucide-react";
import { toast } from "@/lib/sonner";
import { useCidadaos } from "@/hooks/sistema/useCidadaos";
import {
  useAtualizarUrgenciaFila,
  useChamarProximoFila,
  useCriarFilaEspera,
  useFilaEspera,
  useRemoverFilaEspera,
} from "@/hooks/sistema/useFilaEspera";
import type { FilaEsperaResponse, Prioridade, UrgenciaAtendimento } from "@/types/api";
import { agendarService } from "@/services/agendarService";
import { useAuth } from "@/contexts/AuthContext";
import { deriveRoleFromGroups } from "@/lib/authHelpers";

type SelectOption = { value: string; label: string };

const PRIORIDADE_OPTIONS: { value: Prioridade; label: string }[] = [
  { value: "NORMAL", label: "Normal" },
  { value: "PREFERENCIAL", label: "Preferencial" },
  { value: "PREFERENCIAL+", label: "Preferencial 80+" },
];

const URGENCIA_OPTIONS: { value: UrgenciaAtendimento; label: string }[] = [
  { value: "ALTA", label: "Alta" },
  { value: "NORMAL", label: "Normal" },
];
const normalizeCategoriaNome = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

const getPrioridadeBadge = (prioridade: Prioridade) => {
  const map: Record<Prioridade, { label: string; className: string }> = {
    NORMAL: { label: "Normal", className: "bg-slate-100 text-slate-800" },
    PREFERENCIAL: { label: "Preferencial", className: "bg-orange-100 text-orange-800" },
    "PREFERENCIAL+": { label: "Preferencial 80+", className: "bg-amber-100 text-amber-800" },
  };
  const cfg = map[prioridade] ?? map.NORMAL;
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
};

const getUrgenciaBadge = (urgencia: UrgenciaAtendimento) => {
  const map: Record<UrgenciaAtendimento, { label: string; className: string }> = {
    ALTA: { label: "Alta", className: "bg-red-100 text-red-800" },
    NORMAL: { label: "Normal", className: "bg-emerald-100 text-emerald-800" },
  };
  const cfg = map[urgencia] ?? map.NORMAL;
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
};

const AdminFilaEspera = () => {
  const { user } = useAuth();
  const criarFilaEspera = useCriarFilaEspera();
  const atualizarUrgencia = useAtualizarUrgenciaFila();
  const removerFila = useRemoverFilaEspera();

  const { cidadaos, fetchCidadaos, loading: carregandoCidadaos } = useCidadaos();
  const { mutateAsync: chamarProximoFila, isPending: callingNext } = useChamarProximoFila();
  const role = deriveRoleFromGroups(user?.grupos);
  const podeChamarProximo = role === "atendente";
  const exibirAcoes = role !== "atendente";
  const totalColunasTabela = exibirAcoes ? 7 : 6;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [urgenciaDialogOpen, setUrgenciaDialogOpen] = useState(false);
  const [itemParaUrgencia, setItemParaUrgencia] = useState<FilaEsperaResponse | null>(null);
  const [novaUrgencia, setNovaUrgencia] = useState<UrgenciaAtendimento>("NORMAL");
  const [itemParaExcluir, setItemParaExcluir] = useState<FilaEsperaResponse | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const pageSize = 10;
  const paramsPaginacao = useMemo(() => ({ limit: pageSize, offset: (paginaAtual - 1) * pageSize }), [paginaAtual]);
  const { data: filaData, isLoading, isFetching, error, refetch } = useFilaEspera(paramsPaginacao);
  const fila = filaData?.items ?? [];
  const totalItens = filaData?.count ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / pageSize));
  const paginaInicio = totalItens ? (paginaAtual - 1) * pageSize + 1 : 0;
  const paginaFim = Math.min(paginaAtual * pageSize, totalItens);

  const [cidadaoBusca, setCidadaoBusca] = useState("");
  const [cidadaoSelecionado, setCidadaoSelecionado] = useState("");
  const cidadaoOpcoes = useMemo(
    () =>
      cidadaos.map((c) => ({
        value: c.id,
        label: `${c.nome} - CPF: ${c.cpf}`,
      })),
    [cidadaos],
  );

  const [unidade, setUnidade] = useState(() => user?.unidade_ativa?.id || "");
  const [categoria, setCategoria] = useState("");
  const [opcoesCategorias, setOpcoesCategorias] = useState<SelectOption[]>([]);
  const [servico, setServico] = useState("");
  const [opcoesServicos, setOpcoesServicos] = useState<SelectOption[]>([]);
  const [prioridade, setPrioridade] = useState<Prioridade>("NORMAL");
  const [urgencia, setUrgencia] = useState<UrgenciaAtendimento>("NORMAL");
  const [carregandoCategorias, setCarregandoCategorias] = useState(false);
  const [carregandoServicos, setCarregandoServicos] = useState(false);

  useEffect(() => {
    if (user?.unidade_ativa?.id && user?.unidade_ativa?.id !== unidade) {
      setUnidade(user.unidade_ativa.id);
    }
  }, [user?.unidade_ativa?.id, unidade]);

  useEffect(() => {
    if (!unidade) {
      setCategoria("");
      setOpcoesCategorias([]);
      return;
    }

    const carregarCategorias = async () => {
      setCarregandoCategorias(true);
      try {
        const resp = await agendarService.listarTipos(unidade);
        const lista = (resp.data?.tipos || [])
          .map((tipo) => ({
            value: String(tipo.id),
            label: tipo.nome,
          }))
          .filter((tipo) => normalizeCategoriaNome(tipo.label) !== "ESPECIALIZADO ADICIONAL") as SelectOption[];
        setOpcoesCategorias(lista);
        if (!categoria && lista.length) {
          setCategoria(lista[0].value);
        }
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível carregar categorias.");
      } finally {
        setCarregandoCategorias(false);
      }
    };

    carregarCategorias();
  }, [unidade]);

  useEffect(() => {
    if (!unidade || !categoria) {
      setServico("");
      setOpcoesServicos([]);
      return;
    }

    const carregarServicos = async () => {
      setCarregandoServicos(true);
      try {
        const resp = await agendarService.listarServicos(unidade, categoria);
        const lista = (resp.data?.servicos || []).map((serv) => ({
          value: String(serv.id),
          label: serv.nome,
        })) as SelectOption[];
        setOpcoesServicos(lista);
        if (!servico && lista.length) {
          setServico(lista[0].value);
        }
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível carregar serviços.");
      } finally {
        setCarregandoServicos(false);
      }
    };

    carregarServicos();
  }, [categoria, unidade]);

  useEffect(() => {
    const termo = cidadaoBusca.trim();
    if (termo.length < 3) return;

    const timeout = setTimeout(() => {
      fetchCidadaos({ search: termo, limit: 10 });
    }, 400);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cidadaoBusca]);

  const limparFormulario = () => {
    setCidadaoBusca("");
    setCidadaoSelecionado("");
    setPrioridade("NORMAL");
    setUrgencia("NORMAL");
    setCategoria("");
    setServico("");
  };

  const onChamarProximo = async () => {
    try {
      await chamarProximoFila();
      toast.success("Próximo da fila chamado.");
      refetch();
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.result || err.message || "Não há pessoas na fila para chamar.";
      toast.error(msg);
    }
  };

  const onCriar = async () => {
    if (!cidadaoSelecionado) {
      toast.error("Selecione um cidadão.");
      return;
    }
    if (!unidade) {
      toast.error("Unidade não definida para o usuário.");
      return;
    }
    if (!categoria || !servico) {
      toast.error("Selecione categoria e serviço.");
      return;
    }

    try {
      await criarFilaEspera.mutateAsync({
        cidadao: cidadaoSelecionado,
        unidade,
        servico,
        prioridade,
        urgencia,
        status: "AGUARDANDO_FILA",
      });
      toast.success("Pessoa adicionada na fila de espera.");
      setDialogOpen(false);
      limparFormulario();
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.result || err?.message || "Não foi possível criar a fila de espera.";
      toast.error(msg);
    }
  };

  const abrirEdicaoUrgencia = (item: FilaEsperaResponse) => {
    setItemParaUrgencia(item);
    setNovaUrgencia(item.urgencia);
    setUrgenciaDialogOpen(true);
  };

  const confirmarUrgencia = async () => {
    if (!itemParaUrgencia) return;
    try {
      await atualizarUrgencia.mutateAsync({ id: itemParaUrgencia.id, urgencia: novaUrgencia });
      toast.success("Urgência atualizada.");
      setUrgenciaDialogOpen(false);
      setItemParaUrgencia(null);
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.result || err?.message || "Não foi possível atualizar a urgência.";
      toast.error(msg);
    }
  };

  const confirmarExclusao = async () => {
    if (!itemParaExcluir) return;
    try {
      await removerFila.mutateAsync(itemParaExcluir.id);
      toast.success("Fila de encaixe cancelada.");
      setItemParaExcluir(null);
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.result || err?.message || "Não foi possível cancelar.";
      toast.error(msg);
    }
  };

  useEffect(() => {
    setPaginaAtual(1);
  }, [totalItens]);

  const renderBody = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={totalColunasTabela} className="py-6 text-center text-muted-foreground">
            Carregando fila de espera...
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={totalColunasTabela} className="py-6 text-center text-destructive">
            {(error as Error).message || "Erro ao carregar fila de espera"}
          </TableCell>
        </TableRow>
      );
    }

    if (!fila.length) {
      return (
        <TableRow>
          <TableCell colSpan={totalColunasTabela} className="py-6 text-center text-muted-foreground">
            Nenhuma pessoa na fila de espera.
          </TableCell>
        </TableRow>
      );
    }

    return fila.map((item, index) => (
      <TableRow key={item.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
        <TableCell className="px-6 py-4 text-foreground">{paginaInicio + index}</TableCell>
        <TableCell className="px-6 py-4 text-foreground">
          <div className="font-semibold">{item.cidadao?.nome || "-"}</div>
          <div className="text-sm text-muted-foreground">{item.cidadao?.cpf || ""}</div>
        </TableCell>
        <TableCell className="px-6 py-4 text-foreground">
          <div>{item.cidadao?.telefone || "-"}</div>
        </TableCell>
        <TableCell className="px-6 py-4 text-foreground">{item.servico?.nome || "-"}</TableCell>
        <TableCell className="px-6 py-4 text-foreground">{getPrioridadeBadge(item.prioridade)}</TableCell>
        <TableCell className="px-6 py-4 text-foreground">{getUrgenciaBadge(item.urgencia)}</TableCell>
        {exibirAcoes && (
          <TableCell className="px-6 py-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => abrirEdicaoUrgencia(item)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Editar urgência
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => setItemParaExcluir(item)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Cancelar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        )}
      </TableRow>
    ));
  };

  return (
    <SidebarProvider>
      <RoleBasedSidebar />
      <SidebarInset>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Fila de Encaixe</h1>
              <p className="text-muted-foreground">Visualize, crie e ajuste a urgência dos itens da fila.</p>
            </div>
            <div className="flex items-center gap-2">
              {podeChamarProximo && (
                <Button onClick={onChamarProximo} disabled={callingNext}>
                  {callingNext ? "Chamando..." : "Chamar próximo"}
                </Button>
              )}
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
              <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) limparFormulario();
                }}
              >
                {user.grupos.includes("Atendente") ? null : (
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar a fila
                    </Button>
                  </DialogTrigger>
                )}
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar à fila de espera</DialogTitle>
                    <DialogDescription>Informe cidadão, unidade, serviço, prioridade e urgência.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="cidadaoBusca">Buscar cidadão (nome ou CPF)</Label>
                      <Input
                        id="cidadaoBusca"
                        placeholder="Digite ao menos 3 caracteres"
                        value={cidadaoBusca}
                        onChange={(e) => setCidadaoBusca(e.target.value)}
                      />
                      <Select
                        value={cidadaoSelecionado}
                        onValueChange={setCidadaoSelecionado}
                        disabled={carregandoCidadaos || cidadaoOpcoes.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={carregandoCidadaos ? "Carregando..." : "Selecione o cidadão"} />
                        </SelectTrigger>
                        <SelectContent>
                          {cidadaoOpcoes.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* 
                    <div className="grid gap-2">
                      <Label>Unidade</Label>
                      <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                        {user?.unidade_ativa?.nome || "Unidade não definida"}
                      </div>
                    </div> */}

                    <div className="grid gap-2">
                      <Label>Categoria</Label>
                      <Select
                        value={categoria}
                        onValueChange={(value) => {
                          setCategoria(value);
                          setServico("");
                        }}
                        disabled={!opcoesCategorias.length || carregandoCategorias}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={carregandoCategorias ? "Carregando..." : "Selecione a categoria"} />
                        </SelectTrigger>
                        <SelectContent>
                          {opcoesCategorias.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Serviço</Label>
                      <Select value={servico} onValueChange={setServico} disabled={!opcoesServicos.length || carregandoServicos}>
                        <SelectTrigger>
                          <SelectValue placeholder={carregandoServicos ? "Carregando..." : "Selecione o serviço"} />
                        </SelectTrigger>
                        <SelectContent>
                          {opcoesServicos.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>Prioridade</Label>
                        <Select value={prioridade} onValueChange={(value: Prioridade) => setPrioridade(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORIDADE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Urgência</Label>
                        <Select value={urgencia} onValueChange={(value: UrgenciaAtendimento) => setUrgencia(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {URGENCIA_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={onCriar} disabled={criarFilaEspera.isPending}>
                      {criarFilaEspera.isPending ? "Salvando..." : "Adicionar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary">
                  <TableRow>
                    <TableHead className="px-6 py-4 text-left font-bold text-foreground">Posição</TableHead>
                    <TableHead className="px-6 py-4 text-left font-bold text-foreground">Cidadão</TableHead>
                    <TableHead className="px-6 py-4 text-left font-bold text-foreground">Contato</TableHead>
                    <TableHead className="px-6 py-4 text-left font-bold text-foreground">Serviço</TableHead>
                    <TableHead className="px-6 py-4 text-left font-bold text-foreground">Prioridade</TableHead>
                    <TableHead className="px-6 py-4 text-left font-bold text-foreground">Urgência</TableHead>
                    {exibirAcoes && <TableHead className="px-6 py-4 text-left font-bold text-foreground">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>{renderBody()}</TableBody>
              </Table>
            </div>
          </div>
          {totalItens > 0 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                Mostrando {paginaInicio} - {paginaFim} de {totalItens}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 rounded border disabled:opacity-50"
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                >
                  Anterior
                </button>
                <span className="text-sm text-muted-foreground">
                  Página {paginaAtual} / {totalPaginas}
                </span>
                <button
                  className="px-3 py-2 rounded border disabled:opacity-50"
                  onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual >= totalPaginas}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </SidebarInset>

      <Dialog open={urgenciaDialogOpen} onOpenChange={setUrgenciaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar urgência</DialogTitle>
            <DialogDescription>Atualize a urgência da pessoa na fila de espera.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1">
              <span className="font-semibold">{itemParaUrgencia?.cidadao?.nome}</span>
              <span className="text-sm text-muted-foreground">{itemParaUrgencia?.cidadao?.cpf}</span>
            </div>
            <Select value={novaUrgencia} onValueChange={(value: UrgenciaAtendimento) => setNovaUrgencia(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {URGENCIA_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUrgenciaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarUrgencia} disabled={atualizarUrgencia.isPending}>
              {atualizarUrgencia.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemParaExcluir} onOpenChange={(open) => !open && setItemParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar item da fila</AlertDialogTitle>
            <AlertDialogDescription>
              Confirme para remover <strong>{itemParaExcluir?.cidadao?.nome}</strong> da fila de espera.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemParaExcluir(null)}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao} disabled={removerFila.isPending}>
              {removerFila.isPending ? "Removendo..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default AdminFilaEspera;
