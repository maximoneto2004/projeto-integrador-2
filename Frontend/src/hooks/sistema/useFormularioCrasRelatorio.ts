import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useAtividadesCadunicoRelatorio } from "@/hooks/sistema/useAtividadesCadunicoRelatorio";
import { deriveRoleFromGroups } from "@/lib/authHelpers";
import { getApiErrorMessage } from "@/lib/notifications";
import { toast } from "@/lib/sonner";
import {
  buildCsv,
  buildReportRows,
  downloadCsv,
  downloadFormularioCrasDocx,
  downloadFormularioCrasXlsx,
} from "@/utils/relatorio/formularioCrasExport";
import { bairroService } from "@/services/sistema/bairroService";
import { relatorioService } from "@/services/sistema/relatorioService";
import { unidadeCrasService } from "@/services/sistema/unidadeCrasService";

type UnidadeOpcao = {
  id: string;
  nome: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
};

export type FormatoArquivo = "csv" | "xlsx" | "docx";
export type TipoRelatorio = "formulario_cras" | "atividades_cadunico";

export const ALL_UNIDADES_VALUE = "__ALL__";
const TIPO_RELATORIO_INTEGRADO: TipoRelatorio = "formulario_cras";

const toInputDate = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseMonthInput = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return null;
  return { year, month };
};

const montarEnderecoUnidade = (unidade: UnidadeOpcao | null) => {
  if (!unidade) return "";

  const partes: string[] = [];
  if (unidade.logradouro) partes.push(unidade.logradouro);
  if (unidade.numero) partes.push(unidade.numero);
  if (unidade.complemento) partes.push(unidade.complemento);
  if (unidade.bairro) partes.push(`Bairro ${unidade.bairro}`);
  return partes.join(", ");
};

