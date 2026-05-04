import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Appointment } from "@/types/agenda";
import { getTablePermissions } from "@/security/tablePermissions";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { APPOINTMENT_STATUS_OPTIONS, DEFAULT_APPOINTMENT_STATUS_COLOR, SITUACAO_PARA_STATUS } from "@/constants";
import { ModalConfirmarChegada } from "@/components/tela-atendimentos/modais/modalConfirmarChegada";
import { ModalConfirmarFinalizacao } from "@/components/tela-atendimentos/modais/modalConfirmarFinalizacao";
import { ModalConfirmarExclusao } from "@/components/tela-atendimentos/modais/modalConfirmarExclusão";
import { ModalDetalhesAgendamento } from "@/components/tela-atendimentos/modais/modalDetalhesAgendamento";
import { ModalChamada } from "@/components/tela-atendimentos/modais/modalChamada";
import { ModalAssumirAtendimento } from "@/components/tela-atendimentos/modais/modalAssumirAtendimento";
import { ModalCriarProntuario } from "@/components/tela-atendimentos/modais/modalCriarProntuário";
import { Filtro } from "@/components/tela-atendimentos/filtro";
import { TabelaAtendimentos } from "@/components/tela-atendimentos/tabelaAtendimentos";
import { AgendamentosHeader } from "@/components/tela-atendimentos/AgendamentosHeader";
import { ModalServicosAgendamento } from "@/components/cidadao/ModalServicosAgendamento";
import { useAuth } from "@/contexts/AuthContext";
import { deriveRoleFromGroups, setMesaInStorage } from "@/lib/authHelpers";
import { useAgendamentos, useAtivarAusente, useCancelarAgendamento, useAtualizarAgendamento, useCriarAgendamento } from "@/hooks/sistema/useAgendamentos";
import { useAgendamentosFilters } from "@/hooks/sistema/useAgendamentosFilters";
import { useAgendamentoSelects } from "@/hooks/sistema/useAgendamentoSelects";
import { useChamarProximoFila } from "@/hooks/sistema/useFilaEspera";
import { useCidadaos } from "@/hooks/sistema/useCidadaos";
import { CidadaoAgendamentoModal } from "@/components/cidadao/CidadaoAgendamentoModal";
import { guicheService } from "@/services/sistema/guicheService";
import type { AgendamentoResponse, Cidadao, Guiche as GuicheType } from "@/types/api";
import { toast } from "@/lib/sonner";
import { getApiErrorMessage } from "@/lib/notifications";

const mapAgendamentoParaAppointment = (ag: AgendamentoResponse, guicheNomePorId?: Map<string, string>): Appointment => {
  const atendente = ag.atendente as any;
  const guicheAtual = atendente?.guiche_atual;
  const classe = (ag.servico as any)?.classe;
  const tipoServico = (ag.servico as any)?.tipo_servico;
  const guicheNome =
    typeof guicheAtual === "object" && guicheAtual
      ? guicheAtual.nome || ""
      : typeof guicheAtual === "string"
        ? guicheNomePorId?.get(guicheAtual) || guicheAtual
        : "";

  return {
    id: ag.id,
    unidade: ag.unidade?.nome ?? "-",
    categoria: typeof classe === "object" ? (classe?.nome ?? "") : (classe ?? ""),
    servico: ag.servico?.nome ?? "-",
    tipoServicoNome: typeof tipoServico === "object" ? (tipoServico?.nome ?? "") : String(tipoServico ?? ""),
    data: ag.data,
    hora: (ag.horario || "").slice(0, 5),
    status: SITUACAO_PARA_STATUS[ag.situacao],
    nomeCidadao: ag.cidadao?.nome ?? "-",
    cpfCidadao: ag.cidadao?.cpf ?? "",
    telefoneCidadao: ag.cidadao?.telefone ?? "",
    atendente: atendente?.nome_completo || atendente?.nome || "",
    atendenteId: atendente?.id || "",
    guiche: guicheNome,
    motivoOutraUnidade: (ag as any)?.motivo_territorio || undefined,
    prontuario: (ag as any)?.prontuario ?? null,
  };
};

