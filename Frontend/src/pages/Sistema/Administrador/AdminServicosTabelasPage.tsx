import { type WheelEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, ChevronsUpDown, Clock, Eye, Info, Layers, Loader2, Pencil, Plus, Settings, Type } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/notifications";

import {
  useAtualizarClasseServico,
  useAtualizarServicoAdmin,
  useAtualizarTipoServico,
  useClassesServico,
  useCriarClasseServico,
  useCriarServicoAdmin,
  useCriarTipoServico,
  useServicosAdmin,
  useTiposServico,
} from "@/hooks/sistema/useServicosAdmin";
import type { TipoMarcacao } from "@/types/api";

type ClasseServico = {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
};

type TipoServico = {
  id: string;
  nome: string;
  descricao: string;
  tempoAtendimento: string;
  ativo: boolean;
};

type Servico = {
  id: string;
  nome: string;
  descricao: string;
  classeId: string;
  tipoId: string;
  tempoMin: string;
  ativo: boolean;
  tipoMarcacao: TipoMarcacao;
};

const classeVazia: ClasseServico = { id: "", nome: "", descricao: "", ativo: true };
const tipoVazio: TipoServico = { id: "", nome: "", descricao: "", tempoAtendimento: "20", ativo: true };
const servicoVazio: Servico = {
  id: "",
  nome: "",
  descricao: "",
  classeId: "",
  tipoId: "",
  tempoMin: "",
  ativo: true,
  tipoMarcacao: "AGENDAMENTO",
};

