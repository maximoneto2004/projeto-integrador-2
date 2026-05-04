import { type WheelEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown, ClipboardList, Eye, Loader2, Pencil, Plus, Settings } from "lucide-react";
import { toast } from "@/lib/sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBairros } from "@/hooks/sistema/useBairros";
import { useGuiches, type GuicheItem } from "@/hooks/sistema/useGuiches";
import { useAtualizarServicoUnidade, useCriarServicoUnidade, useServicosDisponiveis, useServicosUnidade } from "@/hooks/sistema/useServicosConfig";
import { useUnidadesCras, type UnidadeForm } from "@/hooks/useUnidadesCras";
import { getApiErrorMessage } from "@/lib/notifications";

type Unidade = {
  id: string;
  nome: string;
  logradouro: string;
  numero: string;
  complemento: string;
  cep: string;
  bairroId: string;
  bairrosAbrangenciaIds: string[];
  telefone: string;
  email: string;
  turnoManhaInicio: string;
  turnoManhaFim: string;
  turnoTardeInicio: string;
  turnoTardeFim: string;
  ativo: boolean;
};

type Guiche = GuicheItem;

const diasSemanaOptions = [
  { value: "DOM", label: "Domingo" },
  { value: "SEG", label: "Segunda-feira" },
  { value: "TER", label: "Terça-feira" },
  { value: "QUA", label: "Quarta-feira" },
  { value: "QUI", label: "Quinta-feira" },
  { value: "SEX", label: "Sexta-feira" },
  { value: "SAB", label: "Sabado" },
];

const unidadeVazia: Unidade = {
  id: "",
  nome: "",
  logradouro: "",
  numero: "",
  complemento: "",
  cep: "",
  bairroId: "",
  bairrosAbrangenciaIds: [],
  telefone: "",
  email: "",
  turnoManhaInicio: "",
  turnoManhaFim: "",
  turnoTardeInicio: "",
  turnoTardeFim: "",
  ativo: true,
};

const TELEFONE_MAX_DIGITOS = 11;
const CEP_MAX_DIGITOS = 8;
const NUMERO_MAX_DIGITOS = 5;