const formatTimeOnly = (date: Date) => {
  const horas = String(date.getHours()).padStart(2, "0");
  const minutos = String(date.getMinutes()).padStart(2, "0");
  const segundos = String(date.getSeconds()).padStart(2, "0");
  return `${horas}:${minutos}:${segundos}`;
};

type SelectOption = { value: string; label: string };

const AdminAgendamentos = () => {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [ordemHorario, setOrdemHorario] = useState<"asc" | "desc" | null>(null);
  const [visualizarDialog, setVisualizarDialog] = useState(false);
  const [appointmentSelecionado, setAppointmentSelecionado] = useState<Appointment | null>(null);
  const [confirmarChegadaDialog, setConfirmarChegadaDialog] = useState(false);
  const [appointmentConfirmarChegada, setAppointmentConfirmarChegada] = useState<Appointment | null>(null);
  const [finalizarDialog, setFinalizarDialog] = useState(false);
  const [appointmentFinalizar, setAppointmentFinalizar] = useState<Appointment | null>(null);
  const [excluirDialog, setExcluirDialog] = useState(false);
  const [appointmentExcluir, setAppointmentExcluir] = useState<Appointment | null>(null);
  const [modalServicosAberto, setModalServicosAberto] = useState(false);
  const [agendamentoServicoId, setAgendamentoServicoId] = useState<string | null>(null);
  const [modalCriarProntuario, setModalCriarProntuario] = useState(false);
  const [agendamentoCriarProntuario, setAgendamentoCriarProntuario] = useState<Appointment | null>(null);
  const [modalChamada, setModalChamada] = useState(false);
  const [agendamentoParaChamar, setAgendamentoParaChamar] = useState<Appointment | null>(null);
  const [modalAgendamentoAberto, setModalAgendamentoAberto] = useState(false);
  const [agendamentoEmEdicao, setAgendamentoEmEdicao] = useState<AgendamentoResponse | null>(null);
  const [cidadaoBusca, setCidadaoBusca] = useState("");
  const [cidadaoParaAgendar, setCidadaoParaAgendar] = useState<Cidadao | null>(null);
  const [agendarOutraUnidade, setAgendarOutraUnidade] = useState(false);
  const [motivoOutraUnidade, setMotivoOutraUnidade] = useState("");
  const { filters, setters, params: filtrosApi } = useAgendamentosFilters();
  const { filtroData, filtroUnidade, filtroServico, filtroStatus, filtroAtendente, buscaTexto } = filters;
  const { setFiltroData, setFiltroUnidade, setFiltroServico, setFiltroStatus, setFiltroAtendente, setBuscaTexto } = setters;
  const {
    unidade,
    setUnidade,
    categoria,
    setCategoria,
    servico,
    setServico,
    horario,
    setHorario,
    dataAgendamento,
    setDataAgendamento,
    opcoesUnidades,
    opcoesCategorias,
    opcoesServicos,
    opcoesHorarios,
    opcoesDatasDisponiveis,
    carregandoCategorias,
    carregandoServicos,
    carregandoHorarios,
    carregandoDatas,
    resetForm,
    onChangeUnidade,
    onChangeCategoria,
  } = useAgendamentoSelects({ agendamentoEmEdicao });

  const [guichesDisponiveis, setGuichesDisponiveis] = useState<GuicheType[]>([]);
  const [guichesCatalogo, setGuichesCatalogo] = useState<GuicheType[]>([]);
  const [guicheAssumir, setGuicheAssumir] = useState<string>("");
  const [modalAssumirAberto, setModalAssumirAberto] = useState(false);
  const [agendamentoParaAssumir, setAgendamentoParaAssumir] = useState<Appointment | null>(null);
  const [carregandoGuiches, setCarregandoGuiches] = useState(false);
  const [cacheServicos, setCacheServicos] = useState<Map<string, string>>(new Map());

  const { user } = useAuth();
  const { cidadaos, loading: carregandoCidadaos, fetchCidadaos } = useCidadaos();

  const userRole = deriveRoleFromGroups(user?.grupos) ?? "admin";
  const currentUserName = user?.nome;
  const tablePermissions = getTablePermissions(userRole);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const pageSize = 10;
  const filtrosPaginados = useMemo(
    () => ({ ...filtrosApi, limit: pageSize, offset: (paginaAtual - 1) * pageSize }),
    [filtrosApi, paginaAtual, pageSize],
  );
  const { data: agendamentosData, refetch, isFetching } = useAgendamentos(filtrosPaginados, {
    refetchOnWindowFocus: true,
  });
  const agendamentos = agendamentosData?.items ?? [];
  const totalItens = agendamentosData?.count ?? 0;
  const { mutateAsync: marcarAusente } = useAtivarAusente();
  const { mutateAsync: cancelarAgendamento } = useCancelarAgendamento();
  const atualizarAgendamento = useAtualizarAgendamento();
  const { mutateAsync: criarAgendamento, isPending: criandoAgendamento } = useCriarAgendamento();
  const { mutateAsync: chamarProximoFila, isPending: callingNext } = useChamarProximoFila();

  const carregarGuiches = async () => {
    setCarregandoGuiches(true);
    try {
      const { data } = await guicheService.listar();
      const lista = Array.isArray(data) ? data : data?.results || [];
      const listaNormalizada = lista as GuicheType[];
      const disponiveis = listaNormalizada.filter((guiche) => guiche.ocupado === false);
      setGuichesCatalogo(listaNormalizada);
      setGuichesDisponiveis(disponiveis);
      if (!guicheAssumir && disponiveis.length) {
        setGuicheAssumir(String((disponiveis[0] as any).id));
      }
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Não foi possível carregar guichês."));
    } finally {
      setCarregandoGuiches(false);
    }
  };

  const guicheNomePorId = useMemo(() => new Map(guichesCatalogo.map((guiche) => [String(guiche.id), guiche.nome || ""])), [guichesCatalogo]);

  const appointments = useMemo(
    () => agendamentos.map((agendamento) => mapAgendamentoParaAppointment(agendamento, guicheNomePorId)),
    [agendamentos, guicheNomePorId],
  );
  const appointmentsOrdenados = useMemo(() => {
    if (!ordemHorario) return appointments;

    const toMinutes = (hora?: string) => {
      if (!hora) return Number.POSITIVE_INFINITY;
      const [h, m] = hora.split(":").map((part) => Number(part));
      if (Number.isNaN(h) || Number.isNaN(m)) return Number.POSITIVE_INFINITY;
      return h * 60 + m;
    };

    const sorted = [...appointments].sort((a, b) => {
      const diff = toMinutes(a.hora) - toMinutes(b.hora);
      return ordemHorario === "asc" ? diff : -diff;
    });
    return sorted;
  }, [appointments, ordemHorario]);
  const totalPaginas = Math.max(1, Math.ceil(totalItens / pageSize));
  const paginaInicio = totalItens ? (paginaAtual - 1) * pageSize + 1 : 0;
  const paginaFim = Math.min(paginaAtual * pageSize, totalItens);

  useEffect(() => {
    setPaginaAtual(1);
  }, [filtrosApi]);

  useEffect(() => {
    // Evita reset indevido para pagina 1 enquanto a nova pagina ainda esta carregando.
    if (!agendamentosData) return;
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [agendamentosData, paginaAtual, totalPaginas]);

  useEffect(() => {
    if (!agendamentos.length) return;

    setCacheServicos((prev) => {
      const next = new Map(prev);
      for (const ag of agendamentos) {
        if (ag.servico?.id) {
          next.set(String(ag.servico.id), ag.servico.nome ?? String(ag.servico.id));
        }
      }
      return next;
    });
  }, [agendamentos]);

  const servicoFiltroOpcoes = useMemo<SelectOption[]>(() => {
    return [...cacheServicos.entries()].map(([value, label]) => ({ value, label }));
  }, [cacheServicos]);

  const unidadeFiltroOpcoes = useMemo<SelectOption[]>(() => {
    if (opcoesUnidades.length) {
      return opcoesUnidades;
    }
    const mapa = new Map<string, string>();
    agendamentos.forEach((ag) => {
      if (ag.unidade?.id) {
        mapa.set(String(ag.unidade.id), ag.unidade.nome ?? String(ag.unidade.id));
      }
    });
    return Array.from(mapa.entries()).map(([value, label]) => ({ value, label }));
  }, [agendamentos, opcoesUnidades]);

  const atendenteFiltroOpcoes = useMemo<SelectOption[]>(() => {
    const mapa = new Map<string, string>();
    agendamentos.forEach((ag) => {
      const atendente = ag.atendente as any;
      const id = atendente?.id;
      const label = atendente?.nome_completo || atendente?.nome;
      if (id && label) {
        mapa.set(String(id), label);
      }
    });
    return Array.from(mapa.entries()).map(([value, label]) => ({ value, label }));
  }, [agendamentos]);

  const statusFiltroOpcoes = useMemo<SelectOption[]>(() => {
    return Object.entries(SITUACAO_PARA_STATUS).map(([situacao, status]) => ({
      value: situacao,
      label: status,
    }));
  }, []);

  const cidadaoOpcoes = useMemo(
    () => (cidadaoBusca.trim().length >= 3 ? cidadaos.map((c) => ({ value: c.id, label: `${c.nome} - CPF: ${c.cpf}` })) : []),
    [cidadaoBusca, cidadaos],
  );

  useEffect(() => {
    const termo = cidadaoBusca.trim();
    if (termo.length < 3) return;

    const timeout = setTimeout(() => {
      fetchCidadaos({ search: termo, limit: 10 });
    }, 400);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cidadaoBusca]);

  useEffect(() => {
    if (!modalAssumirAberto) return;
    if (guichesCatalogo.length) return;
    carregarGuiches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalAssumirAberto, guichesCatalogo.length]);

  useEffect(() => {
    if (!agendamentos.length) return;
    if (guichesCatalogo.length || carregandoGuiches) return;
    const precisaResolver = agendamentos.some((ag) => {
      const guicheAtual = (ag.atendente as any)?.guiche_atual;
      return typeof guicheAtual === "string" && guicheAtual.trim().length > 0;
    });
    if (precisaResolver) {
      carregarGuiches();
    }
  }, [agendamentos, guichesCatalogo.length, carregandoGuiches]);

  const canView = userRole;
  const { canCall, canCancel, canConfirmArrival, canEdit } = tablePermissions;
  const canCreateAppointment = userRole === "recepcionista" || userRole === "admin" || userRole === "atendente 156";
  const salvandoAgendamento = criandoAgendamento || atualizarAgendamento.isPending;
  const isAgendamentoAssumidoPorMim = (appointment: Appointment) => appointment.atendenteId === user?.id || appointment.atendente === currentUserName;

  const selecionarCidadaoParaAgendar = (cidadaoId: string) => {
    const encontrado = cidadaos.find((c) => c.id === cidadaoId) || null;
    setCidadaoParaAgendar(encontrado);
  };

  const limparFormularioAgendamento = () => {
    setAgendamentoEmEdicao(null);
    setCidadaoParaAgendar(null);
    setCidadaoBusca("");
    setAgendarOutraUnidade(false);
    setMotivoOutraUnidade("");
    resetForm();
  };

  const fecharModalAgendamento = () => {
    setModalAgendamentoAberto(false);
    limparFormularioAgendamento();
  };

  const abrirNovoAgendamento = () => {
    setAgendamentoEmEdicao(null);
    limparFormularioAgendamento();
    setModalAgendamentoAberto(true);
  };

  const abrirEdicaoAgendamento = (appointment: Appointment) => {
    const encontrado = agendamentos.find((ag) => ag.id === appointment.id);
    if (!encontrado) {
      toast.error("Não foi possível carregar dados do agendamento para edição.");
      return;
    }
    const tipoServico = (encontrado.servico as any)?.tipo_servico;
    const tipoServicoId = typeof tipoServico === "object" ? (tipoServico as any)?.id : tipoServico;

    const vagaId = (encontrado as any)?.vaga;
    setAgendamentoEmEdicao(encontrado);
    setCidadaoParaAgendar(encontrado.cidadao);
    setCidadaoBusca("");
    setUnidade(String(encontrado.unidade?.id || ""));
    setCategoria(String(tipoServicoId || ""));
    setServico(String(encontrado.servico?.id || ""));
    setDataAgendamento(encontrado.data);
    setHorario(String(vagaId || (encontrado.horario || "").slice(0, 5) || ""));
    setAgendarOutraUnidade(false);
    setMotivoOutraUnidade("");
    setModalAgendamentoAberto(true);
  };

  const onConfirmarAgendamento = async () => {
    if (!cidadaoParaAgendar) {
      toast.error("Selecione um cidadão para agendar.");
      return;
    }

    if (!unidade || !categoria || !servico || !horario) {
      toast.error("Preencha unidade, categoria, serviço e horário.");
      return;
    }
    if (!agendamentoEmEdicao && agendarOutraUnidade && !motivoOutraUnidade.trim()) {
      toast.error("Informe o motivo para agendar em outra unidade.");
      return;
    }

    const origem = userRole === "atendente 156" ? "156" : userRole === "recepcionista" ? "RECEPCAO" : undefined;
    const motivoTerritorio = agendarOutraUnidade ? motivoOutraUnidade.trim() : undefined;
    try {
      if (agendamentoEmEdicao) {
        await atualizarAgendamento.mutateAsync({
          id: agendamentoEmEdicao.id,
          payload: { servico, unidade, vaga: horario },
        });
        toast.success("Agendamento atualizado.");
      } else {
        await criarAgendamento({
          cidadao: cidadaoParaAgendar.id,
          servico,
          unidade,
          vaga: horario,
          origem,
          motivo_territorio: motivoTerritorio || undefined,
        });
        toast.success(`Agendamento criado para ${cidadaoParaAgendar.nome}.`);
      }
      fecharModalAgendamento();
      refetch();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Não foi possível salvar o agendamento."));
    }
  };

  const getStatusBadge = (status: string) => {
    const option = APPOINTMENT_STATUS_OPTIONS.find((item) => item.value === status);
    const colorClass = option?.colorClass ?? DEFAULT_APPOINTMENT_STATUS_COLOR;
    const label = option?.label ?? status;

    return <span className={`inline-flex whitespace-nowrap px-4 py-1 rounded-full text-sm font-medium border ${colorClass}`}>{label}</span>;
  };

  const podeExibirBotaoChamar = (appointment: Appointment) =>
    ["Aguardando", "Ativado - Aguardando Atendimento"].includes(appointment.status);

  const carregarAgendamentoParaVisualizacao = (appointment: Appointment) => {
    setAppointmentSelecionado(appointment);
    setVisualizarDialog(true);
  };

  const onConfirmarChegada = (appointment: Appointment) => {
    setAppointmentConfirmarChegada(appointment);
    setConfirmarChegadaDialog(true);
  };

  const confirmarChegadaCidadao = async () => {
    if (!appointmentConfirmarChegada) return;
    try {
      await atualizarAgendamento.mutateAsync({ id: appointmentConfirmarChegada.id, payload: { situacao: "ATIVADO" } });
      toast.success("Chegada confirmada.");
      refetch();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Não foi possível confirmar chegada."));
    } finally {
      setConfirmarChegadaDialog(false);
    }
  };

  const abrirModalAssumir = (appointment: Appointment) => {
    setAgendamentoParaAssumir(appointment);
    setModalAssumirAberto(true);
  };

  const abrirModalServicos = (appointment: Appointment) => {
    setAgendamentoServicoId(appointment.id);
    setModalServicosAberto(true);
  };

  const abrirModalCriarProntuario = (appointment: Appointment) => {
    setAgendamentoCriarProntuario(appointment);
    setModalCriarProntuario(true);
  };

  const fecharModalAssumir = () => {
    setModalAssumirAberto(false);
    setAgendamentoParaAssumir(null);
  };

  const confirmarAssumirAtendimento = async () => {
    if (!agendamentoParaAssumir) return;
    if (!guicheAssumir) {
      toast.error("Selecione um guichê para assumir.");
      return;
    }

    try {
      const appointment = agendamentoParaAssumir;
      const definicao = await guicheService.definir({ guiche_id: guicheAssumir });
      if (definicao.data?.guiche) {
        setMesaInStorage(definicao.data.guiche);
      }
      await atualizarAgendamento.mutateAsync({
        id: appointment.id,
        payload: { situacao: "CHAMANDO", atendente: user?.id },
      });
      toast.success("Atendimento assumido e chamado.");
      setAgendamentoParaChamar(appointment);
      setModalChamada(true);
      fecharModalAssumir();
      refetch();
    } catch (err) {
      console.error("Erro", err);
      toast.error(err.response?.data?.detail || "Não foi possível assumir o atendimento.");
    }
  };

  const onChamar = async (appointment: Appointment) => {
    try {
      await atualizarAgendamento.mutateAsync({
        id: appointment.id,
        payload: { situacao: "CHAMANDO", atendente: user?.id },
      });
      setAgendamentoParaChamar(appointment);
      setModalChamada(true);
      refetch();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Não foi possível chamar o agendamento."));
    }
  };

  const onRegistrar = (appointment: Appointment) => {
    if (appointment.status === "Atendimento") {
      navigate(`/sistema/prontuario?id=${appointment.id}&cpf=${appointment.cpfCidadao || ""}`);
      return;
    }

    toast.info("Registro de atendimento indisponivel.");
  };

  const onFinalizarAtendimento = (appointment: Appointment) => {
    if (appointment.status !== "Atendimento") return;
    setAppointmentFinalizar(appointment);
    setFinalizarDialog(true);
  };

  const confirmarFinalizacao = async () => {
    if (!appointmentFinalizar) return;
    try {
      await atualizarAgendamento.mutateAsync({
        id: appointmentFinalizar.id,
        payload: { situacao: "FINALIZADO", data_hora_fim_atendimento: formatTimeOnly(new Date()) },
      });
      toast.success("Atendimento finalizado.");
      refetch();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Falha ao finalizar atendimento."));
    } finally {
      setFinalizarDialog(false);
      setAppointmentFinalizar(null);
    }
  };

  const onAbrirFichaAtendimento = (appointment: Appointment) => {
    navigate(`/sistema/ficha-atendimento?id=${appointment.id}&cpf=${appointment.cpfCidadao || ""}`);
  };

  const onAbrirEncaminhamento = (appointment: Appointment) => {
    const cpf = appointment.cpfCidadao || "";
    if (!cpf) {
      toast.error("Informe o CPF para acessar o encaminhamento.");
      return;
    }
    navigate(`/sistema/encaminhamento-prontuario?agendamento=${appointment.id}&cpf=${cpf}`);
  };

  const confirmarCriarProntuario = (prontuarioId?: string) => {
    if (!agendamentoCriarProntuario) return;
    const extra = prontuarioId ? `&prontuarioId=${prontuarioId}` : "";
    navigate(`/sistema/prontuario?id=${agendamentoCriarProntuario.id}&cpf=${agendamentoCriarProntuario.cpfCidadao || ""}${extra}`);
    setModalCriarProntuario(false);
    setAgendamentoCriarProntuario(null);
  };

  const onChamarProximo = async () => {
    try {
      const appointmentApi = await chamarProximoFila();
      if (appointmentApi) {
        const appointment = mapAgendamentoParaAppointment(appointmentApi);
        setAgendamentoParaChamar(appointment);
        setModalChamada(true);
      }
      toast.success("Próximo da fila chamado.");
      refetch();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Não há pessoas na fila para chamar."));
    }
  };

  const onExcluir = (appointment: Appointment) => {
    setAppointmentExcluir(appointment);
    setExcluirDialog(true);
  };

  const confirmarExclusao = async () => {
    if (!appointmentExcluir) return;
    try {
      await cancelarAgendamento(appointmentExcluir.id);
      toast.success("Agendamento cancelado pelo CRAS.");
      refetch();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Falha ao cancelar o agendamento."));
    } finally {
      setExcluirDialog(false);
    }
  };

  const iniciarAtendimento = async () => {
    if (!agendamentoParaChamar) return;
    try {
      await atualizarAgendamento.mutateAsync({
        id: agendamentoParaChamar.id,
        payload: { situacao: "ATENDIMENTO", data_hora_inicio_atendimento: formatTimeOnly(new Date()) },
      });
      toast.success("Atendimento iniciado.");
      refetch();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Falha ao iniciar atendimento."));
    } finally {
      setModalChamada(false);
    }
  };

  const marcarNaoCompareceu = async () => {
    if (!agendamentoParaChamar) return;
    try {
      await marcarAusente(agendamentoParaChamar.id);
      toast.success("Agendamento marcado como ausente.");
      refetch();
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Falha ao marcar como ausente."));
    } finally {
      setModalChamada(false);
    }
  };

  return (
    <SidebarProvider>
      <RoleBasedSidebar />
      <SidebarInset>
        <div className="container mx-auto p-6 space-y-6">
          <AgendamentosHeader
            canCall={canCall}
            canCreateAppointment={canCreateAppointment}
            callingNext={callingNext}
            onChamarProximo={onChamarProximo}
            onNovoAgendamento={abrirNovoAgendamento}
            onAtualizar={() => refetch()}
            atualizando={isFetching}
          />

          <div className="mb-4">
            <Input
              placeholder="Buscar por nome ou CPF do cidadão..."
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              className="max-w-md"
            />
          </div>

          <Filtro
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            filtroData={filtroData}
            setFiltroData={setFiltroData}
            filtroUnidade={filtroUnidade}
            setFiltroUnidade={setFiltroUnidade}
            filtroServico={filtroServico}
            setFiltroServico={setFiltroServico}
            filtroStatus={filtroStatus}
            setFiltroStatus={setFiltroStatus}
            filtroAtendente={filtroAtendente}
            setFiltroAtendente={setFiltroAtendente}
            unidades={unidadeFiltroOpcoes}
            servicos={servicoFiltroOpcoes}
            status={statusFiltroOpcoes}
            atendentes={atendenteFiltroOpcoes}
          />

          <TabelaAtendimentos
            appointments={appointmentsOrdenados}
            canCall={canCall}
            canEdit={canEdit}
            canCancel={canCancel}
            canConfirmArrival={canConfirmArrival}
            canRegister={tablePermissions.canRegister}
            canAssume={tablePermissions.canAssume}
            canView={canView}
            currentUserName={currentUserName}
            currentUserId={user?.id}
            userRole={userRole}
            isAgendamentoAssumidoPorMim={isAgendamentoAssumidoPorMim}
            onVisualizar={carregarAgendamentoParaVisualizacao}
            onConfirmarChegada={onConfirmarChegada}
            onChamar={onChamar}
            onExcluir={onExcluir}
            onEditar={abrirEdicaoAgendamento}
            onRegistrar={onRegistrar}
            onAssumir={abrirModalAssumir}
            onFinalizar={onFinalizarAtendimento}
            onAbrirFicha={onAbrirFichaAtendimento}
            onAbrirEncaminhamento={onAbrirEncaminhamento}
            onAbrirServicos={abrirModalServicos}
            onCriarProntuario={abrirModalCriarProntuario}
            podeExibirBotaoChamar={podeExibirBotaoChamar}
            renderStatusBadge={getStatusBadge}
            ordemHorario={ordemHorario}
            onOrdenarHorario={() =>
              setOrdemHorario((atual) => {
                if (atual === "asc") return "desc";
                return "asc";
              })
            }
          />

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
        </div>
      </SidebarInset>

      <ModalAssumirAtendimento
        open={modalAssumirAberto}
        onOpenChange={(open) => {
          setModalAssumirAberto(open);
          if (!open) {
            setAgendamentoParaAssumir(null);
          }
        }}
        appointment={agendamentoParaAssumir}
        guicheAssumir={guicheAssumir}
        guichesDisponiveis={guichesDisponiveis}
        onChangeGuiche={setGuicheAssumir}
        onConfirm={confirmarAssumirAtendimento}
        onCancel={fecharModalAssumir}
      />

      <CidadaoAgendamentoModal
        open={modalAgendamentoAberto}
        onClose={fecharModalAgendamento}
        cidadao={cidadaoParaAgendar}
        allowCidadaoSearch={!agendamentoEmEdicao}
        cidadaoBusca={cidadaoBusca}
        cidadaoOpcoes={cidadaoOpcoes}
        loadingCidadaos={carregandoCidadaos}
        unidades={opcoesUnidades}
        categorias={opcoesCategorias}
        servicos={opcoesServicos}
        horarios={opcoesHorarios}
        datasDisponiveis={opcoesDatasDisponiveis}
        unidade={unidade}
        categoria={categoria}
        servico={servico}
        data={dataAgendamento}
        horario={horario}
        exibirMotivoOutraUnidade={!agendamentoEmEdicao}
        agendarOutraUnidade={agendarOutraUnidade}
        motivoOutraUnidade={motivoOutraUnidade}
        loadingCategorias={carregandoCategorias}
        loadingServicos={carregandoServicos}
        loadingHorarios={carregandoHorarios}
        carregandoDatas={carregandoDatas}
        confirmando={salvandoAgendamento}
        confirmLabel={agendamentoEmEdicao ? "Salvar alterações" : "Confirmar Agendamento"}
        title={agendamentoEmEdicao ? "Editar agendamento" : "Novo agendamento"}
        onChangeCidadaoBusca={setCidadaoBusca}
        onSelecionarCidadao={selecionarCidadaoParaAgendar}
        onChangeUnidade={onChangeUnidade}
        onChangeCategoria={onChangeCategoria}
        onChangeServico={(value) => {
          setServico(value);
          setHorario("");
        }}
        onChangeData={setDataAgendamento}
        onChangeHorario={setHorario}
        onToggleOutraUnidade={(checked) => {
          setAgendarOutraUnidade(checked);
          if (!checked) {
            setMotivoOutraUnidade("");
          }
        }}
        onChangeMotivoOutraUnidade={setMotivoOutraUnidade}
        onConfirm={onConfirmarAgendamento}
      />

      <ModalDetalhesAgendamento open={visualizarDialog} onOpenChange={setVisualizarDialog} appointment={appointmentSelecionado} />

      <ModalChamada
        open={modalChamada}
        onOpenChange={setModalChamada}
        appointment={agendamentoParaChamar}
        onIniciarAtendimento={iniciarAtendimento}
        onNaoCompareceu={marcarNaoCompareceu}
      />

      <ModalConfirmarChegada
        open={confirmarChegadaDialog}
        onOpenChange={setConfirmarChegadaDialog}
        appointment={appointmentConfirmarChegada}
        onConfirm={confirmarChegadaCidadao}
      />

      <ModalConfirmarFinalizacao
        open={finalizarDialog}
        onOpenChange={(open) => {
          setFinalizarDialog(open);
          if (!open) {
            setAppointmentFinalizar(null);
          }
        }}
        appointment={appointmentFinalizar}
        onConfirm={confirmarFinalizacao}
      />

      <ModalConfirmarExclusao open={excluirDialog} onOpenChange={setExcluirDialog} appointment={appointmentExcluir} onConfirm={confirmarExclusao} />

      <ModalCriarProntuario
        open={modalCriarProntuario}
        onOpenChange={(open) => {
          setModalCriarProntuario(open);
          if (!open) {
            setAgendamentoCriarProntuario(null);
          }
        }}
        appointment={agendamentoCriarProntuario}
        onConfirm={confirmarCriarProntuario}
      />

      <ModalServicosAgendamento
        open={modalServicosAberto}
        agendamentoId={agendamentoServicoId}
        onOpenChange={(open) => {
          setModalServicosAberto(open);
          if (!open) {
            setAgendamentoServicoId(null);
          }
        }}
      />
    </SidebarProvider>
  );
};

export default AdminAgendamentos;
