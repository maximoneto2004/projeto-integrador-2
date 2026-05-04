import { useState } from "react";
import { NavigateFunction } from "react-router-dom";
import { toast } from "@/lib/sonner";
import { appointmentStore } from "@/lib/appointmentStore";
import { authStore } from "@/lib/authStore";
import type { Appointment } from "@/types/agenda";
import type { ServicoRegistrado } from "@/components/RegistrarServicosModal";

type UseAgendamentoAcoesParams = {
  navigate: NavigateFunction;
  onRefresh: () => void;
  currentUserName?: string | null;
};

export function useAgendamentoAcoes({ navigate, onRefresh, currentUserName }: UseAgendamentoAcoesParams) {
  // Visualização
  const [visualizarDialog, setVisualizarDialog] = useState(false);
  const [appointmentSelecionado, setAppointmentSelecionado] = useState<Appointment | null>(null);

  // Edição de horário
  const [editarDialog, setEditarDialog] = useState(false);
  const [appointmentEditar, setAppointmentEditar] = useState<Appointment | null>(null);
  const [novoHorario, setNovoHorario] = useState("");
  const [novaData, setNovaData] = useState("");
  const [novoServico, setNovoServico] = useState("");

  // Exclusão
  const [excluirDialog, setExcluirDialog] = useState(false);
  const [appointmentExcluir, setAppointmentExcluir] = useState<Appointment | null>(null);

  // Confirmar chegada
  const [confirmarChegadaDialog, setConfirmarChegadaDialog] = useState(false);
  const [appointmentConfirmarChegada, setAppointmentConfirmarChegada] = useState<Appointment | null>(null);

  // Chamada
  const [modalChamada, setModalChamada] = useState(false);
  const [agendamentoParaChamar, setAgendamentoParaChamar] = useState<Appointment | null>(null);

  // Assumir atendimento
  const [agendamentoAssumido, setAgendamentoAssumido] = useState<string | null>(null);
  const [modalAssumir, setModalAssumir] = useState(false);
  const [agendamentoParaAssumir, setAgendamentoParaAssumir] = useState<Appointment | null>(null);
  const [guicheAssumir, setGuicheAssumir] = useState(authStore.getMesa() || "");

  // Registro pós-atendimento (lista)
  const [dialogRegistrar, setDialogRegistrar] = useState(false);
  const [agendamentoParaRegistrar, setAgendamentoParaRegistrar] = useState<Appointment | null>(null);
  const [nomeAtendente, setNomeAtendente] = useState("");
  const [horaInicioReal, setHoraInicioReal] = useState("");
  const [horaFimReal, setHoraFimReal] = useState("");
  const [servicosAdicionais, setServicosAdicionais] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState("");

  // Registro de serviços do atendimento
  const [modalRegistrarServicos, setModalRegistrarServicos] = useState(false);
  const [agendamentoParaRegistrarServicos, setAgendamentoParaRegistrarServicos] = useState<Appointment | null>(null);

  const carregarAgendamentoParaVisualizacao = (appointment: Appointment) => {
    setAppointmentSelecionado(appointment);
    setVisualizarDialog(true);
  };

  const abrirEditarHorario = (appointment: Appointment) => {
    setAppointmentEditar(appointment);
    setNovoHorario(appointment.hora);
    setNovaData(appointment.data);
    setNovoServico(appointment.servico);
    setEditarDialog(true);
  };

  const salvarEdicaoHorario = () => {
    if (!appointmentEditar || !novoHorario || !novaData || !novoServico) {
      toast.error("Preencha data, horário e serviço");
      return;
    }

    appointmentStore.updateAppointment(appointmentEditar.id, {
      hora: novoHorario,
      data: novaData,
      servico: novoServico,
    });

    toast.success("Agendamento atualizado!");
    setEditarDialog(false);
    onRefresh();
  };

  const abrirExcluir = (appointment: Appointment) => {
    setAppointmentExcluir(appointment);
    setExcluirDialog(true);
  };

  const confirmarExclusao = () => {
    if (!appointmentExcluir) return;

    appointmentStore.cancelAppointment(appointmentExcluir.id);
    toast.success("Agendamento excluído!");
    setExcluirDialog(false);
    onRefresh();
  };

  const abrirConfirmarChegada = (appointment: Appointment) => {
    setAppointmentConfirmarChegada(appointment);
    setConfirmarChegadaDialog(true);
  };

  const confirmarChegadaCidadao = () => {
    if (!appointmentConfirmarChegada) return;

    appointmentStore.updateAppointment(appointmentConfirmarChegada.id, { status: "Aguardando" });
    toast.success(`Chegada de ${appointmentConfirmarChegada.nomeCidadao} confirmada!`);
    setConfirmarChegadaDialog(false);
    setAppointmentConfirmarChegada(null);
    onRefresh();
  };

  const chamarProximo = () => {
    const atendente = currentUserName || "Atendente";
    const proximo = appointmentStore.chamarProximoAgendamento(atendente);

    if (proximo) {
      setAgendamentoParaChamar(proximo);
      setModalChamada(true);
      toast.success(`${proximo.nomeCidadao} foi chamado!`);
      onRefresh();
    } else {
      toast.error("Não há agendamentos aguardando atendimento");
    }
  };

  const abrirChamar = (appointment: Appointment) => {
    const atendente = currentUserName || "Atendente";
    appointmentStore.chamarAgendamento(appointment.id, atendente);
    setAgendamentoParaChamar(appointment);
    setModalChamada(true);
    toast.success(`${appointment.nomeCidadao} foi chamado!`);
    onRefresh();
  };

  const iniciarAtendimento = () => {
    if (agendamentoParaChamar) {
      appointmentStore.updateAppointment(agendamentoParaChamar.id, {
        status: "Atendimento",
      });
      toast.success("Atendimento iniciado");
      setModalChamada(false);
      onRefresh();
    }
  };

  const marcarNaoCompareceu = () => {
    if (agendamentoParaChamar) {
      appointmentStore.updateAppointment(agendamentoParaChamar.id, {
        status: "Não Compareceu",
      });
      toast.warning("Marcado como não compareceu");
      setModalChamada(false);
      onRefresh();
    }
  };

  const abrirDialogRegistrar = (appointment: Appointment) => {
    if (appointment.status === "Atendimento") {
      navigate(`/sistema/prontuario?id=${appointment.id}&cpf=${appointment.cpfCidadao || ""}`);
      return;
    }

    setAgendamentoParaRegistrar(appointment);
    setNomeAtendente(appointment.atendente || "");
    setHoraInicioReal(appointment.horaInicioReal || appointment.hora || "");
    setHoraFimReal(appointment.horaFimReal || "");
    setObservacoes(appointment.observacoes || "");
    setServicosAdicionais(appointment.servicosAdicionais || []);
    setDialogRegistrar(true);
  };

  const registrarAtendimento = () => {
    if (!agendamentoParaRegistrar) return;
    if (!nomeAtendente.trim()) {
      toast.error("Informe o nome do atendente");
      return;
    }
    if (!horaInicioReal || !horaFimReal) {
      toast.error("Informe os horários reais de início e fim do atendimento");
      return;
    }

    const currentCount = agendamentoParaRegistrar.registrosPosAtendimento || 0;
    appointmentStore.updateAppointment(agendamentoParaRegistrar.id, {
      atendente: nomeAtendente,
      servicosAdicionais: servicosAdicionais.length ? servicosAdicionais : undefined,
      horaInicioReal,
      horaFimReal,
      observacoes,
      status: "Atendimento",
      registrosPosAtendimento: currentCount + 1,
    });
    toast.success("Registro salvo!");
    setDialogRegistrar(false);
    onRefresh();
  };

  const assumirAtendimento = (appointment: Appointment) => {
    setAgendamentoParaAssumir(appointment);
    setGuicheAssumir(authStore.getMesa() || "");
    setModalAssumir(true);
  };

  const confirmarAssumirAtendimento = () => {
    if (!agendamentoParaAssumir) return;
    if (!guicheAssumir) {
      toast.error("Informe o guiche ou mesa para assumir o atendimento");
      return;
    }

    const supervisor = currentUserName || "Supervisor";
    appointmentStore.updateAppointment(agendamentoParaAssumir.id, {
      status: "Atendimento",
      atendente: supervisor,
      guiche: guicheAssumir,
    });
    authStore.setMesa(guicheAssumir);
    setAgendamentoAssumido(agendamentoParaAssumir.id);

    toast.success(`Voce assumiu o atendimento de ${agendamentoParaAssumir.nomeCidadao}`);

    navigate(
      `/sistema/registrar-servicos?id=${agendamentoParaAssumir.id}&categoria=${agendamentoParaAssumir.categoria}&servico=${agendamentoParaAssumir.servico}`,
    );

    onRefresh();
    setModalAssumir(false);
    setAgendamentoParaAssumir(null);
    setGuicheAssumir(authStore.getMesa() || "");
  };

  const salvarServicosRegistrados = (servicos: ServicoRegistrado[]) => {
    if (!agendamentoParaRegistrarServicos) return;

    appointmentStore.updateAppointment(agendamentoParaRegistrarServicos.id, {
      servicosRegistrados: servicos,
      status: "Finalizado",
    });

    toast.success("Serviços registrados com sucesso!");
    setModalRegistrarServicos(false);
    setAgendamentoParaRegistrarServicos(null);
    onRefresh();
  };

  const podeExibirBotaoChamar = (appointment: Appointment) => {
    const hoje = new Date().toISOString().split("T")[0];

    return (
      appointment.data === hoje &&
      (appointment.status === "Aguardando" || appointment.status === "Ativado - Aguardando Atendimento")
    );
  };

  const isAgendamentoAssumidoPorMim = (appointment: Appointment) => {
    return (
      agendamentoAssumido === appointment.id ||
      (appointment.status === "Atendimento" && appointment.atendente === currentUserName)
    );
  };

  return {
    visualizarDialog,
    setVisualizarDialog,
    appointmentSelecionado,
    carregarAgendamentoParaVisualizacao,

    editarDialog,
    setEditarDialog,
    appointmentEditar,
    novoHorario,
    novaData,
    novoServico,
    setNovoHorario,
    setNovaData,
    setNovoServico,
    abrirEditarHorario,
    salvarEdicaoHorario,

    excluirDialog,
    setExcluirDialog,
    appointmentExcluir,
    abrirExcluir,
    confirmarExclusao,

    confirmarChegadaDialog,
    setConfirmarChegadaDialog,
    appointmentConfirmarChegada,
    abrirConfirmarChegada,
    confirmarChegadaCidadao,

    modalChamada,
    setModalChamada,
    agendamentoParaChamar,
    chamarProximo,
    abrirChamar,
    iniciarAtendimento,
    marcarNaoCompareceu,

    agendamentoAssumido,
    modalAssumir,
    setModalAssumir,
    agendamentoParaAssumir,
    guicheAssumir,
    setGuicheAssumir,
    assumirAtendimento,
    confirmarAssumirAtendimento,

    dialogRegistrar,
    setDialogRegistrar,
    agendamentoParaRegistrar,
    nomeAtendente,
    setNomeAtendente,
    horaInicioReal,
    setHoraInicioReal,
    horaFimReal,
    setHoraFimReal,
    servicosAdicionais,
    setServicosAdicionais,
    observacoes,
    setObservacoes,
    abrirDialogRegistrar,
    registrarAtendimento,

    modalRegistrarServicos,
    setModalRegistrarServicos,
    agendamentoParaRegistrarServicos,
    setAgendamentoParaRegistrarServicos,
    salvarServicosRegistrados,

    podeExibirBotaoChamar,
    isAgendamentoAssumidoPorMim,
  };
}

