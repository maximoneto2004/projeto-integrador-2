import { useEffect, useMemo, useState } from "react";
import type { Appointment } from "@/types/agenda";

type UseAgendamentoFiltrosReturn = {
  filteredAppointments: Appointment[];
  filtroData: string;
  setFiltroData: (value: string) => void;
  filtroUnidade: string;
  setFiltroUnidade: (value: string) => void;
  filtroServico: string;
  setFiltroServico: (value: string) => void;
  filtroStatus: string;
  setFiltroStatus: (value: string) => void;
  filtroAtendente: string;
  setFiltroAtendente: (value: string) => void;
  buscaTexto: string;
  setBuscaTexto: (value: string) => void;
  unidades: string[];
  servicos: string[];
  status: string[];
  atendentes: string[];
};

/**
 * Concentra a lógica de filtros e busca da tela de agendamentos.
 * Mantém os estados dos filtros e devolve a lista filtrada e as opções únicas.
 */
export function useAgendamentoFiltros(appointments: Appointment[]): UseAgendamentoFiltrosReturn {
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>(appointments);

  const [filtroData, setFiltroData] = useState<string>("");
  const [filtroUnidade, setFiltroUnidade] = useState<string>("todas");
  const [filtroServico, setFiltroServico] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroAtendente, setFiltroAtendente] = useState<string>("todos");
  const [buscaTexto, setBuscaTexto] = useState<string>("");

  const { unidades, servicos, status, atendentes } = useMemo(() => {
    const uniqueUnidades = new Set<string>();
    const uniqueServicos = new Set<string>();
    const uniqueStatus = new Set<string>();
    const uniqueAtendentes = new Set<string>();

    appointments.forEach((appointment) => {
      if (appointment.unidade) uniqueUnidades.add(appointment.unidade);
      if (appointment.servico) uniqueServicos.add(appointment.servico);
      if (appointment.status) uniqueStatus.add(appointment.status);
      if (appointment.atendente) uniqueAtendentes.add(appointment.atendente);
    });

    return {
      unidades: Array.from(uniqueUnidades),
      servicos: Array.from(uniqueServicos),
      status: Array.from(uniqueStatus),
      atendentes: Array.from(uniqueAtendentes),
    };
  }, [appointments]);

  useEffect(() => {
    let resultado = [...appointments];

    if (filtroData) {
      resultado = resultado.filter((a) => a.data === filtroData);
    }

    if (filtroUnidade !== "todas") {
      resultado = resultado.filter((a) => a.unidade === filtroUnidade);
    }

    if (filtroServico !== "todos") {
      resultado = resultado.filter((a) => a.servico === filtroServico);
    }

    if (filtroStatus !== "todos") {
      resultado = resultado.filter((a) => a.status === filtroStatus);
    }

    if (filtroAtendente !== "todos") {
      resultado = resultado.filter((a) => a.atendente === filtroAtendente);
    }

    if (buscaTexto.trim()) {
      const busca = buscaTexto.toLowerCase();
      resultado = resultado.filter(
        (a) =>
          a.nomeCidadao?.toLowerCase().includes(busca) ||
          a.cpfCidadao?.toLowerCase().includes(busca),
      );
    }

    setFilteredAppointments(resultado);
  }, [
    appointments,
    filtroData,
    filtroUnidade,
    filtroServico,
    filtroStatus,
    filtroAtendente,
    buscaTexto,
  ]);

  return {
    filteredAppointments,
    filtroData,
    setFiltroData,
    filtroUnidade,
    setFiltroUnidade,
    filtroServico,
    setFiltroServico,
    filtroStatus,
    setFiltroStatus,
    filtroAtendente,
    setFiltroAtendente,
    buscaTexto,
    setBuscaTexto,
    unidades,
    servicos,
    status,
    atendentes,
  };
}
