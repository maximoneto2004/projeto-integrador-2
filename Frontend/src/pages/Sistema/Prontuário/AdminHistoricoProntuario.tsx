import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Calendar, Search, User, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Badge } from "@/components/ui/badge";
import { prontuarioStore } from "@/lib/prontuarioStore";
import type { Prontuario } from "@/types/prontuario";
import { useHistoricoProntuario } from "@/hooks/prontuario/useHistoricoProntuario";
import type { LogRegistro } from "@/services/prontuario/logsService";
import { prontuarioService } from "@/services/prontuario/prontuarioService";
import { pessoaReferenciaService } from "@/services/prontuario/pessoaReferenciaService";
import { cidadaoService } from "@/services/sistema/cidadaoService";
import { unidadeCrasService } from "@/services/sistema/unidadeCrasService";

type HistoricoTipo = "criacao" | "atualizacao" | "exclusao";

interface HistoricoEvento {
  id: string;
  data: string;
  tipo: HistoricoTipo;
  titulo?: string;
  subtitulo?: string;
  resumo?: string;
  membroId?: string;
  membroNome?: string;
  detalhes?: { label: string; valor: string | number }[];
}

type HistoricoProntuarioInfo = {
  numero: string;
  unidade: string;
  pessoaReferencia: string;
  dataAbertura: string;
};

const STEP_STORAGE_PREFIX = "prontuarioStep:";

const isValidStep = (value: number) => Number.isInteger(value) && value >= 1;

const readStoredStep = (prontuarioId: string): number | null => {
  if (!prontuarioId) return null;
  const raw = localStorage.getItem(`${STEP_STORAGE_PREFIX}${prontuarioId}`);
  const parsed = Number(raw);
  return isValidStep(parsed) ? parsed : null;
};

const tipoLabels: Record<HistoricoTipo, string> = {
  criacao: "Criação",
  atualizacao: "Atualização",
  exclusao: "Exclusão",
};

const actionLabels: Record<number, string> = {
  1: "Criado",
  2: "Atualizado",
  3: "Excluído",
};

const formatDate = (date: string) => {
  if (!date) return "";
  const isoDateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    return `${isoDateMatch[3]}/${isoDateMatch[2]}/${isoDateMatch[1]}`;
  }
  return new Date(date).toLocaleDateString("pt-BR");
};

const asRecord = (value: unknown): Record<string, unknown> | null => (value && typeof value === "object" ? (value as Record<string, unknown>) : null);

const asString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const unwrapResult = (data: unknown): unknown => {
  const envelope = asRecord(data);
  if (!envelope) return data;
  if ("result" in envelope) return envelope.result;
  if ("data" in envelope) return envelope.data;
  return data;
};

const parseApiList = (data: unknown): Record<string, unknown>[] => {
  const unwrapped = unwrapResult(data);
  if (Array.isArray(unwrapped)) {
    return unwrapped.map((item) => asRecord(item)).filter(Boolean) as Record<string, unknown>[];
  }
  const maybeObject = asRecord(unwrapped);
  if (maybeObject && Array.isArray(maybeObject.results)) {
    return maybeObject.results.map((item) => asRecord(item)).filter(Boolean) as Record<string, unknown>[];
  }
  if (maybeObject) return [maybeObject];
  return [];
};

