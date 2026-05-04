import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/lib/sonner";
import { ArrowLeft, Save, Plus, X, Edit, Calendar, Trash2, Eye } from "lucide-react";
import { appointmentStore, horariosDisponiveis, unidades, categorias, servicos } from "@/lib/appointmentStore";
import type { Appointment } from "@/types/agenda";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ServicoAdicional {
  id: string;
  nome: string;
}

const servicosAdicionaisDisponiveis = [
  { id: "emissao_nis", nome: "Emissão de Certidão do NIS" },
  { id: "segunda_via", nome: "Segunda Via de Documentos" },
  { id: "orientacao_beneficios", nome: "Orientação sobre Benefícios" },
  { id: "encaminhamento_psicologia", nome: "Encaminhamento para Psicologia" },
  { id: "encaminhamento_assistente", nome: "Encaminhamento para Assistente Social" },
  { id: "atualizacao_cadastral", nome: "Atualização Cadastral" },
];

export default function AdminRegistrarAtendimento() {
  const navigate = useNavigate();
  const [agendamentos, setAgendamentos] = useState<Appointment[]>([]);
  const [dataSelecionada, setDataSelecionada] = useState(format(new Date(), "yyyy-MM-dd"));
  const [unidadeSelecionada, setUnidadeSelecionada] = useState(unidades[0]);
  const [tipoVisualizado, setTipoVisualizado] = useState<"Comum" | "Especial">("Comum");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("");

  // Estados para registrar atendimento
  const [dialogRegistrar, setDialogRegistrar] = useState(false);
  const [agendamentoParaRegistrar, setAgendamentoParaRegistrar] = useState<Appointment | null>(null);
  const [status, setStatus] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [nomeAtendente, setNomeAtendente] = useState("");
  const [servicosAdicionais, setServicosAdicionais] = useState<string[]>([]);
  const [temServicosAdicionais, setTemServicosAdicionais] = useState(false);

  // Estados para demanda espontânea
  const [dialogDemanda, setDialogDemanda] = useState(false);
  const [horarioSelecionado, setHorarioSelecionado] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tipoAtendimentoDemanda, setTipoAtendimentoDemanda] = useState<"Comum" | "Especial">("Comum");
  const [servico, setServico] = useState("");
  const [nomeCidadao, setNomeCidadao] = useState("");
  const [cpfCidadao, setCpfCidadao] = useState("");
  const [cidadaoEncontrado, setCidadaoEncontrado] = useState(false);
  const [buscandoCidadao, setBuscandoCidadao] = useState(false);

  // Estados para editar horário
  const [dialogEditar, setDialogEditar] = useState(false);
  const [agendamentoParaEditar, setAgendamentoParaEditar] = useState<Appointment | null>(null);
  const [novoHorario, setNovoHorario] = useState("");
  const [viewModal, setViewModal] = useState(false);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Appointment | null>(null);

  useEffect(() => {
    carregarAgendamentos();
  }, [dataSelecionada, unidadeSelecionada]);

  const carregarAgendamentos = () => {
    const todos = appointmentStore.getAppointments();
    const filtrados = todos.filter(
      (a) => a.data === dataSelecionada && a.unidade === unidadeSelecionada
    );
    setAgendamentos(filtrados);
  };

  // Capacidade por categoria (ajustável)
  const capacidadePorCategoria: Record<string, number> = {
    "Aux��lio": 5,
    "Documenta��ǜo": 3,
    "Cadastro": 2,
    "Orienta��ǜo Social": 2,
  };

  // Gera horários por tipo: Comum = 20min, Especial = 60min
  const gerarHorarios = (inicio = "08:00", fim = "17:00", passoMin = 30) => {
    const times: string[] = [];
    const [hIni, mIni] = inicio.split(":").map(Number);
    const [hFim, mFim] = fim.split(":").map(Number);
    let total = hIni * 60 + mIni;
    const limite = hFim * 60 + mFim;
    while (total <= limite) {
      const h = Math.floor(total / 60).toString().padStart(2, "0");
      const m = (total % 60).toString().padStart(2, "0");
      times.push(`${h}:${m}`);
      total += passoMin;
    }
    return times;
  };

  const horariosGerados = tipoVisualizado === "Comum" ? gerarHorarios("08:00", "17:00", 20) : gerarHorarios("08:00", "17:00", 60);

  const apptsNoHorario = (hora: string) => {
    return agendamentos.filter((a) =>
      a.hora === hora &&
      ((a as any).tipoAtendimento || "Comum") === tipoVisualizado &&
      (!categoriaFiltro || a.categoria === categoriaFiltro)
    );
  };

  const obterStatusHorario = (hora: string) => {
    const agendamento = agendamentos.find((a) => a.hora === hora);
    return agendamento || null;
  };

  const abrirDialogDemanda = (hora: string) => {
    setHorarioSelecionado(hora);
    setCategoria("");
    setTipoAtendimentoDemanda(tipoVisualizado);
    setServico("");
    setNomeCidadao("");
    setCpfCidadao("");
    setCidadaoEncontrado(false);
    setBuscandoCidadao(false);
    setDialogDemanda(true);
  };

  const buscarCidadaoPorCpf = () => {
    if (!cpfCidadao.trim()) {
      toast.error("Informe o CPF do cidadão");
      return;
    }

    setBuscandoCidadao(true);

    // Simula busca no banco de dados - aceita qualquer CPF
    setTimeout(() => {
      // Por enquanto, aceita qualquer CPF e permite continuar
      setNomeCidadao(""); // Deixa vazio para o usuário preencher
      setCidadaoEncontrado(true);
      toast.success("CPF validado! Informe o nome do cidadão.");
      setBuscandoCidadao(false);
    }, 500);
  };

  const salvarDemandaEspontanea = () => {
    if (!cidadaoEncontrado || !nomeCidadao.trim() || !categoria || !servico) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    appointmentStore.setCurrentAppointment({
      unidade: unidadeSelecionada,
      categoria,
      servico,
      tipoAtendimento: tipoAtendimentoDemanda,
      data: dataSelecionada,
      hora: horarioSelecionado,
      nomeCidadao,
      cpfCidadao,
    });

    appointmentStore.createAppointment();
    toast.success("Demanda espontânea registrada!");
    setDialogDemanda(false);
    carregarAgendamentos();
  };

  const abrirDialogEditar = (agendamento: Appointment) => {
    setAgendamentoParaEditar(agendamento);
    setNovoHorario(agendamento.hora);
    setDialogEditar(true);
  };

  const salvarEdicaoHorario = () => {
    if (!agendamentoParaEditar || !novoHorario) {
      toast.error("Selecione um horário");
      return;
    }

    const horarioJaOcupado = agendamentos.find(
      (a) => a.hora === novoHorario && a.id !== agendamentoParaEditar.id
    );

    if (horarioJaOcupado) {
      toast.error("Este horário já está ocupado");
      return;
    }

    appointmentStore.updateAppointment(agendamentoParaEditar.id, {
      hora: novoHorario,
    });

    toast.success("Horário atualizado!");
    setDialogEditar(false);
    carregarAgendamentos();
  };

  const cancelarAgendamento = (id: string) => {
    appointmentStore.cancelAppointment(id);
    toast.success("Agendamento cancelado");
    carregarAgendamentos();
  };

  const abrirDialogRegistrar = (agendamento: Appointment) => {
    setAgendamentoParaRegistrar(agendamento);
    setStatus("");
    setObservacoes("");
    setNomeAtendente("");
    setServicosAdicionais([]);
    setTemServicosAdicionais(false);
    setDialogRegistrar(true);
  };

  const toggleServicoAdicional = (servicoId: string) => {
    if (servicosAdicionais.includes(servicoId)) {
      setServicosAdicionais(servicosAdicionais.filter((id) => id !== servicoId));
    } else {
      setServicosAdicionais([...servicosAdicionais, servicoId]);
    }
  };

  const registrarAtendimento = () => {
    if (!agendamentoParaRegistrar) return;

    if (!status) {
      toast.error("Selecione o status do atendimento");
      return;
    }

    if (!nomeAtendente.trim()) {
      toast.error("Informe o nome do atendente");
      return;
    }

    const novoStatus =
      status === "realizado" ? "Atendido" :
        status === "ausente" ? "Cancelado" :
          status === "cancelado_cidadao" ? "Cancelado" :
            status === "cancelado_cras" ? "Cancelado" : "Atendido";

    appointmentStore.updateAppointment(agendamentoParaRegistrar.id, {
      status: novoStatus as any,
      atendente: nomeAtendente,
      servicosAdicionais: temServicosAdicionais ? servicosAdicionais : undefined,
      observacoes,
    });

    toast.success("Atendimento registrado com sucesso!");
    setDialogRegistrar(false);
    carregarAgendamentos();
  };


  const [mostrarTabela1, setMostrarTabela1] = useState(true);
  const [mostrarTabela2, setMostrarTabela2] = useState(true);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-6">
              <SidebarTrigger />
              <Button variant="ghost" size="icon" onClick={() => navigate("/sistema/agendamentos")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold text-foreground">Marcar atendimento</h1>
            </div>

            {/* Filtros */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="data">Horário</Label>
                    <Input
                      id="data"
                      type="date"
                      value={dataSelecionada}
                      onChange={(e) => setDataSelecionada(e.target.value)}
                    />
                  </div>
                  {/* <div>
                    <Label htmlFor="unidade">Unidade</Label>
                    <Select value={unidadeSelecionada} onValueChange={setUnidadeSelecionada}>
                      <SelectTrigger id="unidade">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {unidades.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div> */}
                  <div>
                    <Label htmlFor="tipoAtendimento">Tipo de Atendimento</Label>
                    <Select value={tipoVisualizado} onValueChange={(v) => setTipoVisualizado(v as any)}>
                      <SelectTrigger id="tipoAtendimento">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Comum">Comum (20 min)</SelectItem>
                        <SelectItem value="Especial">Especial (60 min)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="categoriaFiltro">Categoria</Label>
                    <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                      <SelectTrigger id="categoriaFiltro">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="comum" className="w-full mt-6">
              <TabsList className="w-full flex justify-center">
                <TabsTrigger value="comum" className="flex-1">
                  Atendimentos Comuns
                </TabsTrigger>
                <TabsTrigger value="especial" className="flex-1">
                  Atendimentos Especializados
                </TabsTrigger>
              </TabsList>
              <TabsContent value="comum">


                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Horário</TableHead>
                      <TableHead>Ocupação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {horariosGerados.map((hora) => {
                      const lista = apptsNoHorario(hora);
                      const capacidade = capacidadePorCategoria[categoriaFiltro] || 1;
                      const disponivel = lista.length < capacidade;

                      return (
                        <TableRow key={`t1_${hora}`}>
                          <TableCell>{hora}</TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                disponivel
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-destructive/20 text-destructive border-destructive"
                              }
                            >
                              {lista.length}/{capacidade}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {disponivel && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => abrirDialogDemanda(hora)}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Demanda
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/sistema/horario/${hora}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

              </TabsContent>
              {/* Tabela 2 - Agenda Completa */}
              <TabsContent value="especial">


                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Horário</TableHead>
                      <TableHead>Ocupação (Especial)</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {gerarHorarios("08:00", "17:00", 60).map((hora) => {
                      const lista = agendamentos.filter(
                        (a) =>
                          a.hora === hora &&
                          ((a as any).tipoAtendimento || "Comum") === "Especial" &&
                          (!categoriaFiltro || a.categoria === categoriaFiltro)
                      );

                      const capacidade = capacidadePorCategoria[categoriaFiltro] || 1;
                      const disponivel = lista.length < capacidade;

                      return (
                        <TableRow key={`t2_${hora}`}>
                          <TableCell>{hora}</TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                disponivel
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-destructive/20 text-destructive border-destructive"
                              }
                            >
                              {lista.length}/{capacidade}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {disponivel && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setTipoAtendimentoDemanda("Especial");
                                    abrirDialogDemanda(hora);
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Demanda
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/sistema/horario/${hora}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>

          </div>
        </main>
      </div>

      {/* Dialog - Demanda Espontânea */}
      <Dialog open={dialogDemanda} onOpenChange={setDialogDemanda}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Demanda Espontânea - {horarioSelecionado}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Etapa 1: Buscar Cidadão */}
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-3">1. Identificar Cidadão</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="cpfCidadao">CPF do Cidadão *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cpfCidadao"
                      value={cpfCidadao}
                      onChange={(e) => setCpfCidadao(e.target.value)}
                      placeholder="000.000.000-00"
                      disabled={cidadaoEncontrado}
                      maxLength={14}
                    />
                    <Button
                      onClick={buscarCidadaoPorCpf}
                      disabled={buscandoCidadao || cidadaoEncontrado}
                      className="whitespace-nowrap"
                    >
                      {buscandoCidadao ? "Buscando..." : "Buscar"}
                    </Button>
                  </div>
                </div>

                {cidadaoEncontrado && (
                  <div className="space-y-3">
                    <div className="bg-success/10 border border-success/30 rounded-lg p-3">
                      <p className="text-sm font-medium text-success">✓ CPF validado!</p>
                      <p className="text-sm"><strong>CPF:</strong> {cpfCidadao}</p>
                    </div>
                    <div>
                      <Label htmlFor="nomeCidadao">Nome do Cidadão *</Label>
                      <Input
                        id="nomeCidadao"
                        value={nomeCidadao}
                        onChange={(e) => setNomeCidadao(e.target.value)}
                        placeholder="Digite o nome completo"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Etapa 2: Dados do Agendamento */}
            {cidadaoEncontrado && (
              <div>
                <h3 className="font-semibold mb-3">2. Dados do Agendamento</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="categoria">Categoria *</Label>
                    <Select value={categoria} onValueChange={(val) => {
                      setCategoria(val);
                      setServico("");
                    }}>
                      <SelectTrigger id="categoria">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {categoria && (
                    <div>
                      <Label htmlFor="servico">Serviço *</Label>
                      <Select value={servico} onValueChange={setServico}>
                        <SelectTrigger id="servico">
                          <SelectValue placeholder="Selecione o serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {servicos[categoria]?.map((srv) => (
                            <SelectItem key={srv} value={srv}>
                              {srv}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogDemanda(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={salvarDemandaEspontanea}
                className="flex-1"
                disabled={!cidadaoEncontrado || !categoria || !servico}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog - Visualizar Atendimento */}
      <Dialog open={viewModal} onOpenChange={setViewModal}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Detalhes do atendimento</DialogTitle>
          </DialogHeader>
          {agendamentoSelecionado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Cidadão</label>
                  <p className="font-medium">{agendamentoSelecionado.nomeCidadao || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">CPF</label>
                  <p className="font-medium">{agendamentoSelecionado.cpfCidadao || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Categoria</label>
                  <p className="font-medium">{agendamentoSelecionado.categoria}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Serviço</label>
                  <p className="font-medium">{agendamentoSelecionado.servico}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Data</label>
                  <p className="font-medium">{format(new Date(agendamentoSelecionado.data), 'dd/MM/yyyy', { locale: ptBR })}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Hora</label>
                  <p className="font-medium">{agendamentoSelecionado.hora}</p>
                </div>
              </div>
              <Button onClick={() => setViewModal(false)} className="w-full">Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Dialog - Editar Horário */}
      <Dialog open={dialogEditar} onOpenChange={setDialogEditar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Horário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {agendamentoParaEditar && (
              <>
                <div className="bg-muted/30 rounded-lg p-3 text-sm">
                  <p><strong>Serviço:</strong> {agendamentoParaEditar.servico}</p>
                  <p><strong>Horário Atual:</strong> {agendamentoParaEditar.hora}</p>
                </div>
                <div>
                  <Label htmlFor="novoHorario">Novo Horário *</Label>
                  <Select value={novoHorario} onValueChange={setNovoHorario}>
                    <SelectTrigger id="novoHorario">
                      <SelectValue placeholder="Selecione o novo horário" />
                    </SelectTrigger>
                    <SelectContent>
                      {horariosDisponiveis.map((h) => {
                        const ocupado = agendamentos.find(
                          (a) => a.hora === h && a.id !== agendamentoParaEditar.id
                        );
                        return (
                          <SelectItem key={h} value={h} disabled={!!ocupado}>
                            {h} {ocupado ? "(Ocupado)" : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogEditar(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={salvarEdicaoHorario} className="flex-1">
                    <Calendar className="h-4 w-4 mr-1" />
                    Salvar
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog - Registrar Atendimento */}
      <Dialog open={dialogRegistrar} onOpenChange={setDialogRegistrar}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Atendimento</DialogTitle>
          </DialogHeader>
          {agendamentoParaRegistrar && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
                <p><strong>Horário:</strong> {agendamentoParaRegistrar.hora}</p>
                <p><strong>Serviço:</strong> {agendamentoParaRegistrar.servico}</p>
                <p><strong>Categoria:</strong> {agendamentoParaRegistrar.categoria}</p>
              </div>

              <div>
                <Label htmlFor="statusAtendimento">Status do Atendimento *</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="statusAtendimento">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realizado">Atendimento Realizado</SelectItem>
                    <SelectItem value="ausente">Ausência do Cidadão</SelectItem>
                    <SelectItem value="cancelado_cidadao">Cancelado pelo Cidadão</SelectItem>
                    <SelectItem value="cancelado_cras">Cancelado pelo CRAS</SelectItem>
                    <SelectItem value="nao_compareceu">Ativado, mas não compareceu quando chamado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="atendente">Nome do Atendente *</Label>
                <Input
                  id="atendente"
                  value={nomeAtendente}
                  onChange={(e) => setNomeAtendente(e.target.value)}
                  placeholder="Digite o nome do atendente"
                />
              </div>

              {status === "realizado" && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="temServicosAdicionais"
                        checked={temServicosAdicionais}
                        onCheckedChange={(checked) => {
                          setTemServicosAdicionais(checked as boolean);
                          if (!checked) setServicosAdicionais([]);
                        }}
                      />
                      <Label htmlFor="temServicosAdicionais" className="cursor-pointer font-medium">
                        Teve serviços adicionais?
                      </Label>
                    </div>

                    {temServicosAdicionais && (
                      <div className="ml-6 space-y-2 border-l-2 border-primary/20 pl-4">
                        <Label className="text-sm text-muted-foreground">Selecione os serviços adicionais:</Label>
                        {servicosAdicionaisDisponiveis.map((servico) => (
                          <div key={servico.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`registrar_${servico.id}`}
                              checked={servicosAdicionais.includes(servico.id)}
                              onCheckedChange={() => toggleServicoAdicional(servico.id)}
                            />
                            <Label htmlFor={`registrar_${servico.id}`} className="cursor-pointer font-normal">
                              {servico.nome}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Registre informações relevantes sobre o atendimento..."
                  rows={4}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogRegistrar(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={registrarAtendimento} className="flex-1">
                  <Save className="h-4 w-4 mr-1" />
                  Registrar Atendimento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