export default function AdminServicosTabelasPage() {
  const navigate = useNavigate();
  const [buscaClasse, setBuscaClasse] = useState("");
  const [filtroBuscaClasse, setFiltroBuscaClasse] = useState("");
  const [buscaTipo, setBuscaTipo] = useState("");
  const [filtroBuscaTipo, setFiltroBuscaTipo] = useState("");
  const [buscaServico, setBuscaServico] = useState("");
  const [filtroBuscaServico, setFiltroBuscaServico] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("classes");
  const [paginaAtualClasses, setPaginaAtualClasses] = useState(1);
  const [paginaAtualServicos, setPaginaAtualServicos] = useState(1);
  const [paginaAtualTipos, setPaginaAtualTipos] = useState(1);

  const [classeForm, setClasseForm] = useState<ClasseServico>(classeVazia);
  const [tipoForm, setTipoForm] = useState<TipoServico>(tipoVazio);
  const [servicoForm, setServicoForm] = useState<Servico>(servicoVazio);

  const [classeEditandoId, setClasseEditandoId] = useState<string | null>(null);
  const [tipoEditandoId, setTipoEditandoId] = useState<string | null>(null);
  const [servicoEditandoId, setServicoEditandoId] = useState<string | null>(null);

  const [modalClasseAberto, setModalClasseAberto] = useState(false);
  const [modalTipoAberto, setModalTipoAberto] = useState(false);
  const [modalServicoAberto, setModalServicoAberto] = useState(false);
  const [classeServicoOpen, setClasseServicoOpen] = useState(false);

  const [classeVisualizar, setClasseVisualizar] = useState<ClasseServico | null>(null);
  const [tipoVisualizar, setTipoVisualizar] = useState<TipoServico | null>(null);
  const [servicoVisualizar, setServicoVisualizar] = useState<Servico | null>(null);

  const {
    data: classesData = [],
    isLoading: carregandoClasses,
    isFetching: buscandoClasses,
    error: erroClasses,
    refetch: recarregarClasses,
  } = useClassesServico({
    nome: filtroBuscaClasse,
  });
  const {
    data: tiposData = [],
    isLoading: carregandoTipos,
    isFetching: buscandoTipos,
    error: erroTipos,
    refetch: recarregarTipos,
  } = useTiposServico({
    nome: filtroBuscaTipo,
  });

  const {
    data: servicosData = [],
    isLoading: carregandoServicos,
    error: erroServicos,
    refetch: recarregarServicos,
  } = useServicosAdmin({ nome: filtroBuscaServico });

  const criarClasse = useCriarClasseServico();
  const atualizarClasse = useAtualizarClasseServico();
  const criarTipo = useCriarTipoServico();
  const atualizarTipo = useAtualizarTipoServico();
  const criarServico = useCriarServicoAdmin();
  const atualizarServico = useAtualizarServicoAdmin();

  const classes = useMemo(
    () =>
      classesData.map((classe) => ({
        id: String(classe.id),
        nome: classe.nome || "",
        descricao: classe.descricao || "",
        ativo: classe.is_active ?? true,
      })),
    [classesData],
  );

  const tipos = useMemo(
    () =>
      tiposData.map((tipo) => ({
        id: String(tipo.id),
        nome: tipo.nome || "",
        descricao: tipo.descricao || "",
        tempoAtendimento: String(tipo.tempo_atendimento ?? 20),
        ativo: tipo.is_active ?? true,
      })),
    [tiposData],
  );

  const servicos = useMemo(
    () =>
      servicosData.map((servico) => ({
        id: String(servico.id),
        nome: servico.nome || "",
        descricao: servico.descricao || "",
        classeId: String(servico.classe?.id ?? ""),
        tipoId: String(servico.tipo_servico?.id ?? ""),
        tempoMin: servico.tipo_servico?.tempo_atendimento ? String(servico.tipo_servico.tempo_atendimento) : "",
        ativo: servico.is_active ?? true,
        tipoMarcacao: servico.tipo_marcacao ?? "AGENDAMENTO",
      })),
    [servicosData],
  );

  const salvandoClasse = criarClasse.isPending || atualizarClasse.isPending;
  const salvandoTipo = criarTipo.isPending || atualizarTipo.isPending;
  const salvandoServico = criarServico.isPending || atualizarServico.isPending;

  const handleWheelOnCommandList = (event: WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    container.scrollTop += event.deltaY;
    event.preventDefault();
    event.stopPropagation();
  };

  const pageSizeClasses = 10;
  const totalItensClasses = classes.length;
  const totalPaginasClasses = Math.max(1, Math.ceil(totalItensClasses / pageSizeClasses));
  const paginaInicioClasses = totalItensClasses ? (paginaAtualClasses - 1) * pageSizeClasses + 1 : 0;
  const paginaFimClasses = Math.min(paginaAtualClasses * pageSizeClasses, totalItensClasses);
  const classesPaginadas = useMemo(
    () => classes.slice((paginaAtualClasses - 1) * pageSizeClasses, paginaAtualClasses * pageSizeClasses),
    [paginaAtualClasses, classes],
  );
  const mostraSkeletonClasses = carregandoClasses && classes.length === 0;
  const mostraOverlayClasses = (buscandoClasses || carregandoClasses) && classes.length > 0;

  const pageSizeServicos = 10;
  const totalItensServicos = servicos.length;
  const totalPaginasServicos = Math.max(1, Math.ceil(totalItensServicos / pageSizeServicos));
  const paginaInicioServicos = totalItensServicos ? (paginaAtualServicos - 1) * pageSizeServicos + 1 : 0;
  const paginaFimServicos = Math.min(paginaAtualServicos * pageSizeServicos, totalItensServicos);
  const servicosPaginados = useMemo(
    () => servicos.slice((paginaAtualServicos - 1) * pageSizeServicos, paginaAtualServicos * pageSizeServicos),
    [paginaAtualServicos, servicos],
  );
  const mostraSkeletonServicos = carregandoServicos && servicos.length === 0;
  const mostraOverlayServicos = carregandoServicos && servicos.length > 0;

  const pageSizeTipos = 10;
  const totalItensTipos = tipos.length;
  const totalPaginasTipos = Math.max(1, Math.ceil(totalItensTipos / pageSizeTipos));
  const paginaInicioTipos = totalItensTipos ? (paginaAtualTipos - 1) * pageSizeTipos + 1 : 0;
  const paginaFimTipos = Math.min(paginaAtualTipos * pageSizeTipos, totalItensTipos);
  const tiposPaginados = useMemo(
    () => tipos.slice((paginaAtualTipos - 1) * pageSizeTipos, paginaAtualTipos * pageSizeTipos),
    [paginaAtualTipos, tipos],
  );
  const mostraSkeletonTipos = carregandoTipos && tipos.length === 0;
  const mostraOverlayTipos = (buscandoTipos || carregandoTipos) && tipos.length > 0;

  useEffect(() => {
    setPaginaAtualClasses(1);
  }, [filtroBuscaClasse]);

  useEffect(() => {
    setPaginaAtualServicos(1);
  }, [totalItensServicos]);

  useEffect(() => {
    setPaginaAtualTipos(1);
  }, [filtroBuscaTipo]);

  const abrirClasseNova = () => {
    setClasseForm(classeVazia);
    setClasseEditandoId(null);
    setModalClasseAberto(true);
  };

  const abrirClasseEdicao = (classe: ClasseServico) => {
    setClasseForm(classe);
    setClasseEditandoId(classe.id);
    setModalClasseAberto(true);
  };

  const salvarClasse = async () => {
    if (!classeForm.nome.trim()) {
      toast.error("Informe o nome da classe.");
      return;
    }

    const payload = {
      nome: classeForm.nome.trim(),
      descricao: classeForm.descricao.trim() || null,
      is_active: classeForm.ativo,
    };

    try {
      if (classeEditandoId) {
        await atualizarClasse.mutateAsync({ id: classeEditandoId, payload });
        toast.success("Classe atualizada com sucesso.");
      } else {
        await criarClasse.mutateAsync(payload);
        toast.success("Classe criada com sucesso.");
      }

      setModalClasseAberto(false);
      setClasseForm(classeVazia);
      setClasseEditandoId(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar a classe."));
    }
  };

  const handleClasseDescricaoChange = (e) => {
    const descricao = e.target.value;
    if (descricao.length <= 255) {
      setClasseForm((a) => ({ ...a, descricao }));
    }
  };

  const handleClasseNomeChange = (e) => {
    const nome = e.target.value;
    if (nome.length <= 150) {
      setClasseForm((a) => ({ ...a, nome }));
    }
  };

  const abrirTipoNovo = () => {
    setTipoForm(tipoVazio);
    setTipoEditandoId(null);
    setModalTipoAberto(true);
  };

  const abrirTipoEdicao = (tipo: TipoServico) => {
    setTipoForm(tipo);
    setTipoEditandoId(tipo.id);
    setModalTipoAberto(true);
  };

  const handleTipoNomeChange = (e) => {
    const nome = e.target.value;
    if (nome.length <= 150) {
      setTipoForm((a) => ({ ...a, nome }));
    }
  };

  const handleTipoDescricaoChange = (e) => {
    const descricao = e.target.value;
    if (descricao.length <= 255) {
      setTipoForm((a) => ({ ...a, descricao }));
    }
  };

  const salvarTipo = async () => {
    if (!tipoForm.nome.trim()) {
      toast.error("Informe o nome do tipo de serviço.");
      return;
    }

    const tempoAtendimento = Number.parseInt(tipoForm.tempoAtendimento, 10);
    if (!tempoAtendimento || Number.isNaN(tempoAtendimento) || tempoAtendimento <= 0) {
      toast.error("Informe um tempo de atendimento válido.");
      return;
    }
    if (tipoForm.descricao.length > 255) {
      toast.error("A descrição deve conter no máximo 255 caracteres.");
      return;
    }

    const payload = {
      nome: tipoForm.nome.trim(),
      descricao: tipoForm.descricao.trim() || null,
      tempo_atendimento: tempoAtendimento,
      is_active: tipoForm.ativo,
    };

    try {
      if (tipoEditandoId) {
        await atualizarTipo.mutateAsync({ id: tipoEditandoId, payload });
        toast.success("Tipo atualizado com sucesso.");
      } else {
        await criarTipo.mutateAsync(payload);
        toast.success("Tipo criado com sucesso.");
      }

      setModalTipoAberto(false);
      setTipoForm(tipoVazio);
      setTipoEditandoId(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar o tipo de serviço."));
    }
  };

  const abrirServicoNovo = () => {
    setServicoForm(servicoVazio);
    setServicoEditandoId(null);
    setModalServicoAberto(true);
  };

  const abrirServicoEdicao = (servico: Servico) => {
    setServicoForm(servico);
    setServicoEditandoId(servico.id);
    setModalServicoAberto(true);
  };

  const handleServicoDescricaoChange = (e) => {
    const descricao = e.target.value;
    if (descricao.length <= 255) {
      setServicoForm((a) => ({ ...a, descricao }));
    }
  };
  const handleServicoNomeChange = (e) => {
    const nome = e.target.value;
    if (nome.length <= 150) {
      setServicoForm((a) => ({ ...a, nome }));
    }
  };

  const salvarServico = async () => {
    if (!servicoForm.nome.trim() || !servicoForm.classeId || !servicoForm.tipoId) {
      toast.error("Preencha nome, classe e tipo.");
      return;
    }
    if (servicoForm.descricao.length > 255) {
      toast.error("A descrição deve conter no máximo 255 caracteres.");
      return;
    }
    if (servicoForm.nome.length > 150){
      toast.error("O nome do serviço deve conter no máximo 150 caracteres.");
      return;
    }


    const payload = {
      nome: servicoForm.nome.trim(),
      descricao: servicoForm.descricao.trim() || null,
      classe: servicoForm.classeId,
      tipo_servico: servicoForm.tipoId,
      tipo_marcacao: servicoForm.tipoMarcacao,
      is_active: servicoForm.ativo,
    };

    try {
      if (servicoEditandoId) {
        await atualizarServico.mutateAsync({ id: servicoEditandoId, payload });
        toast.success("Serviço atualizado com sucesso.");
      } else {
        await criarServico.mutateAsync(payload);
        toast.success("Serviço criado com sucesso.");
      }

      setModalServicoAberto(false);
      setServicoForm(servicoVazio);
      setServicoEditandoId(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar o serviço."));
    }
  };

  const getClasseNome = (id: string) => classes.find((item) => item.id === id)?.nome || "-";
  const getTipoNome = (id: string) => tipos.find((item) => item.id === id)?.nome || "-";

  const acaoPorAba = {
    classes: { label: "Adicionar classe", onClick: abrirClasseNova },
    servicos: { label: "Adicionar serviço", onClick: abrirServicoNovo },
    tipos: { label: "Adicionar tipo", onClick: abrirTipoNovo },
  };

  const handleBuscarServico = () => {
    setFiltroBuscaServico(buscaServico.trim());
    setPaginaAtualServicos(1);
  };
  const handleBuscarTipo = () => {
    setFiltroBuscaTipo(buscaTipo.trim());
    setPaginaAtualTipos(1);
  };
  const handleBuscarClasse = () => {
    setFiltroBuscaClasse(buscaClasse.trim());
    setPaginaAtualClasses(1);
  };
  const acaoAtual = acaoPorAba[abaAtiva as keyof typeof acaoPorAba] ?? acaoPorAba.classes;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Tabelas de serviços</h1>
                  <p className="text-muted-foreground">Configure classes, tipos e serviços</p>
                </div>
              </div>
              {abaAtiva !== "tipos" && (
                <Button onClick={acaoAtual.onClick} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {acaoAtual.label}
                </Button>
              )}
            </div>

            <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="space-y-6">
              <TabsList>
                <TabsTrigger value="classes">Classes de serviço</TabsTrigger>
                <TabsTrigger value="servicos">Serviços</TabsTrigger>
                <TabsTrigger value="tipos">Tipos de serviço</TabsTrigger>
              </TabsList>

              <TabsContent value="classes" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <CardTitle>Classes cadastradas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-2 w-full ">
                      <Input
                        placeholder="Buscar classe de serviço por nome..."
                        value={buscaClasse}
                        onChange={(event) => setBuscaClasse(event.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleBuscarClasse();
                        }}
                        className="flex-1"
                      />
                      <Button onClick={handleBuscarClasse} className="sm:w-auto w-full">
                        Pesquisar
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {erroClasses ? (
                  <p className="text-xs text-destructive">
                    Não foi possível carregar as classes.{" "}
                    <button type="button" className="underline" onClick={() => recarregarClasses()}>
                      Tentar novamente
                    </button>
                  </p>
                ) : null}

                <div className="bg-card rounded-2xl shadow-md overflow-hidden">
                  <div className="relative overflow-x-auto">
                    {mostraOverlayClasses && (
                      <div
                        className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]"
                        role="status"
                        aria-live="polite"
                      >
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Buscando classes...
                        </div>
                      </div>
                    )}
                    <Table className="w-full">
                      <TableHeader className="bg-secondary">
                        <TableRow>
                          <TableHead className="px-6 py-4 text-left font-bold text-foreground">Nome</TableHead>
                          <TableHead className="px-6 py-4 text-left font-bold text-foreground">Descrição</TableHead>
                          <TableHead className="px-6 py-4 text-left font-bold text-foreground">Status</TableHead>
                          <TableHead className="px-6 py-4 text-right font-bold text-foreground">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mostraSkeletonClasses &&
                          Array.from({ length: 5 }).map((_, index) => (
                            <TableRow key={`skeleton-classes-${index}`}>
                              <TableCell colSpan={4} className="px-6 py-4">
                                <div className="grid grid-cols-4 gap-4">
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-4 w-24" />
                                  <Skeleton className="h-4 w-16 justify-self-end" />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        {!mostraSkeletonClasses &&
                          classesPaginadas.map((classe, index) => (
                            <TableRow key={classe.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                              <TableCell className="px-6 py-4 font-medium text-foreground">{classe.nome}</TableCell>
                              <TableCell className="px-6 py-4 text-foreground">{classe.descricao || "-"}</TableCell>
                              <TableCell className="px-6 py-4">
                                <Badge variant={classe.ativo ? "default" : "secondary"}>{classe.ativo ? "Ativo" : "Inativo"}</Badge>
                              </TableCell>
                              <TableCell className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => setClasseVisualizar(classe)} title="Visualizar">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => abrirClasseEdicao(classe)} title="Editar">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        {!carregandoClasses && classes.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="px-6 py-4 text-center text-muted-foreground">
                              Nenhuma classe encontrada.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {totalItensClasses > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-muted-foreground">
                      Mostrando {paginaInicioClasses} - {paginaFimClasses} de {totalItensClasses}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-2 rounded border disabled:opacity-50"
                        onClick={() => setPaginaAtualClasses((p) => Math.max(1, p - 1))}
                        disabled={paginaAtualClasses === 1}
                      >
                        Anterior
                      </button>
                      <span className="text-sm text-muted-foreground">
                        Página {paginaAtualClasses} / {totalPaginasClasses}
                      </span>
                      <button
                        className="px-3 py-2 rounded border disabled:opacity-50"
                        onClick={() => setPaginaAtualClasses((p) => Math.min(totalPaginasClasses, p + 1))}
                        disabled={paginaAtualClasses >= totalPaginasClasses}
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="servicos" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <CardTitle>Serviços cadastrados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-2 w-full ">
                      <Input
                        placeholder="Buscar serviço por nome..."
                        value={buscaServico}
                        onChange={(event) => setBuscaServico(event.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleBuscarServico();
                        }}
                        className="flex-1"
                      />
                      <Button onClick={handleBuscarServico} className="sm:w-auto w-full">
                        Pesquisar
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {erroServicos ? (
                  <p className="text-xs text-destructive">
                    Não foi possível carregar os serviços.{" "}
                    <button type="button" className="underline" onClick={() => recarregarServicos()}>
                      Tentar novamente
                    </button>
                  </p>
                ) : null}

                <div className="bg-card rounded-2xl shadow-md overflow-hidden">
                  <div className="relative overflow-x-auto">
                    {mostraOverlayServicos && (
                      <div
                        className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]"
                        role="status"
                        aria-live="polite"
                      >
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Buscando serviços...
                        </div>
                      </div>
                    )}
                    <Table className="w-full">
                      <TableHeader className="bg-secondary">
                        <TableRow>
                          <TableHead className="px-6 py-4 text-left font-bold text-foreground">Nome</TableHead>
                          <TableHead className="px-6 py-4 text-left font-bold text-foreground">Classe</TableHead>
                          <TableHead className="px-6 py-4 text-left font-bold text-foreground">Tipo</TableHead>
                          <TableHead className="px-6 py-4 text-left font-bold text-foreground">Tempo</TableHead>
                          <TableHead className="px-6 py-4 text-left font-bold text-foreground">Status</TableHead>
                          <TableHead className="px-6 py-4 text-right font-bold text-foreground">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mostraSkeletonServicos &&
                          Array.from({ length: 5 }).map((_, index) => (
                            <TableRow key={`skeleton-servicos-${index}`}>
                              <TableCell colSpan={6} className="px-6 py-4">
                                <div className="grid grid-cols-6 gap-4">
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-4 w-16" />
                                  <Skeleton className="h-4 w-24" />
                                  <Skeleton className="h-4 w-16 justify-self-end" />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        {!mostraSkeletonServicos &&
                          servicosPaginados.map((servico, index) => (
                            <TableRow key={servico.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                              <TableCell className="px-6 py-4 font-medium text-foreground">{servico.nome}</TableCell>
                              <TableCell className="px-6 py-4 text-foreground">{getClasseNome(servico.classeId)}</TableCell>
                              <TableCell className="px-6 py-4 text-foreground">{getTipoNome(servico.tipoId)}</TableCell>
                              <TableCell className="px-6 py-4 text-foreground">{servico.tempoMin ? `${servico.tempoMin} min` : "-"}</TableCell>
                              <TableCell className="px-6 py-4">
                                <Badge variant={servico.ativo ? "default" : "secondary"}>{servico.ativo ? "Ativo" : "Inativo"}</Badge>
                              </TableCell>
                              <TableCell className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => setServicoVisualizar(servico)} title="Visualizar">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => abrirServicoEdicao(servico)} title="Editar">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        {!carregandoServicos && servicos.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="px-6 py-4 text-center text-muted-foreground">
                              Nenhum serviço encontrado.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {totalItensServicos > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-muted-foreground">
                      Mostrando {paginaInicioServicos} - {paginaFimServicos} de {totalItensServicos}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-2 rounded border disabled:opacity-50"
                        onClick={() => setPaginaAtualServicos((p) => Math.max(1, p - 1))}
                        disabled={paginaAtualServicos === 1}
                      >
                        Anterior
                      </button>
                      <span className="text-sm text-muted-foreground">
                        Página {paginaAtualServicos} / {totalPaginasServicos}
                      </span>
                      <button
                        className="px-3 py-2 rounded border disabled:opacity-50"
                        onClick={() => setPaginaAtualServicos((p) => Math.min(totalPaginasServicos, p + 1))}
                        disabled={paginaAtualServicos >= totalPaginasServicos}
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tipos" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <CardTitle>Tipos cadastrados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-2 w-full ">
                      <Input
                        placeholder="Buscar tipo de serviço por nome..."
                        value={buscaTipo}
                        onChange={(event) => setBuscaTipo(event.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleBuscarTipo();
                        }}
                        className="flex-1"
                      />
                      <Button onClick={handleBuscarTipo} className="sm:w-auto w-full">
                        Pesquisar
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {erroTipos ? (
                  <p className="text-xs text-destructive">
                    Não foi possível carregar os tipos.{" "}
                    <button type="button" className="underline" onClick={() => recarregarTipos()}>
                      Tentar novamente
                    </button>
                  </p>
                ) : null}

                <div className="bg-card rounded-2xl shadow-md overflow-hidden">
                  <div className="relative overflow-x-auto">
                    {mostraOverlayTipos && (
                      <div
                        className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]"
                        role="status"
                        aria-live="polite"
                      >
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Buscando tipos...
                        </div>
                      </div>
                    )}
                    <Table className="w-full">
                      <TableHeader className="bg-secondary">
                        <TableRow>
                          <TableHead className="px-6 py-4 text-left font-bold text-foreground">Nome</TableHead>
                          <TableHead className="px-6 py-4 text-left font-bold text-foreground">Descrição</TableHead>
                          <TableHead className="px-6 py-4 text-left font-bold text-foreground">Tempo</TableHead>
                          <TableHead className="px-6 py-4 text-left font-bold text-foreground">Status</TableHead>
                          <TableHead className="px-6 py-4 text-right font-bold text-foreground">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mostraSkeletonTipos &&
                          Array.from({ length: 5 }).map((_, index) => (
                            <TableRow key={`skeleton-tipos-${index}`}>
                              <TableCell colSpan={5} className="px-6 py-4">
                                <div className="grid grid-cols-5 gap-4">
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-4 w-20" />
                                  <Skeleton className="h-4 w-24" />
                                  <Skeleton className="h-4 w-16 justify-self-end" />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        {!mostraSkeletonTipos &&
                          tiposPaginados.map((tipo, index) => (
                            <TableRow key={tipo.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                              <TableCell className="px-6 py-4 font-medium text-foreground">{tipo.nome}</TableCell>
                              <TableCell className="px-6 py-4 text-foreground">{tipo.descricao || "-"}</TableCell>
                              <TableCell className="px-6 py-4 text-foreground">
                                {tipo.tempoAtendimento ? `${tipo.tempoAtendimento} min` : "-"}
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                <Badge variant={tipo.ativo ? "default" : "secondary"}>{tipo.ativo ? "Ativo" : "Inativo"}</Badge>
                              </TableCell>
                              <TableCell className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => setTipoVisualizar(tipo)} title="Visualizar">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => abrirTipoEdicao(tipo)} title="Editar">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        {!carregandoTipos && tipos.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="px-6 py-4 text-center text-muted-foreground">
                              Nenhum tipo encontrado.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {totalItensTipos > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-muted-foreground">
                      Mostrando {paginaInicioTipos} - {paginaFimTipos} de {totalItensTipos}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-2 rounded border disabled:opacity-50"
                        onClick={() => setPaginaAtualTipos((p) => Math.max(1, p - 1))}
                        disabled={paginaAtualTipos === 1}
                      >
                        Anterior
                      </button>
                      <span className="text-sm text-muted-foreground">
                        Página {paginaAtualTipos} / {totalPaginasTipos}
                      </span>
                      <button
                        className="px-3 py-2 rounded border disabled:opacity-50"
                        onClick={() => setPaginaAtualTipos((p) => Math.min(totalPaginasTipos, p + 1))}
                        disabled={paginaAtualTipos >= totalPaginasTipos}
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <Dialog open={modalClasseAberto} onOpenChange={setModalClasseAberto}>
        <DialogContent className="max-w-lg border-none p-0 overflow-hidden bg-white rounded-2xl shadow-lg">
          <div className="bg-[#f05a28] h-1.5 w-full" />
          <div className="p-6">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-3 text-left">
                <div className="bg-orange-100 p-2.5 rounded-full">
                  <Layers className="w-5 h-5 text-[#f05a28]" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-800">{classeEditandoId ? "Editar Classe" : "Nova Classe"}</DialogTitle>
                  <p className="text-sm text-slate-500">Agrupe serviços por categorias principais.</p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="classe-nome" className="text-sm font-semibold text-slate-700 ml-1">
                  Nome da Classe *
                </Label>
                <Input
                  id="classe-nome"
                  className="rounded-xl border-slate-200 focus-visible:ring-[#f05a28]"
                  value={classeForm.nome}
                  maxLength={150}
                  onChange={handleClasseNomeChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classe-descricao" className="text-sm font-semibold text-slate-700 ml-1">
                  Descrição
                </Label>
                <Textarea
                  id="classe-descricao"
                  rows={3}
                  className="rounded-xl border-slate-200 focus-visible:ring-[#f05a28] resize-none"
                  value={classeForm.descricao}
                  maxLength={255}
                  onChange={handleClasseDescricaoChange}
                />
                <p style={{ color: classeForm.descricao.length === 255 ? 'red' : 'black' }}>
                  {classeForm.descricao.length} / 255
                </p>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/80">
                <Label htmlFor="classe-ativo" className="text-sm font-bold text-slate-700 cursor-pointer">
                  Classe Ativa
                </Label>
                <Switch
                  id="classe-ativo"
                  className="data-[state=checked]:bg-[#f05a28]"
                  checked={classeForm.ativo}
                  onCheckedChange={(checked) => setClasseForm((a) => ({ ...a, ativo: checked }))}
                />
              </div>
            </div>

            <DialogFooter className="mt-8 gap-3">
              <Button variant="ghost" onClick={() => setModalClasseAberto(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button
                onClick={salvarClasse}
                disabled={salvandoClasse}
                className="bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold px-8 rounded-xl shadow-md shadow-orange-100"
              >
                {salvandoClasse ? "Salvando..." : "Salvar Classe"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      {/* ================= MODAL: TIPO (EDITAR/NOVO) ================= */}
      <Dialog open={modalTipoAberto} onOpenChange={setModalTipoAberto}>
        <DialogContent className="max-w-lg border-none p-0 overflow-hidden bg-white rounded-2xl shadow-lg">
          <div className="bg-[#f05a28] h-1.5 w-full" />
          <div className="p-6">
            <DialogHeader className="mb-6 text-left">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2.5 rounded-full">
                  <Type className="w-5 h-5 text-[#f05a28]" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-800">{tipoEditandoId ? "Editar Tipo" : "Novo Tipo"}</DialogTitle>
                  <p className="text-sm text-slate-500">Defina o modelo de atendimento.</p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 ml-1">Nome do Tipo *</Label>
                <Input className="rounded-xl" 
                value={tipoForm.nome} onChange={handleTipoNomeChange} maxLength={150} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 ml-1">Descrição</Label>
                <Textarea
                  className="rounded-xl border-slate-200 focus-visible:ring-[#f05a28] resize-none"
                  rows={3}
                  value={tipoForm.descricao}
                  maxLength={255}
                  onChange={handleTipoDescricaoChange}
                />
                <p style={{ color: tipoForm.descricao.length === 255 ? "red" : "black" }}>
                  {tipoForm.descricao.length} / 255
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 ml-1">Tempo Padrão (min)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      type="number"
                      className="rounded-xl pl-9"
                      value={tipoForm.tempoAtendimento}
                      onChange={(e) => setTipoForm((a) => ({ ...a, tempoAtendimento: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/80 self-end h-[44px]">
                  <Label className="text-xs font-bold text-slate-700">Ativo</Label>
                  <Switch
                    className="data-[state=checked]:bg-[#f05a28]"
                    checked={tipoForm.ativo}
                    onCheckedChange={(c) => setTipoForm((a) => ({ ...a, ativo: c }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-8">
              <Button onClick={salvarTipo} className="w-full bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold h-11 rounded-xl shadow-md">
                {salvandoTipo ? "Salvando..." : "Salvar Configuração"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: SERVIÇO (EDITAR/NOVO) - GRID 2 COLUNAS ================= */}
      <Dialog
        open={modalServicoAberto}
        onOpenChange={(open) => {
          setModalServicoAberto(open);
          if (!open) setClasseServicoOpen(false);
        }}
      >
        <DialogContent className="max-w-2xl border-none p-0 overflow-hidden bg-white rounded-2xl shadow-lg">
          <div className="bg-[#f05a28] h-1.5 w-full" />
          <div className="p-8">
            <DialogHeader className="mb-6 text-left">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2.5 rounded-full">
                  <Settings className="w-5 h-5 text-[#f05a28]" />
                </div>
                <DialogTitle className="text-2xl font-bold text-slate-800">{servicoEditandoId ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <Label className="text-sm font-semibold text-slate-700 ml-1">Nome do Serviço *</Label>
                <Input
                  className="rounded-xl h-11"
                  value={servicoForm.nome}
                  maxLength={150}
                  onChange={handleServicoNomeChange}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 ml-1">Classe</Label>
                <Popover open={classeServicoOpen} onOpenChange={setClasseServicoOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={classeServicoOpen} className="w-full justify-between rounded-xl h-11 font-normal">
                      <span className="truncate">{servicoForm.classeId ? getClasseNome(servicoForm.classeId) : "Selecione"}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar classe..." />
                      <CommandList onWheel={handleWheelOnCommandList} className="overscroll-contain">
                        <CommandEmpty>Nenhuma classe encontrada.</CommandEmpty>
                        <CommandGroup>
                          {classes.map((classe) => (
                            <CommandItem
                              key={classe.id}
                              value={classe.nome}
                              onSelect={() => {
                                setServicoForm((atual) => ({ ...atual, classeId: classe.id }));
                                setClasseServicoOpen(false);
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 ${servicoForm.classeId === classe.id ? "opacity-100" : "opacity-0"}`} />
                              <span className="truncate">{classe.nome}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 ml-1">Tipo</Label>
                <Select
                  value={servicoForm.tipoId}
                  onValueChange={(v) => {
                    const t = tipos.find((item) => item.id === v);
                    setServicoForm((a) => ({ ...a, tipoId: v, tempoMin: t?.tempoAtendimento || "" }));
                  }}
                >
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipos.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label className="text-sm font-semibold text-slate-700 ml-1">Descrição detalhada</Label>
                <Textarea
                  className="rounded-xl resize-none"
                  rows={3}
                  value={servicoForm.descricao}
                  maxLength={255}
                  onChange={handleServicoDescricaoChange}
                />
                <p style={{ color: servicoForm.descricao.length === 255 ? 'red' : 'black' }}>
                  {servicoForm.descricao.length} / 255
                </p>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-orange-50/30 md:col-span-2">
                <div className="flex items-center gap-3">
                  <Switch
                    className="data-[state=checked]:bg-[#f05a28]"
                    checked={servicoForm.ativo}
                    onCheckedChange={(c) => setServicoForm((a) => ({ ...a, ativo: c }))}
                  />
                  <Label className="text-sm font-bold text-slate-700">Disponibilizar serviço para agendamento</Label>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Tempo Estimado</span>
                  <span className="text-sm font-bold text-[#f05a28]">{servicoForm.tempoMin || 0} min</span>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-8 gap-3">
              <Button variant="ghost" onClick={() => setModalServicoAberto(false)} className="rounded-xl px-6">
                Cancelar
              </Button>
              <Button onClick={salvarServico} className="bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold px-10 rounded-xl shadow-md h-11">
                {salvandoServico ? "Salvando..." : "Finalizar Cadastro"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================= MODAIS DE VISUALIZAÇÃO (PADRONIZADOS) ================= */}
      {/* Exemplo para o de Serviço (aplique a mesma lógica para Classe e Tipo) */}
      <Dialog open={!!classeVisualizar} onOpenChange={(open) => !open && setClasseVisualizar(null)}>
        <DialogContent className="max-w-lg border-none p-0 overflow-hidden bg-white rounded-2xl shadow-lg">
          <div className="bg-[#f05a28] h-1.5 w-full" />
          <div className="p-6">
            <DialogHeader className="mb-6 flex flex-row items-center gap-3">
              <div className="bg-orange-100 p-2.5 rounded-full">
                <Info className="w-5 h-5 text-[#f05a28]" />
              </div>
              <DialogTitle className="text-xl font-bold text-slate-800">Detalhes da Classe</DialogTitle>
            </DialogHeader>

            {classeVisualizar && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Nome da Classe</span>
                    <p className="text-base font-semibold text-slate-700">{classeVisualizar.nome}</p>
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Descrição</span>
                    <p className="text-sm font-medium text-slate-600">{classeVisualizar.descricao || "-"}</p>
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Status</span>
                    <Badge
                      className={classeVisualizar.ativo ? "bg-emerald-100 text-emerald-700 border-none" : "bg-slate-100 text-slate-600 border-none"}
                    >
                      {classeVisualizar.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
                <Button
                  onClick={() => setClasseVisualizar(null)}
                  className="w-full bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold px-10 rounded-xl shadow-md"
                >
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!tipoVisualizar} onOpenChange={(open) => !open && setTipoVisualizar(null)}>
        <DialogContent className="max-w-lg border-none p-0 overflow-hidden bg-white rounded-2xl shadow-lg">
          <div className="bg-[#f05a28] h-1.5 w-full" />
          <div className="p-6">
            <DialogHeader className="mb-6 flex flex-row items-center gap-3">
              <div className="bg-orange-100 p-2.5 rounded-full">
                <Info className="w-5 h-5 text-[#f05a28]" />
              </div>
              <DialogTitle className="text-xl font-bold text-slate-800">Detalhes do Tipo</DialogTitle>
            </DialogHeader>

            {tipoVisualizar && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Nome do Tipo</span>
                    <p className="text-base font-semibold text-slate-700">{tipoVisualizar.nome}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Tempo</span>
                      <p className="text-sm font-medium text-slate-600">
                        {tipoVisualizar.tempoAtendimento ? `${tipoVisualizar.tempoAtendimento} min` : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Status</span>
                      <Badge
                        className={tipoVisualizar.ativo ? "bg-emerald-100 text-emerald-700 border-none" : "bg-slate-100 text-slate-600 border-none"}
                      >
                        {tipoVisualizar.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Descrição</span>
                    <p className="text-sm font-medium text-slate-600">{tipoVisualizar.descricao || "-"}</p>
                  </div>
                </div>
                <Button
                  onClick={() => setTipoVisualizar(null)}
                  className="w-full bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold px-10 rounded-xl shadow-md"
                >
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!servicoVisualizar} onOpenChange={(open) => !open && setServicoVisualizar(null)}>
        <DialogContent className="max-w-lg border-none p-0 overflow-hidden bg-white rounded-2xl shadow-lg">
          <div className="bg-[#f05a28] h-1.5 w-full" />
          <div className="p-6">
            <DialogHeader className="mb-6 flex flex-row items-center gap-3">
              <div className="bg-orange-100 p-2.5 rounded-full">
                <Info className="w-5 h-5 text-[#f05a28]" />
              </div>
              <DialogTitle className="text-xl font-bold text-slate-800">Detalhes do Serviço</DialogTitle>
            </DialogHeader>

            {servicoVisualizar && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Nome do Serviço</span>
                    <p className="text-base font-semibold text-slate-700">{servicoVisualizar.nome}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Classe</span>
                      <p className="text-sm font-medium text-slate-600">{getClasseNome(servicoVisualizar.classeId)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Tempo</span>
                      <p className="text-sm font-medium text-slate-600">{servicoVisualizar.tempoMin} min</p>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Status</span>
                    <Badge
                      className={servicoVisualizar.ativo ? "bg-emerald-100 text-emerald-700 border-none" : "bg-slate-100 text-slate-600 border-none"}
                    >
                      {servicoVisualizar.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
                <Button
                  onClick={() => setServicoVisualizar(null)}
                  className="w-full bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold px-10 rounded-xl shadow-md "
                >
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