export function useFormularioCrasRelatorio() {
  const { user } = useAuth();
  const { gerarRelatorioAtividadesCadunico } = useAtividadesCadunicoRelatorio();
  const userRole = deriveRoleFromGroups(user?.grupos);
  const isCoordenador = userRole === "coordenador";
  const unidadeCoordenadorId = user?.unidade_ativa?.id ? String(user.unidade_ativa.id) : null;
  const hoje = useMemo(() => new Date(), []);
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>(TIPO_RELATORIO_INTEGRADO);
  const [mesReferencia, setMesReferencia] = useState<string>(toInputDate(hoje).slice(0, 7));
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>(ALL_UNIDADES_VALUE);
  const [unidades, setUnidades] = useState<UnidadeOpcao[]>([]);
  const [formatoArquivo, setFormatoArquivo] = useState<FormatoArquivo>("csv");
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);

  const formatosDisponiveis = useMemo<FormatoArquivo[]>(() => {
    if (tipoRelatorio === "atividades_cadunico") {
      return ["xlsx"];
    }
    return ["csv", "xlsx", "docx"];
  }, [tipoRelatorio]);

  const unidadesPorId = useMemo(() => {
    const mapa = new Map<string, string>();
    unidades.forEach((unidade) => {
      mapa.set(unidade.id, unidade.nome);
    });
    return mapa;
  }, [unidades]);

  const carregarUnidades = useCallback(async () => {
    if (isCoordenador && unidadeCoordenadorId) {
      try {
        const [unidadesData, bairrosResponse] = await Promise.all([
          unidadeCrasService.listar(),
          bairroService.listar().catch(() => null),
        ]);
        const bairros = bairrosResponse?.data?.result || [];
        const bairroPorId = new Map<string, string>(
          bairros
            .filter((bairro) => Boolean(bairro?.id) && Boolean(bairro?.nome))
            .map((bairro) => [String(bairro.id), String(bairro.nome)])
        );
        const unidade = (unidadesData || [])
          .filter((item) => String(item.id) === unidadeCoordenadorId)
          .map((item) => ({
            id: String(item.id),
            nome: item.nome,
            logradouro: item.logradouro || "",
            numero: item.numero || "",
            complemento: item.complemento || null,
            bairro: bairroPorId.get(String(item.bairro)) || item.bairro || "",
          }))[0];

        if (unidade) {
          setUnidades([unidade]);
          setUnidadeSelecionada(unidade.id);
          return;
        }
      } catch {
        // fallback handled below
      }
      setUnidades([]);
      setUnidadeSelecionada(unidadeCoordenadorId);
      return;
    }

    setLoadingUnidades(true);
    try {
      const [unidadesData, bairrosResponse] = await Promise.all([
        unidadeCrasService.listar(),
        bairroService.listar().catch(() => null),
      ]);
      const bairros = bairrosResponse?.data?.result || [];
      const bairroPorId = new Map<string, string>(
        bairros
          .filter((bairro) => Boolean(bairro?.id) && Boolean(bairro?.nome))
          .map((bairro) => [String(bairro.id), String(bairro.nome)])
      );

      const unidadesAtivas = (unidadesData || [])
        .filter((unidade) => unidade.is_active !== false)
        .map((unidade) => ({
          id: String(unidade.id),
          nome: unidade.nome,
          logradouro: unidade.logradouro || "",
          numero: unidade.numero || "",
          complemento: unidade.complemento || null,
          bairro: bairroPorId.get(String(unidade.bairro)) || unidade.bairro || "",
        }));
      setUnidades(unidadesAtivas);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível carregar as unidades."));
    } finally {
      setLoadingUnidades(false);
    }
  }, [isCoordenador, unidadeCoordenadorId]);

  useEffect(() => {
    if (tipoRelatorio === "atividades_cadunico" && formatoArquivo !== "xlsx") {
      setFormatoArquivo("xlsx");
      return;
    }
    if (!formatosDisponiveis.includes(formatoArquivo)) {
      setFormatoArquivo(formatosDisponiveis[0]);
    }
  }, [formatoArquivo, formatosDisponiveis, tipoRelatorio]);

  const gerarRelatorio = useCallback(async () => {
    const mesSelecionado = parseMonthInput(mesReferencia);
    if (!mesSelecionado) {
      toast.error("Informe o mês de referência.");
      return;
    }

    const unidadeFiltroEfetiva =
      isCoordenador && unidadeCoordenadorId
        ? unidadeCoordenadorId
        : unidadeSelecionada === ALL_UNIDADES_VALUE
          ? undefined
          : unidadeSelecionada;

    setLoadingRelatorio(true);
    try {
      if (tipoRelatorio === "atividades_cadunico") {
        if (formatoArquivo !== "xlsx") {
          toast.error("O relatório de atividades do CadÚnico está disponível apenas em XLSX.");
          return;
        }

        const timestamp = toInputDate(new Date()).replace(/-/g, "");
        const unidadeNome =
          unidadeFiltroEfetiva === undefined
            ? "Todas as unidades"
            : unidadesPorId.get(unidadeFiltroEfetiva) || unidadeFiltroEfetiva;

        await gerarRelatorioAtividadesCadunico({
          mes_referencia: mesSelecionado.month,
          ano_referencia: mesSelecionado.year,
          unidade_cras: unidadeFiltroEfetiva,
          unidadeNome,
          formato: formatoArquivo,
          nomeArquivo:
            formatoArquivo === "xlsx"
              ? `relatorio-atividades-cadunico-${timestamp}.xlsx`
              : `relatorio-atividades-cadunico-${timestamp}.csv`,
        });
        toast.success(`Arquivo ${formatoArquivo.toUpperCase()} gerado com sucesso.`);
        return;
      }

      const response = await relatorioService.obterAtendimentosTecnico({
        mes_referencia: mesSelecionado.month,
        ano_referencia: mesSelecionado.year,
        unidade_cras: unidadeFiltroEfetiva,
      });

      if (!response.data?.success || !response.data?.result) {
        throw new Error("Resposta de relatório inválida.");
      }

      const resultado = response.data.result;
      const linhasRelatorio = buildReportRows([resultado], (unidadeId) => {
        if (!unidadeId) return "Todas as unidades";
        return unidadesPorId.get(unidadeId) || unidadeId;
      });

      const timestamp = toInputDate(new Date()).replace(/-/g, "");
      const periodoTexto = `${String(mesSelecionado.month).padStart(2, "0")}/${mesSelecionado.year}`;
      const subtitulo = `Período: ${periodoTexto} | Unidade: ${
        unidadeFiltroEfetiva === undefined
          ? "Todas as unidades"
          : unidadesPorId.get(unidadeFiltroEfetiva) || unidadeFiltroEfetiva
      }`;
      const unidadeNome =
        unidadeFiltroEfetiva === undefined
          ? "Todas as unidades"
          : unidadesPorId.get(unidadeFiltroEfetiva) || unidadeFiltroEfetiva;
      const unidadeSelecionadaDados =
        unidadeFiltroEfetiva === undefined
          ? null
          : unidades.find((unidade) => unidade.id === unidadeFiltroEfetiva) || null;
      const cabecalhoFormulario = {
        unidadeNome,
        endereco: montarEnderecoUnidade(unidadeSelecionadaDados),
        municipio: "Fortaleza",
        uf: "CE",
      };

      if (formatoArquivo === "xlsx") {
        await downloadFormularioCrasXlsx(resultado, `formulario-registro-mensal-cras-${timestamp}.xlsx`, cabecalhoFormulario);
        toast.success("Arquivo XLSX gerado com sucesso.");
        return;
      }

      if (formatoArquivo === "docx") {
        await downloadFormularioCrasDocx(resultado, `formulario-registro-mensal-cras-${timestamp}.docx`, cabecalhoFormulario);
        toast.success("Arquivo DOCX gerado com sucesso.");
        return;
      }

      const csv = buildCsv(linhasRelatorio, subtitulo);
      downloadCsv(csv, `relatorio-atendimentos-tecnico-${timestamp}.csv`);
      toast.success("Arquivo CSV gerado com sucesso.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Não foi possível gerar o relatório."));
    } finally {
      setLoadingRelatorio(false);
    }
  }, [
    formatoArquivo,
    gerarRelatorioAtividadesCadunico,
    isCoordenador,
    mesReferencia,
    tipoRelatorio,
    unidadeCoordenadorId,
    unidades,
    unidadeSelecionada,
    unidadesPorId,
  ]);

  const limparFiltros = useCallback(() => {
    setTipoRelatorio(TIPO_RELATORIO_INTEGRADO);
    setMesReferencia(toInputDate(hoje).slice(0, 7));
    setUnidadeSelecionada(isCoordenador && unidadeCoordenadorId ? unidadeCoordenadorId : ALL_UNIDADES_VALUE);
    setFormatoArquivo("csv");
  }, [hoje, isCoordenador, unidadeCoordenadorId]);

  useEffect(() => {
    void carregarUnidades();
  }, [carregarUnidades]);

  return {
    allUnidadesValue: ALL_UNIDADES_VALUE,
    formatoArquivo,
    loadingRelatorio,
    loadingUnidades,
    mesReferencia,
    formatosDisponiveis,
    isCoordenador,
    tipoRelatorio,
    unidades,
    unidadeSelecionada,
    setFormatoArquivo,
    setMesReferencia,
    setTipoRelatorio,
    setUnidadeSelecionada,
    gerarRelatorio,
    limparFiltros,
  };
}