function toIsoDate(actionTime: string) {
  const value = actionTime.trim();
  const parts = value.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    if (day && month && year) {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function toHistoricoTipo(actionFlag: number): HistoricoTipo {
  if (actionFlag === 1) return "criacao";
  if (actionFlag === 3) return "exclusao";
  return "atualizacao";
}

function normalizeContentType(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\bobject\b.*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type ContentTypeMeta = {
  label: string;
  className: string;
  aliases: string[];
};

const historicoChoicesMetaList: ContentTypeMeta[] = [
  { label: "Composição Familiar", className: "border-transparent bg-sky-100 text-sky-800", aliases: ["membrocomposicao"] },
  { label: "Exclusão de Membro da Família", className: "border-transparent bg-pink-100 text-pink-800", aliases: ["exclusaomembrocomposicao"] },
  { label: "Pessoa de Referência", className: "border-transparent bg-cyan-100 text-cyan-800", aliases: ["pessoareferencia"] },
  { label: "Condição Habitacional", className: "border-transparent bg-amber-100 text-amber-900", aliases: ["condicaohabitacional"] },
  {
    label: "Descumprimento de Condicionalidades (PBF)",
    className: "border-transparent bg-yellow-100 text-yellow-800",
    aliases: ["descumprimentoeducacional"],
  },
  { label: "Trabalho e Renda por Membro", className: "border-transparent bg-emerald-100 text-emerald-800", aliases: ["trabalhorendimentomembro"] },
  {
    label: "Condição Educacional do Membro",
    className: "border-transparent bg-indigo-100 text-indigo-800",
    aliases: ["condicaoeducacionalmembro", "condicao educacional do membro", "condicao educacional membro"],
  },
  { label: "Condições de Saúde", className: "border-transparent bg-rose-100 text-rose-800", aliases: ["condicoesdesaude"] },
  { label: "Situação de Violência", className: "border-transparent bg-red-100 text-red-800", aliases: ["situacaoviolencia", "situacao violencia"] },
  {
    label: "Saúde e Cuidados por Membro",
    className: "border-transparent bg-orange-100 text-orange-800",
    aliases: ["saudecuidadosmembro", "saude e cuidados por membro", "saude cuidados membro"],
  },
  {
    label: "Avaliação do Acompanhamento Familiar",
    className: "border-transparent bg-fuchsia-100 text-fuchsia-800",
    aliases: ["avaliacaoacompanhamentofamiliar"],
  },
  {
    label: "Anotações de Planejamento Familiar",
    className: "border-transparent bg-orange-200 text-orange-900",
    aliases: ["anotacaoplanejamento", "anotacoes de planejamento familiar", "planejamento familiar"],
  },
  { label: "Acolhimento Institucional", className: "border-transparent bg-violet-100 text-violet-800", aliases: ["acolhimentoinstitucional"] },
  { label: "Convivência Familiar e Comunitária", className: "border-transparent bg-teal-100 text-teal-800", aliases: ["convivenciafamiliar"] },
  { label: "Trabalho e Rendimento familiar geral", className: "border-transparent bg-lime-100 text-lime-800", aliases: ["trabalhorendimento"] },
  { label: "Condições Educacionais", className: "border-transparent bg-blue-100 text-blue-800", aliases: ["condicaoeducacional"] },
  { label: "Benefícios Eventuais", className: "border-transparent bg-green-100 text-green-800", aliases: ["beneficioseventuais"] },
  { label: "Novo Ingresso", className: "border-transparent bg-slate-100 text-slate-800", aliases: ["novoingresso"] },
  {
    label: "Evolução do Acompanhamento",
    className: "border-transparent bg-purple-100 text-purple-800",
    aliases: ["evolucaoacompanhamento", "evolucao do acompanhamento", "evolucao e acompanhamento"],
  },
  { label: "Acolhimento Familiar", className: "border-transparent bg-cyan-200 text-cyan-900", aliases: ["acolhimentofamiliar"] },
  {
    label: "Transferência de Renda",
    className: "border-transparent bg-amber-200 text-amber-900",
    aliases: ["transferenciarenda", "transferencia de renda"],
  },
  {
    label: "Medidas Socioeducativas por Membro",
    className: "border-transparent bg-lime-200 text-lime-900",
    aliases: ["medidasocioeducativamembro", "medidas socioeducativas por membro"],
  },
  {
    label: "Medidas Socioeducativas",
    className: "border-transparent bg-emerald-200 text-emerald-900",
    aliases: ["medidasocioeducativa", "medidas socioeducativas"],
  },
  {
    label: "Acompanhamento pelo CRAS",
    className: "border-transparent bg-sky-200 text-sky-900",
    aliases: ["acompanhamentolapsc", "acompanhamento lapsc"],
  },
  {
    label: "Histórico Acompanhamento pelo Creas",
    className: "border-transparent bg-indigo-200 text-indigo-900",
    aliases: ["acompanhamentocreas", "historico acompanhamento pelo creas", "acompanhamento creas", "acompanhamento pelo creas"],
  },
  {
    label: "Descumprimento de Condicionalidades (Bolsa Família)",
    className: "border-transparent bg-yellow-200 text-yellow-900",
    aliases: ["descumprimentocondicionalidadesbolsa"],
  },
  {
    label: "Regsitro de Desligamento",
    className: "border-transparent bg-stone-100 text-stone-800",
    aliases: ["registrodesligamento", "regsitro de desligamento", "registro de desligamento"],
  },
  {
    label: "Convivência e Fortalecimento",
    className: "border-transparent bg-violet-200 text-violet-900",
    aliases: ["convivenviafortalecimento", "convivencia e fortalecimento", "convivenvia fortalecimento"],
  },
  {
    label: "Unidade",
    className: "border-transparent bg-neutral-100 text-neutral-800",
    aliases: ["unidade"],
  },
  {
    label: "Prontuário",
    className: "border-transparent bg-slate-200 text-slate-900",
    aliases: ["prontuario"],
  },
  {
    label: "Abastecimento de Água",
    className: "border-transparent bg-cyan-50 text-cyan-700",
    aliases: ["abastecimentoagua", "abastecimento de agua"],
  },
  {
    label: "Benefício Social",
    className: "border-transparent bg-emerald-50 text-emerald-700",
    aliases: ["beneficiosocial", "beneficio social"],
  },
  {
    label: "Benefícios e Serviços",
    className: "border-transparent bg-teal-200 text-teal-900",
    aliases: ["beneficiosservicos", "beneficios e servicos", "beneficios servicos"],
  },
  {
    label: "Forma de Ingresso",
    className: "border-transparent bg-blue-200 text-blue-900",
    aliases: ["formaingresso", "forma de ingresso"],
  },
  {
    label: "Órgão de Origem do Encaminhamento",
    className: "border-transparent bg-fuchsia-200 text-fuchsia-900",
    aliases: ["orgaoorigemencaminhamento", "orgao origem encaminhamento"],
  },
  {
    label: "Parentesco",
    className: "border-transparent bg-rose-200 text-rose-900",
    aliases: ["parentesco"],
  },
];

function resolveContentTypeMeta(value?: string) {
  const normalized = normalizeContentType(value || "");
  if (!normalized) return null;
  const compact = normalized.replace(/\s+/g, "");
  for (const item of historicoChoicesMetaList) {
    const candidates = [item.label, ...item.aliases];
    for (const alias of candidates) {
      const aliasNormalized = normalizeContentType(alias);
      if (!aliasNormalized) continue;
      if (aliasNormalized === normalized) return item;
      if (aliasNormalized.replace(/\s+/g, "") === compact) return item;
    }
  }

  return null;
}

function formatLabelFromKey(key: string) {
  const cleaned = key.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function formatContentTypeModelLabel(value?: string) {
  const raw = (value || "").trim();
  if (!raw) return "";

  const meta = resolveContentTypeMeta(raw);
  if (meta?.label) return meta.label;

  const withSpaces = raw
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  if (withSpaces.includes(" ")) {
    return withSpaces
      .split(" ")
      .map((word) => (word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : ""))
      .join(" ");
  }

  return raw;
}

const membroBadgePalette = [
  "border-transparent bg-sky-100 text-sky-800",
  "border-transparent bg-emerald-100 text-emerald-800",
  "border-transparent bg-amber-100 text-amber-900",
  "border-transparent bg-violet-100 text-violet-800",
  "border-transparent bg-rose-100 text-rose-800",
  "border-transparent bg-cyan-100 text-cyan-800",
  "border-transparent bg-lime-100 text-lime-800",
  "border-transparent bg-orange-100 text-orange-800",
];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getMembroBadgeClass(membroId?: string, membroNome?: string) {
  const key = `${membroId || ""}:${membroNome || ""}`.trim();
  if (!key) return "border-transparent bg-slate-100 text-slate-800";
  return membroBadgePalette[hashString(key) % membroBadgePalette.length];
}

function mapChangeMessage(changeMessage: LogRegistro["change_message"]) {
  if (!changeMessage || typeof changeMessage !== "object" || Array.isArray(changeMessage)) return [];

  const fieldLabels: Record<string, string> = {
    tipo: "Tipo",
    condicao_ocupacao: "Condição ocupação",
    vinculo_empregatico: "Vínculo empregatício",
    vinculo_empregaticio: "Vínculo empregatício",
    renda_individual: "Renda individual",
    carteira_assinada: "Carteira assinada",
    aposentado_pensionista: "Aposentado pensionista",
    qualificacao_profissional: "Qualificação profissional",
    data_exclusao: "Data de exclusão",
    "data exclusao": "Data de exclusão",
    responsavel: "Responsável",
    trabalho_infantil: "Situação de trabalho infantil?",
    situacao_trabalho_rua: "Situação de trabalho na rua?",
    negligencia: "Sofreu negligência?",
    exploracao_sexual: "Vítima de exploração sexual?",
    observacao_geral: "Observações gerais",
    observacoes: "Observações",
    observacao: "Observação",
    "Sofreu negligencia": "Sofreu negligência?",
    "Situação de trabalho infantil": "Situação de trabalho infantil?",
    "Situação de Trabalho na Rua": "Situação de Trabalho na Rua?",
    "Detalhemento/Contexto": "Detalhamento / Contexto",
    "Algum membro adulto está em instituição prisional": "Algum membro adulto está em instituição prisional?",
    "Algum adolescente cumpre medida socioeducativa de internação.": "Algum adolescente cumpre medida socioeducativa de internação?",
  };

  const enumLabelsByField: Record<string, Record<string, string>> = {
    condicao_ocupacao: {
      NAO_TRABALHA: "0 - Não trabalha",
      CONTA_PROPRIA: "1 - Conta própria (bico, autônomo)",
      SEM_CARTEIRA: "3 - Empregado sem carteira",
      COM_CARTEIRA: "4 - Empregado com carteira",
      MILITAR_PUBLICO: "8 - Militar ou servidor público",
    },
    vinculo_empregatico: {
      CLT: "CLT",
      AUTONOMO: "Autônomo",
      INFORMAL: "Informal",
      DESEMPREGADO: "Desempregado",
    },
    vinculo_empregaticio: {
      CLT: "CLT",
      AUTONOMO: "Autônomo",
      INFORMAL: "Informal",
      DESEMPREGADO: "Desempregado",
    },
  };

  const formatValue = (field: string, value: unknown) => {
    if (value === null || value === undefined) return "";

    if (Array.isArray(value)) {
      return value
        .map((item) => formatValue(field, item))
        .map((item) => String(item).trim())
        .filter(Boolean)
        .join(", ");
    }

    if (typeof value === "object") {
      const source = value as Record<string, unknown>;
      if ("depois" in source) return formatValue(field, source.depois);
      if (typeof source.nome === "string") return source.nome;
      if (typeof source.label === "string") return source.label;
      if (typeof source.value === "string" || typeof source.value === "number") return String(source.value);

      const pairs = Object.entries(source)
        .map(([key, itemValue]) => {
          const formatted = formatValue(key, itemValue);
          if (!formatted) return "";
          return `${formatLabelFromKey(key)}: ${formatted}`;
        })
        .filter(Boolean);

      return pairs.join(" | ");
    }

    if (typeof value === "boolean") {
      return value ? "Sim" : "Não";
    }

    const text = String(value).trim();
    if (!text) return "";

    if (field === "tipo") {
      const tipoMap: Record<string, string> = {
        criacao: "Criação",
        atualizacao: "Atualização",
        exclusao: "Exclusão",
      };
      const mapped = tipoMap[text.toLowerCase()];
      if (mapped) return mapped;
      return text.charAt(0).toUpperCase() + text.slice(1);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const [ano, mes, dia] = text.split("-");
      return `${dia}/${mes}/${ano}`;
    }

    if (text === "true") return "Sim";
    if (text === "false") return "Não";

    const enumMap = enumLabelsByField[field];
    if (enumMap && enumMap[text]) return enumMap[text];

    return text;
  };

  return Object.entries(changeMessage)
    .map(([key, value]) => {
      const formattedValue = formatValue(key, value);
      return {
        label: fieldLabels[key] || formatLabelFromKey(key),
        valor: formattedValue,
      };
    })
    .filter((item) => item.valor !== "");
}

function getObservacao(changeMessage: LogRegistro["change_message"]) {
  if (!changeMessage || typeof changeMessage !== "object" || Array.isArray(changeMessage)) return "";
  const source = changeMessage as Record<string, unknown>;
  const value = source.observacao ?? source.observacoes;
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function ensureSelectedStringOption(options: string[], selected: string) {
  if (!selected || selected === "todos") return options;
  if (options.includes(selected)) return options;
  return [selected, ...options];
}

export default function AdminHistoricoProntuario() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cpf = searchParams.get("cpf") || "";
  const prontuarioId = searchParams.get("prontuarioId") || "";
  const stepParam = searchParams.get("step") || "";
  const [prontuario, setProntuario] = useState<Prontuario | null>(null);
  const [prontuarioInfo, setProntuarioInfo] = useState<HistoricoProntuarioInfo>({
    numero: "-",
    unidade: "-",
    pessoaReferencia: "-",
    dataAbertura: "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [filterSecao, setFilterSecao] = useState("todos");
  const [filterProfissional, setFilterProfissional] = useState("todos");
  const [filterMembro, setFilterMembro] = useState("todos");
  const [paginaAtual, setPaginaAtual] = useState(1);

  useEffect(() => {
    if (!cpf) return;
    const p = prontuarioStore.getProntuarioByCpf(cpf);
    setProntuario(p || null);
  }, [cpf]);

  const prontuarioIdFiltro = useMemo(() => {
    return prontuarioId || (cpf ? localStorage.getItem(`prontuarioIdByCpf:${cpf}`) || "" : "");
  }, [cpf, prontuarioId]);

  const logsParams = useMemo(() => {
    if (!prontuarioIdFiltro) return undefined;
    return {
      prontuario_id: prontuarioIdFiltro,
      content_type_model: filterSecao !== "todos" ? filterSecao : undefined,
      membro: filterMembro !== "todos" ? filterMembro : undefined,
      user_display: filterProfissional !== "todos" ? filterProfissional : undefined,
      data_inicial: filterDateStart || undefined,
      data_final: filterDateEnd || undefined,
      search: searchTerm.trim() || undefined,
      page: paginaAtual,
    };
  }, [filterDateEnd, filterDateStart, filterMembro, filterProfissional, filterSecao, paginaAtual, prontuarioIdFiltro, searchTerm]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [filterDateEnd, filterDateStart, filterMembro, filterProfissional, filterSecao, prontuarioIdFiltro, searchTerm]);

  useEffect(() => {
    let active = true;

    const fallbackFromStore: HistoricoProntuarioInfo = {
      numero: prontuario?.numero || "-",
      unidade: prontuario?.unidade || "-",
      pessoaReferencia: prontuario?.membros.find((m) => m.id === prontuario?.pessoaReferenciaId)?.nome || "-",
      dataAbertura: prontuario?.dataAbertura || "",
    };

    setProntuarioInfo((prev) => ({
      ...prev,
      ...fallbackFromStore,
    }));

    if (!prontuarioIdFiltro)
      return () => {
        active = false;
      };

    const carregarInfoCard = async () => {
      try {
        const [prontuarioRes, pessoaRefRes, unidadesCras] = await Promise.all([
          prontuarioService.obter(prontuarioIdFiltro),
          pessoaReferenciaService.listar({ prontuario: prontuarioIdFiltro }),
          unidadeCrasService.listar(),
        ]);

        const prontuarioRaw = parseApiList(prontuarioRes.data)[0] || {};
        const pessoaRefItem = parseApiList(pessoaRefRes.data)[0] || {};
        const unidades = Array.isArray(unidadesCras) ? (unidadesCras.map((item) => asRecord(item)).filter(Boolean) as Record<string, unknown>[]) : [];

        const unidadeInicial = asRecord(prontuarioRaw.unidade_inicial);
        const unidadeInicialId = asString(unidadeInicial?.id) || asString(prontuarioRaw.unidade_inicial);
        const unidadeEncontrada = unidades.find((item) => {
          const unidadeObj = asRecord(item);
          if (!unidadeObj) return false;
          const id = asString(unidadeObj.id).toLowerCase();
          const unidade = asString(unidadeObj.unidade).toLowerCase();
          const target = unidadeInicialId.toLowerCase();
          return id === target || unidade === target;
        });
        const unidadeEncontradaObj = asRecord(unidadeEncontrada);
        const pessoaRefObj = asRecord(pessoaRefItem.pessoa_referencia);
        const pessoaRefFromProntuarioObj = asRecord(prontuarioRaw.pessoa_referencia);
        const pessoaReferenciaId =
          asString(pessoaRefObj?.id) ||
          asString(pessoaRefItem.pessoa_referencia) ||
          asString(pessoaRefFromProntuarioObj?.id) ||
          asString(prontuarioRaw.pessoa_referencia);

        let pessoaReferenciaNome =
          asString(pessoaRefObj?.nome_completo) ||
          asString(pessoaRefObj?.nome) ||
          asString(pessoaRefFromProntuarioObj?.nome_completo) ||
          asString(pessoaRefFromProntuarioObj?.nome) ||
          fallbackFromStore.pessoaReferencia;

        if ((!pessoaReferenciaNome || pessoaReferenciaNome === "-") && pessoaReferenciaId) {
          try {
            const cidadaoRes = await cidadaoService.obter(pessoaReferenciaId);
            pessoaReferenciaNome =
              asString(cidadaoRes.data?.nome) || asString((cidadaoRes.data as Record<string, unknown>)?.nome_completo) || pessoaReferenciaNome;
          } catch {
            // fallback silencioso do nome da pessoa de referência
          }
        }

        const nextInfo: HistoricoProntuarioInfo = {
          numero: asString(prontuarioRaw.numero) || fallbackFromStore.numero,
          unidade:
            asString(unidadeInicial?.nome) ||
            asString(unidadeInicial?.unidade) ||
            asString(unidadeEncontradaObj?.nome) ||
            asString(unidadeEncontradaObj?.unidade) ||
            asString(prontuarioRaw.unidade_inicial) ||
            fallbackFromStore.unidade,
          pessoaReferencia: pessoaReferenciaNome || "-",
          dataAbertura:
            asString(prontuarioRaw.created_at) ||
            asString(prontuarioRaw.data_criacao) ||
            asString(prontuarioRaw.data_abertura) ||
            fallbackFromStore.dataAbertura,
        };

        if (active) setProntuarioInfo(nextInfo);
      } catch {
        if (active) {
          setProntuarioInfo(fallbackFromStore);
        }
      }
    };

    void carregarInfoCard();

    return () => {
      active = false;
    };
  }, [prontuario, prontuarioIdFiltro]);

  const { data: historicoData, isLoading, isError, error } = useHistoricoProntuario(logsParams, Boolean(prontuarioIdFiltro));
  const logs = useMemo(() => historicoData?.logs ?? [], [historicoData?.logs]);
  const filtrosDisponiveis = historicoData?.filters;
  const totalPaginas = Math.max(1, Number(historicoData?.count ?? 0));
  const paginaAtualResposta = Number(historicoData?.page ?? paginaAtual);
  const hasPaginaAnterior = historicoData?.previous !== null && historicoData?.previous !== undefined;
  const hasPaginaProxima = historicoData?.next !== null && historicoData?.next !== undefined;

  const uniqueProfissionais = useMemo(() => {
    const profissionais =
      filtrosDisponiveis?.profissionais?.length && Array.isArray(filtrosDisponiveis.profissionais)
        ? [...new Set(filtrosDisponiveis.profissionais.map((nome) => nome?.toString().trim()).filter(Boolean) as string[])].sort()
        : [...new Set(logs.map((log) => log.user_display).filter(Boolean))].sort();
    return ensureSelectedStringOption(profissionais, filterProfissional);
  }, [filterProfissional, filtrosDisponiveis, logs]);

  const uniqueSecoes = useMemo(() => {
    const secoes =
      filtrosDisponiveis?.secoes?.length && Array.isArray(filtrosDisponiveis.secoes)
        ? [...new Set(filtrosDisponiveis.secoes.map((secao) => secao?.toString().trim()).filter(Boolean) as string[])].sort()
        : [...new Set(logs.map((log) => log.content_type_model).filter(Boolean))].sort();
    return ensureSelectedStringOption(secoes, filterSecao);
  }, [filterSecao, filtrosDisponiveis, logs]);

  const uniqueMembros = useMemo(() => {
    const map = new Map<string, string>();
    const membrosFiltros = filtrosDisponiveis?.membros ?? [];
    if (membrosFiltros.length) {
      membrosFiltros.forEach((membro) => {
        const membroId = membro?.id?.toString().trim();
        const membroNome = membro?.nome?.toString().trim();
        if (membroId && membroNome) map.set(membroId, membroNome);
      });
    } else {
      logs.forEach((log) => {
        const membroId = log.membro?.id?.toString().trim();
        const membroNome = log.membro?.nome?.toString().trim();
        if (membroId && membroNome) map.set(membroId, membroNome);
      });
    }
    return [...map.entries()].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [filtrosDisponiveis, logs]);

  const historicoEventos = useMemo(() => {
    return logs
      .map((log, index) => {
        const data = toIsoDate(log.action_time);
        if (!data) return null;
        const detalhes = mapChangeMessage(log.change_message);
        const observacao = getObservacao(log.change_message);
        const membroNome = log.membro?.nome?.toString().trim() || undefined;
        const objectTitle = log.object_repr?.toString().trim() || undefined;
        return {
          id: `${log.action_time}-${log.user_username}-${index}`,
          data,
          tipo: toHistoricoTipo(log.action_flag),
          titulo: objectTitle,
          subtitulo: `Profissional: ${log.user_display || "-"} (${log.user_username || "-"})`,
          resumo: observacao || undefined,
          membroId: log.membro?.id?.toString(),
          membroNome,
          detalhes,
        } satisfies HistoricoEvento;
      })
      .filter((evento) => evento !== null)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [logs]);
  const filteredEventos = historicoEventos;

  const groupedEvents = filteredEventos.reduce(
    (acc, event) => {
      const dateKey = event.data.substring(0, 10);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    },
    {} as Record<string, HistoricoEvento[]>,
  );

  const sortedDates = Object.keys(groupedEvents).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterDateStart("");
    setFilterDateEnd("");
    setFilterSecao("todos");
    setFilterProfissional("todos");
    setFilterMembro("todos");
    setPaginaAtual(1);
  };

  const handlePaginaAnterior = () => {
    if (!hasPaginaAnterior || isLoading) return;
    setPaginaAtual(Number(historicoData?.previous));
  };

  const handlePaginaProxima = () => {
    if (!hasPaginaProxima || isLoading) return;
    setPaginaAtual(Number(historicoData?.next));
  };

  const handleVoltarProntuario = () => {
    const nextSearch = new URLSearchParams();
    if (cpf) nextSearch.set("cpf", cpf);
    if (prontuarioIdFiltro) nextSearch.set("prontuarioId", prontuarioIdFiltro);

    const stepFromQuery = Number(stepParam);
    const stepFromStorage = readStoredStep(prontuarioIdFiltro);
    const resolvedStep = isValidStep(stepFromQuery) ? stepFromQuery : stepFromStorage;
    if (resolvedStep) nextSearch.set("step", String(resolvedStep));

    navigate(`/sistema/prontuario?${nextSearch.toString()}`);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <RoleBasedSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center px-6 gap-4">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Histórico do Prontuário Familiar</h1>
          </header>
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <Button variant="outline" onClick={handleVoltarProntuario} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Prontuário
              </Button>

              <Card className="border-l-4 border-l-primary">
                <CardHeader>
                  <CardTitle>Informações do Prontuário</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Número:</span>
                      <p className="font-semibold">{prontuarioInfo.numero || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Unidade Inicial:</span>
                      <p className="font-semibold">{prontuarioInfo.unidade || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pessoa de Referência:</span>
                      <p className="font-semibold">{prontuarioInfo.pessoaReferencia || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data de Abertura:</span>
                      <p className="font-semibold">{prontuarioInfo.dataAbertura ? formatDate(prontuarioInfo.dataAbertura) : "-"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Filtros</CardTitle>
                  <Button variant="outline" onClick={handleClearFilters} className="gap-1 text-xs px-3 h-8">
                    <RotateCcw className="h-3 w-3" />
                    Limpar Filtros
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                    <div className="space-y-2 lg:col-span-2">
                      <label className="text-sm font-medium">Buscar</label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por texto, campo, seção ou profissional"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data Início</label>
                      <Input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data Fim</label>
                      <Input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Seção</label>
                      <Select value={filterSecao} onValueChange={setFilterSecao}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todas</SelectItem>
                          {uniqueSecoes.map((secao) => (
                            <SelectItem key={secao} value={secao}>
                              {formatContentTypeModelLabel(secao)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Profissional</label>
                      <Select value={filterProfissional} onValueChange={setFilterProfissional}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          {uniqueProfissionais.map((nome) => (
                            <SelectItem key={nome} value={nome}>
                              {nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Membro</label>
                      <Select value={filterMembro} onValueChange={setFilterMembro}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          {uniqueMembros.map((membro) => (
                            <SelectItem key={membro.id} value={membro.id}>
                              {membro.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-8 relative pl-6 border-l border-gray-200 dark:border-gray-700">
                {isLoading && (
                  <Card className="ml-2">
                    <CardContent className="py-6 text-sm text-muted-foreground">Carregando histórico...</CardContent>
                  </Card>
                )}

                {isError && (
                  <Card className="ml-2 border-destructive/30">
                    <CardContent className="py-6 text-sm text-destructive">
                      Falha ao carregar histórico: {error instanceof Error ? error.message : "erro desconhecido"}
                    </CardContent>
                  </Card>
                )}

                {!isLoading && !isError && !prontuarioIdFiltro && (
                  <Card className="ml-2">
                    <CardContent className="py-6 text-sm text-muted-foreground">Informe um prontuário válido para carregar o histórico.</CardContent>
                  </Card>
                )}

                {!isLoading && !isError && Boolean(prontuarioIdFiltro) && filteredEventos.length === 0 && (
                  <Card className="ml-2">
                    <CardContent className="py-6 text-sm text-muted-foreground">Nenhum evento encontrado com os filtros atuais.</CardContent>
                  </Card>
                )}

                {sortedDates.map((dateKey) => (
                  <div key={dateKey} className="relative">
                    <div className="absolute -left-9 top-1.5 flex items-center justify-center h-4 w-4 rounded-full bg-primary ring-8 ring-white dark:ring-gray-800">
                      <Calendar className="h-2.5 w-2.5 text-white" />
                    </div>

                    <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{formatDate(dateKey)}</h2>

                    <div className="space-y-4">
                      {groupedEvents[dateKey].map((ev) => {
                        const membroBadgeClass = getMembroBadgeClass(ev.membroId, ev.membroNome);

                        return (
                          <Card key={ev.id} className="ml-0">
                            <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-4">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  {ev.membroNome && (
                                    <Badge variant="outline" className={membroBadgeClass}>
                                      Membro: {ev.membroNome}
                                    </Badge>
                                  )}

                                  <div className="flex items-center gap-1 text-sm text-muted-foreground sm:hidden">
                                    <Calendar className="h-4 w-4" />
                                    <span>{formatDate(ev.data)}</span>
                                  </div>
                                </div>
                                {ev.titulo && <CardTitle className="text-base">{ev.titulo}</CardTitle>}
                                {ev.subtitulo && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <User className="h-4 w-4" />
                                    <p>{ev.subtitulo}</p>
                                  </div>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {ev.resumo && (
                                <p className="text-sm leading-relaxed border-l-2 pl-3 border-gray-300 dark:border-gray-600 italic">{ev.resumo}</p>
                              )}

                              {ev.detalhes && ev.detalhes.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm pt-2">
                                  {ev.detalhes.map((det) => (
                                    <div key={`${ev.id}-${det.label}`} className="space-y-1 rounded-md border p-3">
                                      <p className="text-xs text-muted-foreground">{det.label}</p>
                                      <p className="font-medium break-words">{det.valor}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {!isError && !isLoading && Boolean(prontuarioIdFiltro) && (
                <div className="flex items-center justify-between border rounded-lg px-4 py-3 bg-card">
                  <p className="text-sm text-muted-foreground">
                    Página {paginaAtualResposta} / {totalPaginas}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePaginaAnterior} disabled={!hasPaginaAnterior || isLoading}>
                      Anterior
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePaginaProxima} disabled={!hasPaginaProxima || isLoading}>
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
