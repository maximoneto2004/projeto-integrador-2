import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "@/lib/sonner";
import { agendarService, getUnidadesFromResponse } from "@/services/agendarService";
import { agendamentoService } from "@/services/sistema/agendamentoService";
import type { AgendamentoResponse } from "@/types/api";
import { getApiErrorMessage } from "@/lib/notifications";

type SelectOption = { value: string; label: string };
type HorarioOption = { value: string; label: string; complemento?: string };

const normalizeCategoriaNome = (value: string) => value.trim().toUpperCase();

type UseAgendamentoSelectsOptions = {
  agendamentoEmEdicao?: AgendamentoResponse | null;
  defaultUnidade?: string;
  initialDate?: string;
};

export function useAgendamentoSelects(options: UseAgendamentoSelectsOptions = {}) {
  const { agendamentoEmEdicao, defaultUnidade, initialDate } = options;
  const defaultDate = useMemo(() => initialDate ?? format(new Date(), "yyyy-MM-dd"), [initialDate]);

  const [unidade, setUnidade] = useState(defaultUnidade ?? "");
  const [categoria, setCategoria] = useState("");
  const [servico, setServico] = useState("");
  const [horario, setHorario] = useState("");
  const [dataAgendamento, setDataAgendamento] = useState(defaultDate);
  const [opcoesUnidades, setOpcoesUnidades] = useState<SelectOption[]>([]);
  const [opcoesCategorias, setOpcoesCategorias] = useState<SelectOption[]>([]);
  const [opcoesServicos, setOpcoesServicos] = useState<SelectOption[]>([]);
  const [opcoesHorarios, setOpcoesHorarios] = useState<HorarioOption[]>([]);
  const [opcoesDatasDisponiveis, setOpcoesDatasDisponiveis] = useState<string[]>([]);
  const [carregandoCategorias, setCarregandoCategorias] = useState(false);
  const [carregandoServicos, setCarregandoServicos] = useState(false);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [carregandoDatas, setCarregandoDatas] = useState(false);

  const resetSelections = () => {
    setCategoria("");
    setServico("");
    setHorario("");
    setOpcoesServicos([]);
    setOpcoesHorarios([]);
  };

  const resetForm = () => {
    resetSelections();
    setDataAgendamento(defaultDate);
  };

  const onChangeUnidade = (value: string) => {
    setUnidade(value);
    setCategoria("");
    setServico("");
    setHorario("");
    setOpcoesCategorias([]);
    setOpcoesServicos([]);
    setOpcoesHorarios([]);
  };

  const onChangeCategoria = (value: string) => {
    setCategoria(value);
    setServico("");
    setHorario("");
    setOpcoesServicos([]);
    setOpcoesHorarios([]);
  };

  useEffect(() => {
    if (!defaultUnidade) return;

    setUnidade((u) => (u ? u : defaultUnidade));
  }, [defaultUnidade]);

  useEffect(() => {
    const carregarUnidades = async () => {
      try {
        const resp = await agendarService.listarUnidades();
        const lista = getUnidadesFromResponse(resp.data).map((item) => ({
          value: String(item.id),
          label: item.nome,
        })) as SelectOption[];
        setOpcoesUnidades(lista);
        setUnidade((u) => {
          if (u) return u;
          if (defaultUnidade) return defaultUnidade;
          return lista[0]?.value ?? "";
        });
      } catch (err) {
        console.error(err);
        toast.error(getApiErrorMessage(err, "Não foi possível carregar unidades."));
      }
    };

    carregarUnidades();
  }, [defaultUnidade]);

  useEffect(() => {
    if (!unidade) {
      resetSelections();
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
          .filter((tipo) => {
            const nome = normalizeCategoriaNome(tipo.label);
            return nome === "COMUM" || nome === "ESPECIALIZADO";
          }) as SelectOption[];
        setOpcoesCategorias(lista);
      } catch (err) {
        console.error(err);
        toast.error(getApiErrorMessage(err, "Não foi possível carregar categorias."));
      } finally {
        setCarregandoCategorias(false);
      }
    };

    carregarCategorias();
  }, [agendamentoEmEdicao, unidade]);

  useEffect(() => {
    if (!unidade || !categoria) {
      setServico("");
      setHorario("");
      setOpcoesServicos([]);
      setOpcoesHorarios([]);
      setOpcoesDatasDisponiveis([]);
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
      } catch (err) {
        console.error(err);
        toast.error(getApiErrorMessage(err, "Não foi possível carregar serviços."));
      } finally {
        setCarregandoServicos(false);
      }
    };

    carregarServicos();
  }, [agendamentoEmEdicao, categoria, unidade]);

  useEffect(() => {
    if (!unidade || !categoria) {
      setOpcoesDatasDisponiveis([]);
      return;
    }

    const carregarDatasDisponiveis = async () => {
      setCarregandoDatas(true);
      try {
        const { data: resposta } = await agendamentoService.listarVagas({
          tipo_servico: categoria,
          unidade,
        });
        if (!resposta.success) {
          throw new Error((resposta as unknown as { result?: string }).result || "Falha ao carregar datas.");
        }

        const lista = Array.isArray(resposta.result) ? resposta.result : [];
        const datas = new Set<string>();
        lista.forEach((vaga: any) => {
          const dataVaga = String(vaga?.data || "");
          if (!dataVaga) return;
          const vagasDisponiveis =
            typeof vaga?.vagas_disponiveis === "number"
              ? vaga.vagas_disponiveis
              : typeof vaga?.vagas === "number" && typeof vaga?.vagas_ocupadas === "number"
                ? vaga.vagas - vaga.vagas_ocupadas
                : 0;
          const ativo = typeof vaga?.is_active === "boolean" ? vaga.is_active : true;
          if (!ativo || vagasDisponiveis <= 0) return;
          datas.add(dataVaga);
        });
        setOpcoesDatasDisponiveis(Array.from(datas));
      } catch (err) {
        console.error(err);
        toast.error(getApiErrorMessage(err, "Não foi possível carregar datas disponíveis."));
        setOpcoesDatasDisponiveis([]);
      } finally {
        setCarregandoDatas(false);
      }
    };

    carregarDatasDisponiveis();
  }, [categoria, unidade]);

  useEffect(() => {
    if (!dataAgendamento) return;
    if (!opcoesDatasDisponiveis.length) return;
    if (!opcoesDatasDisponiveis.includes(dataAgendamento)) {
      setDataAgendamento("");
      setHorario("");
      setOpcoesHorarios([]);
    }
  }, [dataAgendamento, opcoesDatasDisponiveis]);

  useEffect(() => {
    if (!unidade || !categoria || !dataAgendamento) {
      setHorario("");
      setOpcoesHorarios([]);
      return;
    }

    const carregarVagas = async () => {
      setCarregandoHorarios(true);
      try {
        const { data: resposta } = await agendamentoService.listarVagas({
          data: dataAgendamento,
          tipo_servico: categoria,
          unidade,
        });
        if (!resposta.success) {
          throw new Error((resposta as unknown as { result?: string }).result || "Falha ao carregar horários.");
        }
        const horarios = (resposta.result || []).map((vaga: any) => {
          const horarioLabel = (vaga.horario || "").slice(0, 5) || vaga.horario;
          const vagasDisponiveis =
            typeof vaga.vagas_disponiveis === "number"
              ? vaga.vagas_disponiveis
              : typeof vaga.vagas === "number" && typeof vaga.vagas_ocupadas === "number"
                ? vaga.vagas - vaga.vagas_ocupadas
                : undefined;

          return {
            value: String(vaga.id),
            label: horarioLabel,
            complemento: typeof vagasDisponiveis === "number" ? `${vagasDisponiveis} vagas` : undefined,
          };
        }) as HorarioOption[];
        const horarioAtualLabel = (agendamentoEmEdicao?.horario || "").slice(0, 5);
        const vagaAtualId = (agendamentoEmEdicao as any)?.vaga;
        const tipoServicoOriginal = (agendamentoEmEdicao?.servico as any)?.tipo_servico;
        const tipoServicoOriginalId =
          typeof tipoServicoOriginal === "object" ? String(tipoServicoOriginal?.id || "") : String(tipoServicoOriginal || "");
        const mesmaCategoria = !!agendamentoEmEdicao && !!categoria && tipoServicoOriginalId === String(categoria);
        const mesmaUnidade = !!agendamentoEmEdicao && String((agendamentoEmEdicao as any)?.unidade?.id || "") === String(unidade || "");
        const mesmaData = !!agendamentoEmEdicao && String(agendamentoEmEdicao?.data || "") === String(dataAgendamento || "");
        const podeManterHorarioAtual = mesmaCategoria && mesmaUnidade && mesmaData;
        const horarioJaListado = horarios.find((item) => item.label === horarioAtualLabel);
        const horarioAtualOption =
          podeManterHorarioAtual && vagaAtualId && horarioAtualLabel
            ? {
                value: String(vagaAtualId),
                label: horarioAtualLabel,
                complemento: "horário atual",
              }
            : null;

        const horariosComAtual = horarioAtualOption && !horarioJaListado ? [horarioAtualOption, ...horarios] : horarios;

        setOpcoesHorarios(horariosComAtual);
        if (agendamentoEmEdicao && podeManterHorarioAtual) {
          const horarioAtual = (agendamentoEmEdicao.horario || "").slice(0, 5);
          const vagaAtual =
            horariosComAtual.find((item) => item.label === horarioAtual) ||
            (horarioAtualOption && horariosComAtual[0]?.value === horarioAtualOption.value ? horarioAtualOption : undefined);
          if (vagaAtual) {
            setHorario((valorAtual) => valorAtual || vagaAtual.value);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error(getApiErrorMessage(err, "Não foi possível carregar horários."));
      } finally {
        setCarregandoHorarios(false);
      }
    };

    carregarVagas();
  }, [agendamentoEmEdicao, categoria, dataAgendamento, unidade]);

  return {
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
    carregandoCategorias,
    carregandoServicos,
    carregandoHorarios,
    carregandoDatas,
    opcoesDatasDisponiveis,
    resetForm,
    onChangeUnidade,
    onChangeCategoria,
  };
}