export default function AdminUnidadesPage() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [filtroBusca, setFiltroBusca] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const {
    unidades,
    total: totalItens,
    loading: carregandoUnidades,
    error: erroUnidades,
    fetchUnidades,
    createUnidade,
    updateUnidade,
  } = useUnidadesCras(filtroBusca, { page: paginaAtual, pageSize: 10, serverPagination: true });
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [modalGuichesAberto, setModalGuichesAberto] = useState(false);
  const [modalServicosAberto, setModalServicosAberto] = useState(false);
  const [bairroOpen, setBairroOpen] = useState(false);
  const [bairrosAbrangenciaOpen, setBairrosAbrangenciaOpen] = useState(false);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<Unidade | null>(null);
  const [unidadeForm, setUnidadeForm] = useState<Unidade>(unidadeVazia);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guicheUnidadeId, setGuicheUnidadeId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [servicosUnidadeId, setServicosUnidadeId] = useState<string | null>(null);

  const { bairros, loading: carregandoBairros, error: erroBairros, fetchBairros } = useBairros();

  const {
    guiches,
    unidadeId: guichesUnidadeId,
    loading: carregandoGuiches,
    error: erroGuiches,
    fetchGuiches,
    createGuiche,
    updateGuiche,
    deleteGuiche,
  } = useGuiches();
  const { data: servicosDisponiveis = [] } = useServicosDisponiveis();

  const servicosDisponiveisMap = useMemo(() => new Map(servicosDisponiveis.map((servico) => [servico.id, servico])), [servicosDisponiveis]);

  const {
    data: servicosUnidadeSelecionada = [],
    isLoading: carregandoServicosSelecionada,
    error: erroServicosSelecionada,
    refetch: refetchServicosSelecionada,
  } = useServicosUnidade(unidadeSelecionada?.id, modalVisualizarAberto);

  const {
    data: servicosUnidadeEdicao = [],
    isLoading: carregandoServicosEdicao,
    error: erroServicosEdicao,
    refetch: refetchServicosEdicao,
  } = useServicosUnidade(servicosUnidadeId ?? undefined, modalServicosAberto);

  const criarServicoUnidade = useCriarServicoUnidade();
  const atualizarServicoUnidade = useAtualizarServicoUnidade();

  useEffect(() => {
    fetchUnidades();
    if (!bairros.length) {
      fetchBairros();
    }
  }, [fetchUnidades, fetchBairros, bairros.length, filtroBusca]);

  useEffect(() => {
    if (erroUnidades) {
      toast.error(getApiErrorMessage(erroUnidades, "Não foi possível carregar as unidades."));
    }
  }, [erroUnidades]);

  useEffect(() => {
    if (!modalVisualizarAberto || !unidadeSelecionada?.id) return;
    fetchGuiches(unidadeSelecionada.id);
  }, [modalVisualizarAberto, unidadeSelecionada?.id, fetchGuiches]);

  useEffect(() => {
    if (!modalGuichesAberto || !guicheUnidadeId) return;
    fetchGuiches(guicheUnidadeId);
  }, [modalGuichesAberto, guicheUnidadeId, fetchGuiches]);

  useEffect(() => {
    if (modalGuichesAberto || !guicheUnidadeId) return;
    setGuicheUnidadeId(null);
  }, [modalGuichesAberto, guicheUnidadeId]);

  useEffect(() => {
    if (!modalFormAberto) {
      setBairroOpen(false);
      setBairrosAbrangenciaOpen(false);
    }
  }, [modalFormAberto]);

  useEffect(() => {
    if (modalServicosAberto || !servicosUnidadeId) return;
    setServicosUnidadeId(null);
  }, [modalServicosAberto, servicosUnidadeId]);

  const bairrosOptions = useMemo(
    () => bairros.map((bairro) => ({ id: String(bairro.id), nome: bairro.nome || "" })).filter((item) => item.nome),
    [bairros],
  );
  const bairrosPorId = useMemo(() => new Map(bairrosOptions.map((bairro) => [bairro.id, bairro.nome])), [bairrosOptions]);
  const getBairroNome = useCallback((bairroId: string) => bairrosPorId.get(bairroId) || bairroId || "-", [bairrosPorId]);
  const getBairrosAbrangencia = useCallback(
    (bairroIds: string[]) => (bairroIds.length ? bairroIds.map((bairroId) => getBairroNome(bairroId)).join(", ") : "-"),
    [getBairroNome],
  );

  const handleWheelOnCommandList = useCallback((event: WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    container.scrollTop += event.deltaY;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const pageSize = 10;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / pageSize));
  const paginaInicio = totalItens ? (paginaAtual - 1) * pageSize + 1 : 0;
  const paginaFim = Math.min(paginaAtual * pageSize, totalItens);
  const mostraSkeletonTabela = carregandoUnidades && unidades.length === 0;

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [paginaAtual, totalPaginas]);

  const abrirVisualizacao = (unidade: Unidade) => {
    setUnidadeSelecionada(unidade);
    setModalVisualizarAberto(true);
  };

  const abrirEdicao = (unidade: Unidade) => {
    setUnidadeForm(unidade);
    setEditandoId(unidade.id);
    setModalFormAberto(true);
  };

  const abrirNova = () => {
    setUnidadeForm(unidadeVazia);
    setEditandoId(null);
    setModalFormAberto(true);
  };

  const atualizarFormulario = (campo: keyof Unidade, valor: string | boolean | string[]) => {
    if (campo === "telefone" && typeof valor === "string") {
      const telefoneNumerico = valor.replace(/\D/g, "").slice(0, TELEFONE_MAX_DIGITOS);
      setUnidadeForm((atual) => ({ ...atual, telefone: telefoneNumerico }));
      return;
    }
    if (campo === "cep" && typeof valor === "string") {
      const cepNumerico = valor.replace(/\D/g, "").slice(0, CEP_MAX_DIGITOS);
      setUnidadeForm((atual) => ({ ...atual, cep: cepNumerico }));
      return;
    }
    if (campo === "numero" && typeof valor === "string") {
      const numeroNumerico = valor.replace(/\D/g, "").slice(0, NUMERO_MAX_DIGITOS);
      setUnidadeForm((atual) => ({ ...atual, numero: numeroNumerico }));
      return;
    }

    setUnidadeForm((atual) => ({ ...atual, [campo]: valor }));
  };

  const toggleBairroAbrangencia = (bairroId: string, checked: boolean) => {
    setUnidadeForm((atual) => {
      const atualizados = checked
        ? Array.from(new Set([...atual.bairrosAbrangenciaIds, bairroId]))
        : atual.bairrosAbrangenciaIds.filter((id) => id !== bairroId);
      return { ...atual, bairrosAbrangenciaIds: atualizados };
    });
  };

  const abrirGuicheModal = (unidadeId: string) => {
    setGuicheUnidadeId(unidadeId);
    setModalGuichesAberto(true);
  };

  const abrirServicosModal = (unidadeId: string) => {
    setServicosUnidadeId(unidadeId);
    setModalServicosAberto(true);
  };

  const salvarUnidade = async () => {
    if (
      !unidadeForm.nome.trim() ||
      !unidadeForm.logradouro.trim() ||
      !unidadeForm.numero.trim() ||
      !unidadeForm.cep.trim() ||
      !unidadeForm.bairroId ||
      !unidadeForm.telefone.trim() ||
      !unidadeForm.email.trim()
    ) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    const payload = {
      nome: unidadeForm.nome.trim(),
      logradouro: unidadeForm.logradouro.trim(),
      numero: unidadeForm.numero.trim(),
      complemento: unidadeForm.complemento.trim() || null,
      cep: unidadeForm.cep.trim(),
      bairro: unidadeForm.bairroId,
      bairros_abrangencia: unidadeForm.bairrosAbrangenciaIds,
      telefone: unidadeForm.telefone.trim(),
      email: unidadeForm.email.trim(),
      hora_manha_inicio: unidadeForm.turnoManhaInicio || null,
      hora_manha_fim: unidadeForm.turnoManhaFim || null,
      hora_tarde_inicio: unidadeForm.turnoTardeInicio || null,
      hora_tarde_fim: unidadeForm.turnoTardeFim || null,
      is_active: unidadeForm.ativo,
    };

    setSalvando(true);
    try {
      let unidadeSalva: UnidadeForm | null = null;

      if (editandoId) {
        unidadeSalva = await updateUnidade(editandoId, payload);
        if (!unidadeSalva) {
          throw new Error("Não foi possível atualizar a unidade.");
        }
        toast.success("Unidade atualizada com sucesso.");
      } else {
        unidadeSalva = await createUnidade(payload);
        if (!unidadeSalva) {
          throw new Error("Não foi possível criar a unidade.");
        }
        toast.success("Unidade criada com sucesso.");
      }

      await fetchUnidades();
      setModalFormAberto(false);
      setUnidadeForm(unidadeVazia);
      setEditandoId(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar a unidade."));
    } finally {
      setSalvando(false);
    }
  };

  const guichesVisualizacao = unidadeSelecionada && guichesUnidadeId === unidadeSelecionada.id ? guiches : [];
  const servicosVisualizacao = unidadeSelecionada ? servicosUnidadeSelecionada : [];
  const deveScrollServicos = servicosVisualizacao.length > 5;
  const getServicoNome = useCallback(
    (servicoId: string) => servicosDisponiveisMap.get(servicoId)?.nome || servicoId || "-",
    [servicosDisponiveisMap],
  );

  const handleBuscar = () => {
    setFiltroBusca(busca.trim());
    setPaginaAtual(1);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />

                <div>
                  <h1 className="text-3xl font-bold text-foreground">Unidades CRAS</h1>
                  <p className="text-muted-foreground">Crie, edite e visualize unidades</p>
                </div>
              </div>
              <Button onClick={abrirNova} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar unidade
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Unidades cadastradas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2 w-full ">
                  <Input
                    placeholder="Buscar por nome de unidade ou bairro..."
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBuscar();
                    }}
                    className="flex-1"
                  />
                  <Button onClick={handleBuscar} className="sm:w-auto w-full">
                    Buscar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {erroUnidades ? (
              <p className="text-xs text-destructive">
                Não foi possível carregar as unidades.{" "}
                <button type="button" className="underline" onClick={fetchUnidades}>
                  Tentar novamente
                </button>
              </p>
            ) : null}

            <div className="bg-card rounded-2xl shadow-md overflow-hidden">
              <div className="relative overflow-x-auto">
                {carregandoUnidades && unidades.length > 0 && (
                  <div
                    className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Buscando unidades...
                    </div>
                  </div>
                )}
                <Table className="w-full">
                  <TableHeader className="bg-secondary">
                    <TableRow>
                      <TableHead className="px-6 py-4 text-left font-bold text-foreground">Nome</TableHead>
                      <TableHead className="px-6 py-4 text-left font-bold text-foreground">Bairro</TableHead>
                      <TableHead className="px-6 py-4 text-left font-bold text-foreground">Telefone</TableHead>
                      <TableHead className="px-6 py-4 text-left font-bold text-foreground">Status</TableHead>
                      <TableHead className="px-6 py-4 text-right font-bold text-foreground">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mostraSkeletonTabela &&
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          <TableCell colSpan={5} className="px-6 py-4">
                            <div className="grid grid-cols-5 gap-4">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-4 w-16 justify-self-end" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    {!mostraSkeletonTabela &&
                      unidades.map((unidade, index) => (
                        <TableRow key={unidade.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                          <TableCell className="px-6 py-4 font-medium text-foreground">{unidade.nome}</TableCell>
                          <TableCell className="px-6 py-4 text-foreground">{getBairroNome(unidade.bairroId)}</TableCell>
                          <TableCell className="px-6 py-4 text-foreground">{unidade.telefone}</TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge variant={unidade.ativo ? "default" : "secondary"}>{unidade.ativo ? "Ativo" : "Inativo"}</Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => abrirVisualizacao(unidade)} title="Visualizar">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => abrirEdicao(unidade)} title="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    {!carregandoUnidades && unidades.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="px-6 py-4 text-center text-muted-foreground">
                          Nenhuma unidade encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
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
        </main>
      </div>

      <Dialog open={modalVisualizarAberto} onOpenChange={setModalVisualizarAberto}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-800">Detalhes da unidade</DialogTitle>
          </DialogHeader>

          {unidadeSelecionada && (
            <div className="space-y-8 py-4">
              {/* Seção: Dados Gerais */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label>
                  <p className="text-base font-semibold text-slate-900">{unidadeSelecionada.nome}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Bairro</Label>
                  <p className="text-base font-semibold text-slate-900">{getBairroNome(unidadeSelecionada.bairroId)}</p>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Bairros de abrangência</Label>
                  <p className="text-base font-semibold text-slate-900">{getBairrosAbrangencia(unidadeSelecionada.bairrosAbrangenciaIds)}</p>
                </div>
                <div className="md:col-span-1">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Endereço</Label>
                  <p className="text-base font-semibold text-slate-900">
                    {unidadeSelecionada.logradouro}, {unidadeSelecionada.numero}
                    {unidadeSelecionada.complemento ? ` - ${unidadeSelecionada.complemento}` : ""}
                  </p>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">CEP</Label>
                  <p className="text-base font-semibold text-slate-900">{unidadeSelecionada.cep || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Telefone</Label>
                  <p className="text-base font-semibold text-slate-900">{unidadeSelecionada.telefone}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">E-mail</Label>
                  <p className="text-base font-semibold text-slate-900">{unidadeSelecionada.email || "-"}</p>
                </div>
              </section>

              {/* Seção: Expediente */}
              <section className="bg-slate-50 p-4 rounded-xl">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">Expediente</Label>
                <div className="flex gap-8">
                  <div>
                    <span className="text-sm text-muted-foreground">Manhã:</span>
                    <p className="font-bold text-slate-800">
                      {unidadeSelecionada.turnoManhaInicio || "--:--"} às {unidadeSelecionada.turnoManhaFim || "--:--"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Tarde:</span>
                    <p className="font-bold text-slate-800">
                      {unidadeSelecionada.turnoTardeInicio || "--:--"} às {unidadeSelecionada.turnoTardeFim || "--:--"}
                    </p>
                  </div>
                </div>
              </section>

              {/* Tabelas: Guichês */}
              {/* <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500">Guichês</h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold text-slate-700">Nome</TableHead>
                        <TableHead className="font-bold text-slate-700">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {carregandoGuiches ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center py-8">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : (
                        guichesVisualizacao.map((guiche) => (
                          <TableRow key={guiche.id}>
                            <TableCell className="font-medium text-slate-700">{guiche.nome}</TableCell>
                            <TableCell>
                              <Badge variant={guiche.ocupado ? "destructive" : "secondary"} className="rounded-full">
                                {guiche.ocupado ? "Ocupado" : "Livre"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div> */}

              {/* Tabelas: Serviços */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500">Serviços da Unidade</h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className={deveScrollServicos ? "max-h-[260px] overflow-y-auto" : ""}>
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-bold text-slate-700">Serviço</TableHead>
                          <TableHead className="font-bold text-slate-700">Dias</TableHead>
                          <TableHead className="font-bold text-slate-700">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {servicosVisualizacao.map((servico) => (
                          <TableRow key={servico.id}>
                            <TableCell className="font-medium text-slate-700">{getServicoNome(servico.servico)}</TableCell>
                            <TableCell className="text-slate-600 text-xs">{servico.dias_semana?.join(", ") || "-"}</TableCell>
                            <TableCell>
                              <Badge className={servico.is_active ? "bg-orange-500 hover:bg-orange-600 rounded-full" : "rounded-full"}>
                                {servico.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={modalFormAberto} onOpenChange={setModalFormAberto}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-800">{editandoId ? "Editar unidade" : "Nova unidade"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-5 py-4">
            {/* Dados Principais */}
            <div className="md:col-span-4">
              <Label htmlFor="unidade-nome" className="mb-1.5 block">
                Nome da Unidade *
              </Label>
              <Input
                id="unidade-nome"
                className="bg-slate-50/50 border-slate-200 focus:border-orange-500"
                value={unidadeForm.nome}
                onChange={(event) => atualizarFormulario("nome", event.target.value)}
                placeholder="Ex: Unidade Centro"
                maxLength={50}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="unidade-bairro" className="mb-1.5 block">
                Bairro *
              </Label>
              <Popover open={bairroOpen} onOpenChange={setBairroOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="unidade-bairro"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between bg-slate-50/50"
                    disabled={carregandoBairros}
                    aria-expanded={bairroOpen}
                  >
                    <span className="truncate">
                      {unidadeForm.bairroId ? getBairroNome(unidadeForm.bairroId) : carregandoBairros ? "Carregando bairros..." : "Selecione"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Digite o nome do bairro..." />
                    <CommandList onWheel={handleWheelOnCommandList} className="overscroll-contain">
                      <CommandEmpty>Nenhum bairro encontrado.</CommandEmpty>
                      <CommandGroup>
                        {bairrosOptions.map((bairro) => (
                          <CommandItem
                            key={bairro.id}
                            value={bairro.nome}
                            onSelect={() => {
                              atualizarFormulario("bairroId", bairro.id);
                              setBairroOpen(false);
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${unidadeForm.bairroId === bairro.id ? "opacity-100" : "opacity-0"}`} />
                            {bairro.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="md:col-span-6">
              <Label className="mb-2 block">Bairros de abrangência</Label>
              <Popover open={bairrosAbrangenciaOpen} onOpenChange={setBairrosAbrangenciaOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    disabled={carregandoBairros}
                    aria-expanded={bairrosAbrangenciaOpen}
                  >
                    <span className="truncate">
                      {unidadeForm.bairrosAbrangenciaIds.length
                        ? getBairrosAbrangencia(unidadeForm.bairrosAbrangenciaIds)
                        : carregandoBairros
                          ? "Carregando bairros..."
                          : "Selecione bairros"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Digite o nome do bairro..." />
                    <CommandList onWheel={handleWheelOnCommandList} className="overscroll-contain">
                      <CommandEmpty>Nenhum bairro encontrado.</CommandEmpty>
                      <CommandGroup>
                        {bairrosOptions.map((bairro) => {
                          const selecionado = unidadeForm.bairrosAbrangenciaIds.includes(bairro.id);
                          return (
                            <CommandItem key={bairro.id} value={bairro.nome} onSelect={() => toggleBairroAbrangencia(bairro.id, !selecionado)}>
                              <Check className={`mr-2 h-4 w-4 ${selecionado ? "opacity-100" : "opacity-0"}`} />
                              {bairro.nome}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {carregandoBairros && <p className="mt-2 text-xs text-muted-foreground">Carregando bairros...</p>}
              {!carregandoBairros && !bairrosOptions.length && <p className="mt-2 text-xs text-muted-foreground">Nenhum bairro cadastrado.</p>}
              {erroBairros && (
                <p className="mt-2 text-xs text-destructive">
                  Não foi possível carregar os bairros.{" "}
                  <button type="button" className="underline" onClick={fetchBairros}>
                    Tentar novamente
                  </button>
                </p>
              )}
            </div>

            {/* Localização */}
            <div className="md:col-span-4">
              <Label htmlFor="unidade-logradouro" className="mb-1.5 block">
                Logradouro *
              </Label>
              <Input
                id="unidade-logradouro"
                className="bg-slate-50/50"
                value={unidadeForm.logradouro}
                onChange={(e) => atualizarFormulario("logradouro", e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="md:col-span-1">
              <Label htmlFor="unidade-numero" className="mb-1.5 block">
                Nº *
              </Label>
              <Input
                id="unidade-numero"
                className="bg-slate-50/50"
                inputMode="numeric"
                maxLength={NUMERO_MAX_DIGITOS}
                value={unidadeForm.numero}
                onChange={(e) => atualizarFormulario("numero", e.target.value)}
              />
            </div>

            <div className="md:col-span-1">
              <Label htmlFor="unidade-cep" className="mb-1.5 block">
                CEP *
              </Label>
              <Input
                id="unidade-cep"
                className="bg-slate-50/50"
                inputMode="numeric"
                maxLength={CEP_MAX_DIGITOS}
                value={unidadeForm.cep}
                onChange={(e) => atualizarFormulario("cep", e.target.value)}
              />
            </div>

            {/* Contato */}
            <div className="md:col-span-3">
              <Label htmlFor="unidade-telefone" className="mb-1.5 block">
                Telefone *
              </Label>
              <Input
                id="unidade-telefone"
                className="bg-slate-50/50"
                inputMode="numeric"
                maxLength={TELEFONE_MAX_DIGITOS}
                value={unidadeForm.telefone}
                onChange={(e) => atualizarFormulario("telefone", e.target.value)}
              />
            </div>

            <div className="md:col-span-3">
              <Label htmlFor="unidade-email" className="mb-1.5 block">
                E-mail *
              </Label>
              <Input
                id="unidade-email"
                className="bg-slate-50/50"
                value={unidadeForm.email}
                onChange={(e) => atualizarFormulario("email", e.target.value)}
                maxLength={45}
              />
            </div>

            {/* Horários */}
            <div className="md:col-span-6 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="space-y-2">
                <Label className="text-xs text-slate-500 uppercase">Início Manhã</Label>
                <Input type="time" value={unidadeForm.turnoManhaInicio} onChange={(e) => atualizarFormulario("turnoManhaInicio", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-500 uppercase">Fim Manhã</Label>
                <Input type="time" value={unidadeForm.turnoManhaFim} onChange={(e) => atualizarFormulario("turnoManhaFim", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-500 uppercase">Início Tarde</Label>
                <Input type="time" value={unidadeForm.turnoTardeInicio} onChange={(e) => atualizarFormulario("turnoTardeInicio", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-500 uppercase">Fim Tarde</Label>
                <Input type="time" value={unidadeForm.turnoTardeFim} onChange={(e) => atualizarFormulario("turnoTardeFim", e.target.value)} />
              </div>
            </div>

            <div className="md:col-span-6 flex items-center gap-3 mt-2">
              <Switch
                id="unidade-ativo"
                checked={unidadeForm.ativo}
                onCheckedChange={(checked) => atualizarFormulario("ativo", checked)}
                className="data-[state=checked]:bg-orange-500"
              />
              <Label htmlFor="unidade-ativo" className="font-semibold text-slate-700 cursor-pointer">
                Unidade ativa para agendamentos
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-6">
            <Button variant="ghost" onClick={() => setModalFormAberto(false)} disabled={salvando} className="text-slate-500">
              Cancelar
            </Button>
            <Button
              onClick={salvarUnidade}
              disabled={salvando}
              className="bg-[#f26522] hover:bg-[#d95a1e] text-white px-8 font-bold transition-colors"
            >
              {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Criar unidade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
