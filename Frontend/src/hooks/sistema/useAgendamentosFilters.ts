import { useEffect, useMemo, useState } from "react";
import type { AgendamentoListParams } from "@/services/sistema/agendamentoService";
import { useAuth } from "@/contexts/AuthContext";
import { deriveRoleFromGroups } from "@/lib/authHelpers";

type FiltersState = {
  filtroData: string;
  filtroUnidade: string;
  filtroServico: string;
  filtroStatus: string;
  filtroAtendente: string;
  buscaTexto: string;
  buscaTextoDebounced: string;
};

type FiltersSetters = {
  setFiltroData: (value: string) => void;
  setFiltroUnidade: (value: string) => void;
  setFiltroServico: (value: string) => void;
  setFiltroStatus: (value: string) => void;
  setFiltroAtendente: (value: string) => void;
  setBuscaTexto: (value: string) => void;
};

type FiltersOptions = {
  debounceMs?: number;
  defaults?: Partial<Omit<FiltersState, "buscaTextoDebounced">>;
};

export function useAgendamentosFilters(options: FiltersOptions = {}) {
  const { debounceMs = 350, defaults } = options;
  const { user } = useAuth();
  const hoje = new Date().toLocaleDateString("en-CA");
  const userRole = deriveRoleFromGroups(user?.grupos);
  const isAtendente156 = userRole === "atendente 156";

  const [filtroData, setFiltroData] = useState(defaults?.filtroData ?? hoje);
  const [filtroUnidade, setFiltroUnidade] = useState(
    defaults?.filtroUnidade ?? (isAtendente156 ? "todas" : user?.unidade_ativa?.id ?? "todas")
  );
  const [filtroServico, setFiltroServico] = useState(defaults?.filtroServico ?? "todos");
  const [filtroStatus, setFiltroStatus] = useState(defaults?.filtroStatus ?? (isAtendente156 ? "AGENDADO" : "todos"));
  const [filtroAtendente, setFiltroAtendente] = useState(defaults?.filtroAtendente ?? "todos");
  const [buscaTexto, setBuscaTexto] = useState(defaults?.buscaTexto ?? "");
  const [buscaTextoDebounced, setBuscaTextoDebounced] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setBuscaTextoDebounced(buscaTexto);
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [buscaTexto, debounceMs]);

  const params = useMemo<AgendamentoListParams>(() => {
    const apiParams: AgendamentoListParams = {};
    if (filtroData) apiParams.data = filtroData;
    if (filtroUnidade && filtroUnidade !== "todas") apiParams.unidade = filtroUnidade;
    if (filtroServico && filtroServico !== "todos") apiParams.servico = filtroServico;
    if (isAtendente156) {
      apiParams.situacao = "AGENDADO";
    } else if (filtroStatus && filtroStatus !== "todos") {
      apiParams.situacao = filtroStatus;
    }
    if (filtroAtendente && filtroAtendente !== "todos") apiParams.atendente = filtroAtendente;
    const busca = buscaTextoDebounced.trim();
    if (busca) {
      const digits = busca.replace(/\D/g, "");
      if (digits.length >= 11) {
        apiParams.cpf = digits;
      } else {
        apiParams.nome = busca;
      }
    }
    return apiParams;
  }, [
    buscaTextoDebounced,
    filtroAtendente,
    filtroData,
    filtroServico,
    filtroStatus,
    filtroUnidade,
  ]);

  const resetFilters = () => {
    setFiltroData(hoje);
    setFiltroUnidade(isAtendente156 ? "todas" : user?.unidade_ativa?.id ?? "todas");
    setFiltroServico("todos");
    setFiltroStatus(isAtendente156 ? "AGENDADO" : "todos");
    setFiltroAtendente("todos");
    setBuscaTexto("");
  };

  const filters: FiltersState = {
    filtroData,
    filtroUnidade,
    filtroServico,
    filtroStatus,
    filtroAtendente,
    buscaTexto,
    buscaTextoDebounced,
  };

  const setters: FiltersSetters = {
    setFiltroData,
    setFiltroUnidade,
    setFiltroServico,
    setFiltroStatus,
    setFiltroAtendente,
    setBuscaTexto,
  };

  return { filters, setters, params, resetFilters };
}
