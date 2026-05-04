import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, FileText, MapPin, UserCircle, ClipboardCheck, Printer, Send, Building2, Phone } from "lucide-react";
import { toast } from "@/lib/sonner";

import { prontuarioStore } from "@/lib/prontuarioStore";
import type { Prontuario } from "@/types/prontuario";
import { authStore } from "@/lib/authStore";
import { useUnidadesCras } from "@/hooks/useUnidadesCras";
import { cidadaoService } from "@/services/sistema/cidadaoService";
import { agendamentoService } from "@/services/sistema/agendamentoService";
import { useCodigoAreas, useCriarEncaminhamento, useEncaminhamentos } from "@/hooks/prontuario/useEncaminhamentosProntuario";
import { prontuarioService } from "@/services/prontuario/prontuarioService";
import { pessoaReferenciaService } from "@/services/prontuario/pessoaReferenciaService";
import type { AgendamentoResponse, PaginatedResponse } from "@/types/api";
import { useAuth } from "@/contexts/AuthContext";
// -------------------------------------------------------
// FORM TYPE
// -------------------------------------------------------
interface EncaminhamentoForm {
  codigoArea: string;
  unidadeDestino: string;
  unidadeOrigemId: string;
  profissionalDestino: string;
  objetivoMotivo: string;
  resumoAcompanhamento: string;
  observacoes: string;
  dataRegistro: string;
  orgaoUnidadeDestino: string;
  unidadeOrigem: string;
  telefoneContatoOrigem: string;
  profissionalRegistro: string;
}

const OBJETIVO_MOTIVO_MAX = 500;
const RESUMO_ACOMPANHAMENTO_MAX = 500;
const OBSERVACOES_MAX = 400;
const UNIDADE_DESTINO_MAX = 80;
const PROFISSIONAL_DESTINO_MAX = 80;

type EncaminhamentoPrintData = {
  codigoAreaLabel: string;
  dataRegistro: string;
  cpf: string;
  prontuarioNumero: string;
  pessoaReferencia: string;
  unidadeOrigem: string;
  telefoneOrigem: string;
  unidadeDestino: string;
  profissionalDestino: string;
  motivo: string;
  resumo: string;
  orientacoes: string;
  profissionalRegistro: string;
};

// -------------------------------------------------------
// COMPONENTE PRINCIPAL
// -------------------------------------------------------
export default function AdminEncaminhamentoProntuario() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cpfParam = (searchParams.get("cpf") || "").trim();
  const agendamentoId = searchParams.get("agendamento") || "";
  const [cpf, setCpf] = useState(cpfParam);
  const [activeTab, setActiveTab] = useState("origem");

  const [prontuario, setProntuario] = useState<Prontuario | null>(null);
  const [prontuarioNumeroPrint, setProntuarioNumeroPrint] = useState("");
  const [pessoaReferenciaPrint, setPessoaReferenciaPrint] = useState("");

  const { user } = useAuth();
  const nomeUsuarioLogado = ((user as unknown as { nome_completo?: string } | null)?.nome_completo || user?.nome || "").trim();
  const { unidades, fetchUnidades } = useUnidadesCras("");
  const { data: codigoAreas = [] } = useCodigoAreas();
  const { data: encaminhamentos = [] } = useEncaminhamentos(agendamentoId ? { agendamento: agendamentoId } : undefined, Boolean(agendamentoId));
  const criarEncaminhamento = useCriarEncaminhamento();

  // -------------------------------------------------------
  // FORM STATE
  // -------------------------------------------------------
  const [form, setForm] = useState<EncaminhamentoForm>({
    codigoArea: "",
    unidadeDestino: "",
    unidadeOrigemId: "",
    profissionalDestino: "",
    objetivoMotivo: "",
    resumoAcompanhamento: "",
    observacoes: "",
    dataRegistro: new Date().toISOString().split("T")[0],
    orgaoUnidadeDestino: "",
    unidadeOrigem: "",
    telefoneContatoOrigem: "",
    profissionalRegistro: nomeUsuarioLogado,
  });
  const encaminhamentoExistente = useMemo(() => {
    if (!encaminhamentos.length) return null;
    return [...encaminhamentos].sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    })[0];
  }, [encaminhamentos]);
  const modoLeitura = Boolean(agendamentoId && encaminhamentoExistente);

  // -------------------------------------------------------
  // LOAD PRONTUÁRIO
  // -------------------------------------------------------
  useEffect(() => {
    let active = true;

    const resolveCpf = async () => {
      if (cpfParam) {
        setCpf(cpfParam);
        return;
      }

      if (!agendamentoId) {
        setCpf("");
        return;
      }

      try {
        const { data } = await agendamentoService.obter(agendamentoId);
        const cpfFromAgendamento = data?.result?.cidadao?.cpf?.trim() || "";

        if (active) {
          setCpf(cpfFromAgendamento);
        }
      } catch {
        if (active) {
          setCpf("");
          toast.error("Não foi possível identificar o cidadão pelo agendamento.");
        }
      }
    };

    resolveCpf();

    return () => {
      active = false;
    };
  }, [cpfParam, agendamentoId]);

  useEffect(() => {
    if (!cpf) return;

    const p = prontuarioStore.getProntuarioByCpf(cpf);
    if (p) {
      setProntuario(p);
      setProntuarioNumeroPrint(p.numero || "");
      setPessoaReferenciaPrint(p.membros.find((m) => m.id === p.pessoaReferenciaId)?.nome || "");
    }
  }, [cpf]);

  useEffect(() => {
    if (!nomeUsuarioLogado) return;
    setForm((prev) =>
      prev.profissionalRegistro
        ? prev
        : {
            ...prev,
            profissionalRegistro: nomeUsuarioLogado,
          },
    );
  }, [nomeUsuarioLogado]);

  useEffect(() => {
    let active = true;
    if (!cpf) return;

    const asRecord = (value: unknown): Record<string, unknown> =>
      value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    const asString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
    const parseApiList = (payload: unknown): Array<Record<string, unknown>> => {
      if (Array.isArray(payload)) return payload.map((item) => asRecord(item));
      const record = asRecord(payload);
      if (Array.isArray(record.results)) return record.results.map((item) => asRecord(item));
      if (Array.isArray(record.result)) return record.result.map((item) => asRecord(item));
      if (record.result && typeof record.result === "object") return [asRecord(record.result)];
      return [];
    };

    const carregarResumoProntuario = async () => {
      try {
        const busca = await prontuarioService.listar({ search: cpf, limit: 1, offset: 0 });
        const prontuarioItem = parseApiList(busca.data)[0] || {};
        const prontuarioId = asString(prontuarioItem.id) || asString(prontuarioItem.prontuario_id);
        const numero = asString(prontuarioItem.numero);

        if (active && numero) {
          setProntuarioNumeroPrint(numero);
        }
        if (!prontuarioId) return;

        const pessoaRefRes = await pessoaReferenciaService.listar({ prontuario: prontuarioId });
        const pessoaRefItem = parseApiList(pessoaRefRes.data)[0] || {};
        const pessoaRefObj = asRecord(pessoaRefItem.pessoa_referencia);
        const pessoaRefId = asString(pessoaRefObj.id) || asString(pessoaRefItem.pessoa_referencia);
        let pessoaRefNome = asString(pessoaRefObj.nome) || asString(pessoaRefObj.nome_completo);

        if (!pessoaRefNome && pessoaRefId) {
          const cidadaoRes = await cidadaoService.obter(pessoaRefId);
          const cidadaoRoot = asRecord(cidadaoRes.data);
          const cidadaoObj = Object.keys(asRecord(cidadaoRoot.result)).length > 0 ? asRecord(cidadaoRoot.result) : cidadaoRoot;
          pessoaRefNome = asString(cidadaoObj.nome) || asString(cidadaoObj.nome_completo);
        }

        if (active) {
          setPessoaReferenciaPrint(pessoaRefNome);
        }
      } catch {
        // sem bloqueio: impressão segue com campos em branco quando não houver dados
      }
    };

    carregarResumoProntuario();
    return () => {
      active = false;
    };
  }, [cpf]);

  useEffect(() => {
    fetchUnidades();
  }, [fetchUnidades]);

  useEffect(() => {
    const loadUnidadeOrigemCidadao = async () => {
      if (!cpf) return;

      try {
        const { data } = await cidadaoService.listar({ cpf });
        const cidadao = data?.results?.[0] as { unidade_origem?: string | { id?: string; nome?: string } | null } | undefined;
        const unidadeOrigemRaw = cidadao?.unidade_origem;

        if (!unidadeOrigemRaw) {
          if (!user?.unidade_ativa?.id) {
            return;
          }

          setForm((prev) => ({
            ...prev,
            unidadeOrigemId: String(user.unidade_ativa?.id || ""),
            unidadeOrigem: user.unidade_ativa?.nome || prev.unidadeOrigem,
          }));
          return;
        }

        const unidadeOrigemId = typeof unidadeOrigemRaw === "string" ? unidadeOrigemRaw : String(unidadeOrigemRaw.id || "");
        const unidadeOrigemNome = typeof unidadeOrigemRaw === "string" ? "" : unidadeOrigemRaw.nome || "";

        if (!unidadeOrigemId) return;

        setForm((prev) => ({
          ...prev,
          unidadeOrigemId,
          unidadeOrigem: unidadeOrigemNome || prev.unidadeOrigem,
        }));
      } catch {
        toast.error("Não foi possível carregar a unidade de origem do cidadão.");
      }
    };

    loadUnidadeOrigemCidadao();
  }, [cpf, user?.unidade_ativa?.id, user?.unidade_ativa?.nome]);

  useEffect(() => {
    if (!form.unidadeOrigemId || !unidades.length) return;

    const unidadeOrigem = unidades.find((item) => item.id === form.unidadeOrigemId);
    if (!unidadeOrigem) return;

    setForm((prev) => ({
      ...prev,
      unidadeOrigem: unidadeOrigem.nome || prev.unidadeOrigem,
      telefoneContatoOrigem: unidadeOrigem.telefone || "",
    }));
  }, [form.unidadeOrigemId, unidades]);

  useEffect(() => {
    if (!encaminhamentoExistente) return;

    const codigoArea =
      typeof encaminhamentoExistente.codigo_area === "object" && encaminhamentoExistente.codigo_area
        ? encaminhamentoExistente.codigo_area.id
        : typeof encaminhamentoExistente.codigo_area === "string"
          ? encaminhamentoExistente.codigo_area
          : "";
    const unidadeOrigemId =
      typeof encaminhamentoExistente.unidade_origem === "object" && encaminhamentoExistente.unidade_origem
        ? encaminhamentoExistente.unidade_origem.id
        : typeof encaminhamentoExistente.unidade_origem === "string"
          ? encaminhamentoExistente.unidade_origem
          : "";
    const unidadeOrigem =
      typeof encaminhamentoExistente.unidade_origem === "object" && encaminhamentoExistente.unidade_origem
        ? encaminhamentoExistente.unidade_origem.nome
        : "";
    const unidadeDestino =
      typeof encaminhamentoExistente.unidade_destino === "object" && encaminhamentoExistente.unidade_destino
        ? encaminhamentoExistente.unidade_destino.nome
        : typeof encaminhamentoExistente.unidade_destino === "string"
          ? encaminhamentoExistente.unidade_destino
          : "";

    setForm((prev) => ({
      ...prev,
      codigoArea: codigoArea || prev.codigoArea,
      unidadeDestino: unidadeDestino || prev.unidadeDestino,
      unidadeOrigemId: unidadeOrigemId || prev.unidadeOrigemId,
      unidadeOrigem: unidadeOrigem || prev.unidadeOrigem,
      profissionalDestino: encaminhamentoExistente.profissional || "",
      objetivoMotivo: encaminhamentoExistente.motivo || "",
      resumoAcompanhamento: encaminhamentoExistente.resumo || "",
      observacoes: encaminhamentoExistente.orientacoes || "",
      dataRegistro: encaminhamentoExistente.created_at ? new Date(encaminhamentoExistente.created_at).toISOString().split("T")[0] : prev.dataRegistro,
    }));
    setActiveTab("confirmacao");
  }, [encaminhamentoExistente]);

  // -------------------------------------------------------
  // HANDLE CHANGE
  // -------------------------------------------------------
  const handleChange = (field: keyof EncaminhamentoForm, value: string) => {
    if (modoLeitura) return;
    const nextValue =
      field === "unidadeDestino"
        ? value.slice(0, UNIDADE_DESTINO_MAX)
        : field === "profissionalDestino"
          ? value.slice(0, PROFISSIONAL_DESTINO_MAX)
          : field === "objetivoMotivo"
            ? value.slice(0, OBJETIVO_MOTIVO_MAX)
            : field === "resumoAcompanhamento"
              ? value.slice(0, RESUMO_ACOMPANHAMENTO_MAX)
              : field === "observacoes"
                ? value.slice(0, OBSERVACOES_MAX)
                : value;
    setForm((prev) => ({
      ...prev,
      [field]: nextValue,
    }));
  };

  // -------------------------------------------------------
  // SALVAR + REDIRECIONAR PARA GUIA
  // -------------------------------------------------------
  const buscarAgendamentoMaisAtualPorCpf = async (): Promise<string> => {
    if (!cpf) return "";

    const { data } = await agendamentoService.listar({ cpf });
    if (!data?.success) return "";

    const payload = data.result as AgendamentoResponse[] | PaginatedResponse<AgendamentoResponse> | undefined;
    const lista = Array.isArray(payload) ? payload : (payload?.results ?? []);
    if (!lista.length) return "";

    const listaFiltrada = lista.filter((item) => !["CANCELADO_CIDADAO", "CANCELADO_CRAS"].includes(item.situacao));
    const candidatos = listaFiltrada.length ? listaFiltrada : lista;

    candidatos.sort((a, b) => {
      const da = new Date(`${a.data}T${a.horario}`).getTime();
      const db = new Date(`${b.data}T${b.horario}`).getTime();
      return db - da;
    });

    return candidatos[0]?.id || "";
  };

  const handleSalvar = async () => {
    if (modoLeitura) {
      toast.info("Este encaminhamento já foi registrado e está em modo leitura.");
      return;
    }

    if (!cpf) {
      toast.error("CPF não informado.");
      return;
    }

    if (!form.codigoArea || !form.unidadeDestino || !form.objetivoMotivo) {
      toast.error("Preencha código da área, unidade de destino e motivo do encaminhamento.");
      return;
    }
    if (!form.unidadeOrigemId) {
      toast.error("Unidade de origem não identificada.");
      return;
    }

    const agendamentoSelecionado = agendamentoId || (await buscarAgendamentoMaisAtualPorCpf());
    if (!agendamentoSelecionado) {
      toast.error("Nenhum agendamento encontrado para o cidadão.");
      return;
    }

    try {
      const payload = {
        codigo_area: form.codigoArea,
        unidade_origem: form.unidadeOrigemId,
        unidade_destino: form.unidadeDestino,
        agendamento: agendamentoSelecionado,
        motivo: form.objetivoMotivo,
        resumo: form.resumoAcompanhamento || null,
        profissional: form.profissionalDestino || null,
        orientacoes: form.observacoes || null,
      };
      await criarEncaminhamento.mutateAsync(payload);

      toast.success("Encaminhamento registrado!");
      handleImprimir();
      setTimeout(() => {
        navigate(`/sistema/agendamentos`);
      }, 300);
    } catch (error: unknown) {
      const err = error as {
        response?: {
          data?: {
            detail?: string;
            mensagem?: string;
            result?: { agendamento?: string[] };
          };
        };
        message?: string;
      };
      const message =
        err.response?.data?.detail ||
        err.response?.data?.mensagem ||
        err.response?.data?.result?.agendamento?.[0] ||
        err.message ||
        "Não foi possível registrar o encaminhamento.";
      toast.error(message);
    }
  };

  const codigoAreaLabel = useMemo(() => {
    const item = codigoAreas.find((codigo) => codigo.id === form.codigoArea);
    if (!item) return "-";
    return `${String(item.codigo).padStart(2, "0")} - ${item.nome}`;
  }, [codigoAreas, form.codigoArea]);

  const codigoAreasOrdenados = useMemo(() => [...codigoAreas].sort((a, b) => Number(a.codigo) - Number(b.codigo)), [codigoAreas]);

  const escapeHtml = (value: string) =>
    value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const logoPrefeituraSrc = encodeURI(`${import.meta.env.BASE_URL}logo-sdhds-cor.png`);

  const buildPrintHtml = (data: EncaminhamentoPrintData) => {
    const formatCpf = (value: string) => {
      const digits = value.replace(/\D/g, "");
      if (digits.length !== 11) return value;
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
    };
    const formatDateBr = (value: string) => {
      const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!isoDate) return value;
      return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
    };
    const cpfFormatado = formatCpf(data.cpf);
    const dataRegistroFormatada = formatDateBr(data.dataRegistro);
    const normalizeInlineValue = (value: string) => value.replace(/\s+/g, " ").trim();
    const normalizeBlockValue = (value: string) =>
      value
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n[ \t]+/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .split("\n\n")
        .map((paragraph) =>
          paragraph
            .replace(/\n+/g, " ")
            .replace(/[ \t]+/g, " ")
            .trim(),
        )
        .filter(Boolean)
        .join("\n\n");
    const displayInlineValue = (value: string) => escapeHtml(normalizeInlineValue(value) || "-");
    const displayBlockValue = (value: string) => escapeHtml(normalizeBlockValue(value) || "-");
    const row = (label: string, value: string) =>
      `<tr><td class="field-label">${escapeHtml(label)}</td><td class="field-value">${displayInlineValue(value)}</td></tr>`;
    const detailTable = (rows: string) =>
      `<table class="detail-table"><colgroup><col class="label-col" /><col class="value-col" /></colgroup>${rows}</table>`;
    const textBlock = (label: string, value: string) =>
      `<div class="text-block"><div class="text-block-label">${escapeHtml(label)}</div><div class="text-block-value">${displayBlockValue(value)}</div></div>`;
    const metaCard = (label: string, value: string) =>
      `<td class="meta-cell"><div class="meta-card"><div class="meta-label">${escapeHtml(label)}</div><div class="meta-value">${displayInlineValue(value)}</div></div></td>`;

    return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Encaminhamento - ${escapeHtml(data.cpf || "sem-cpf")}</title>
    <style>
      @page { size: A4; margin: 8mm; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        background-color: #ffffff;
        font-family: "Segoe UI", Arial, sans-serif;
        color: #111827;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page {
        width: 194mm;
        max-width: 100%;
        margin: 0 auto;
        padding: 0;
      }
      .sheet {
        width: 100%;
        max-width: none;
        margin: 0;
        background: #ffffff;
        min-height: 279mm;
        display: flex;
        flex-direction: column;
      }
      .brand {
        background-color: #ffffff;
        padding: 3mm 0 3.5mm;
        text-align: center;
        border-bottom: 4px solid #ff8558;
      }
      .brand img {
        width: 70mm;
        max-width: 100%;
        height: auto;
      }
      .content {
        padding: 3.2mm 0 1mm;
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      .title {
        margin: 0 0 1.5mm;
        font-size: 18pt;
        color: #1f2937;
        font-weight: 700;
      }
      .accent {
        width: 14mm;
        height: 1mm;
        background-color: #ff8558;
        margin-bottom: 3mm;
      }
      .meta-table {
        width: 100%;
        margin: 0 0 3mm;
        border-collapse: separate;
        border-spacing: 2.5mm 0;
        table-layout: fixed;
        break-inside: avoid;
      }
      .meta-cell {
        width: 33.33%;
        padding: 0;
        vertical-align: top;
      }
      .meta-card {
        background-color: #fff4ea;
        border: 1px solid #ffd8c5;
        border-radius: 8px;
        padding: 2.2mm 2.8mm;
        min-height: 16mm;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
      }
      .meta-label {
        margin-bottom: 1.2mm;
        color: #9a3412;
        font-size: 7.5pt;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 700;
        text-align: center;
      }
      .meta-value {
        color: #111827;
        font-size: 11pt;
        font-weight: 700;
        line-height: 1.22;
        white-space: pre-wrap;
        word-break: break-word;
        overflow-wrap: anywhere;
        text-align: center;
        width: 100%;
      }
      .section {
        background-color: #fff9f4;
        border-left: 1.2mm solid #ff8558;
        border-radius: 4px;
        padding: 3mm 3.6mm;
        margin-bottom: 2mm;
        border: 1px solid #f3d8ca;
        break-inside: auto;
      }
      .section-title {
        margin: 0 0 2.2mm;
        color: #374151;
        font-size: 10.5pt;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .detail-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      .label-col { width: 29%; }
      .value-col { width: 71%; }
      .detail-table td { padding: 0 0 1.5mm; }
      .detail-table tr:last-child td { padding-bottom: 0; }
      .detail-table tr:not(:last-child) td { border-bottom: 1px solid #f3dfd2; }
      .detail-table tr:not(:first-child) td { padding-top: 1.5mm; }
      .field-label {
        padding-right: 2mm;
        color: #6b7280;
        font-size: 7.8pt;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 700;
        vertical-align: top;
      }
      .field-value {
        padding-left: 4.5mm;
        color: #111827;
        font-size: 10pt;
        font-weight: 600;
        white-space: normal;
        word-break: break-word;
        overflow-wrap: anywhere;
        line-height: 1.26;
      }
      .text-block {
        margin-top: 2mm;
        break-inside: avoid;
      }
      .text-block-label {
        margin-bottom: 0.8mm;
        color: #6b7280;
        font-size: 7.8pt;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 700;
      }
      .text-block-value {
        color: #111827;
        font-size: 9.2pt;
        line-height: 1.22;
        white-space: pre-line;
        word-break: break-word;
        overflow-wrap: anywhere;
        background-color: #ffffff;
        border: 1px solid #f3dfd2;
        border-radius: 8px;
        padding: 1.9mm 2.5mm;
        min-height: 8.2mm;
      }
      .footer {
        margin-top: auto;
        padding-top: 1.4mm;
        text-align: center;
        border-top: 1px solid #e5e7eb;
      }
      .footer-note {
        margin: 0 0 0.6mm;
        color: #9ca3af;
        font-size: 6.4pt;
        line-height: 1.15;
      }
      .footer-copy {
        margin: 0;
        color: #92400e;
        font-size: 6.4pt;
        line-height: 1.15;
        opacity: 0.9;
      }
      @media print {
        body { background-color: #ffffff; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="sheet">
        <div class="brand">
          <img src="${logoPrefeituraSrc}" alt="Prefeitura de Fortaleza" />
        </div>

        <div class="content">
          <h1 class="title">Guia de Encaminhamento</h1>
          <div class="accent"></div>
          <table class="meta-table">
            <tr>
              ${metaCard("Data do registro", dataRegistroFormatada)}
              ${metaCard("CPF do cidadão", cpfFormatado)}
              ${metaCard("Prontuário", data.prontuarioNumero)}
            </tr>
          </table>

          <div class="section">
            <h2 class="section-title">Identificação</h2>
            ${detailTable(`
              ${row("Pessoa de referência", data.pessoaReferencia)}
              ${row("Responsável pelo registro", data.profissionalRegistro)}
              ${row("Código da área", data.codigoAreaLabel)}
            `)}
          </div>

          <div class="section">
            <h2 class="section-title">Encaminhamento</h2>
            ${detailTable(`
              ${row("Unidade de origem", data.unidadeOrigem)}
              ${row("Telefone da unidade de origem", data.telefoneOrigem)}
              ${row("Unidade de destino", data.unidadeDestino)}
              ${row("Profissional de referência", data.profissionalDestino)}
            `)}
            ${textBlock("Motivo", data.motivo)}
            ${textBlock("Resumo do acompanhamento", data.resumo)}
            ${textBlock("Orientações para a unidade de destino", data.orientacoes)}
          </div>

          <div class="footer">
            <p class="footer-note">Documento emitido automaticamente pelo sistema de agendamento do CRAS.</p>
            <p class="footer-copy">Emitido em ${escapeHtml(new Date().toLocaleString("pt-BR"))} | Prefeitura Municipal de Fortaleza</p>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
  };

  const handleImprimir = () => {
    const pessoaReferenciaStore = prontuario?.membros.find((m) => m.id === prontuario.pessoaReferenciaId)?.nome || "";
    const pessoaReferencia = pessoaReferenciaPrint || pessoaReferenciaStore || "";
    const prontuarioNumero = prontuarioNumeroPrint || prontuario?.numero || "";

    const data: EncaminhamentoPrintData = {
      codigoAreaLabel,
      dataRegistro: form.dataRegistro || "",
      cpf: cpf || "",
      prontuarioNumero,
      pessoaReferencia,
      unidadeOrigem: form.unidadeOrigem || "",
      telefoneOrigem: form.telefoneContatoOrigem || "",
      unidadeDestino: form.unidadeDestino || "",
      profissionalDestino: form.profissionalDestino || "",
      motivo: form.objetivoMotivo || "",
      resumo: form.resumoAcompanhamento || "",
      orientacoes: form.observacoes || "",
      profissionalRegistro: nomeUsuarioLogado || "",
    };

    const html = buildPrintHtml(data);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    iframe.srcdoc = html;

    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (win) {
        win.focus();
        win.print();
      } else {
        toast.error("Não foi possível iniciar a impressão.");
      }
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    };

    document.body.appendChild(iframe);
  };

  // =======================================================
  // TELA
  // =======================================================
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />

        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-white flex items-center justify-between px-6 sticky top-0 z-10 ">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="h-6 w-[1px] bg-slate-200 mx-2" />
              <div>
                <h1 className="text-lg font-bold text-slate-800">Guia de Encaminhamento</h1>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={() => navigate(agendamentoId ? "/sistema/agendamentos" : `/sistema/prontuario?cpf=${cpf}`)}
              className="gap-2 text-slate-600 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </header>

          <main className="flex-1 p-8">
            <div className="max-w-5xl mx-auto space-y-8">
              {/* HEADER DE IDENTIFICAÇÃO DO PRONTUÁRIO */}
              {/* {prontuario && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-indigo-600 text-white border-none">
                    <CardContent className="pt-6 flex items-center gap-4">
                      <div className="p-3 bg-white/20 rounded-xl">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-indigo-100 uppercase font-bold tracking-wider">Prontuário</p>
                        <p className="text-xl font-black">{prontuario.numero}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2 shadow-sm border-slate-200">
                    <CardContent className="pt-6 flex items-center gap-4">
                      <div className="p-3 bg-slate-100 rounded-xl">
                        <UserCircle className="w-6 h-6 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Pessoa de Referência</p>
                        <p className="text-lg font-semibold text-slate-800 uppercase">
                          {prontuario.membros.find((m) => m.id === prontuario.pessoaReferenciaId)?.nome || "Não Identificado"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )} */}

              {/* FORMULÁRIO COM STEPPER TABS */}
              <Card className="border-none overflow-hidden ring-1 ring-slate-200">
                <CardHeader className="bg-white border-b pb-0 px-0">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="flex h-16 w-full items-stretch bg-transparent p-0 border-b rounded-none">
                      <TabsTrigger
                        value="origem"
                        className="flex-1 gap-3 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-indigo-50/30 rounded-none transition-all"
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${activeTab === "origem" ? "bg-primary text-white" : "bg-slate-200 text-slate-500"}`}
                        >
                          1
                        </div>
                        <span className="font-semibold uppercase tracking-tight text-xs">Origem e Motivo</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="detalhes"
                        className="flex-1 gap-3 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-indigo-50/30 rounded-none transition-all"
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${activeTab === "detalhes" ? "bg-primary text-white" : "bg-slate-200 text-slate-500"}`}
                        >
                          2
                        </div>
                        <span className="font-semibold uppercase tracking-tight text-xs">Destino e Referência</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="confirmacao"
                        className="flex-1 gap-3 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-indigo-50/30 rounded-none transition-all"
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${activeTab === "confirmacao" ? "bg-primary text-white" : "bg-slate-200 text-slate-500"}`}
                        >
                          3
                        </div>
                        <span className="font-semibold uppercase tracking-tight text-xs">Revisão Final</span>
                      </TabsTrigger>
                    </TabsList>

                    <div className="p-8">
                      {/* === ETAPA 1: ORIGEM === */}
                      <TabsContent value="origem" className="mt-0 space-y-8 animate-in fade-in slide-in-from-right-2">
                        {modoLeitura && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                            Encaminhamento já registrado para este agendamento. Visualização em modo leitura.
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <Label className="min-h-4 text-slate-700 font-bold flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-primary" /> Código da Área *
                            </Label>
                            <Select value={form.codigoArea} onValueChange={(v) => handleChange("codigoArea", v)} disabled={modoLeitura}>
                              <SelectTrigger className="h-12 border-slate-200  focus:ring-primary">
                                <SelectValue placeholder="Selecione o território/área" />
                              </SelectTrigger>
                              <SelectContent>
                                {codigoAreasOrdenados.map((codigo) => (
                                  <SelectItem key={codigo.id} value={codigo.id}>
                                    {String(codigo.codigo).padStart(2, "0")} - {codigo.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-3">
                            <Label className="min-h-4 text-slate-700 font-bold flex items-center">Data do Registro</Label>
                            <Input
                              type="date"
                              value={form.dataRegistro}
                              readOnly
                              className="h-12 bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-slate-700 font-bold">Objetivo / Motivo do Encaminhamento *</Label>
                          <Textarea
                            value={form.objetivoMotivo}
                            onChange={(e) => handleChange("objetivoMotivo", e.target.value)}
                            readOnly={modoLeitura}
                            rows={4}
                            maxLength={OBJETIVO_MOTIVO_MAX}
                            placeholder="Descreva detalhadamente a demanda que motiva o encaminhamento..."
                            className="border-slate-200  resize-none focus:ring-indigo-500"
                          />
                        </div>

                        <div className="space-y-3">
                          <Label className="text-slate-700 font-bold">Resumo do Acompanhamento</Label>
                          <Textarea
                            value={form.resumoAcompanhamento}
                            onChange={(e) => handleChange("resumoAcompanhamento", e.target.value)}
                            readOnly={modoLeitura}
                            rows={4}
                            maxLength={RESUMO_ACOMPANHAMENTO_MAX}
                            placeholder="Breve síntese do acompanhamento até este momento..."
                            className="border-slate-200  resize-none"
                          />
                        </div>

                        <div className="flex justify-end pt-4">
                          <Button onClick={() => setActiveTab("detalhes")} className="bg-primary px-8">
                            Próxima Etapa
                          </Button>
                        </div>
                      </TabsContent>

                      {/* === ETAPA 2: DETALHES === */}
                      <TabsContent value="detalhes" className="mt-0 space-y-8 animate-in fade-in slide-in-from-right-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <Label className="text-slate-700 font-bold flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-primary" /> Unidade de Destino *
                            </Label>
                            <Input
                              value={form.unidadeDestino}
                              onChange={(e) => handleChange("unidadeDestino", e.target.value)}
                              readOnly={modoLeitura}
                              maxLength={UNIDADE_DESTINO_MAX}
                              placeholder="CRAS, CREAS, Posto de Saúde, etc."
                              className="h-12 border-slate-200 "
                            />
                          </div>

                          <div className="space-y-3">
                            <Label className="text-slate-700 font-bold flex items-center gap-2">
                              <UserCircle className="w-4 h-4 text-primary" /> Profissional de Referência (Destino)
                            </Label>
                            <Input
                              value={form.profissionalDestino}
                              onChange={(e) => handleChange("profissionalDestino", e.target.value)}
                              readOnly={modoLeitura}
                              maxLength={PROFISSIONAL_DESTINO_MAX}
                              placeholder="Nome do técnico de destino (se houver)"
                              className="h-12 border-slate-200 "
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-slate-700 font-bold">Orientações para a Unidade de Destino</Label>
                          <Textarea
                            rows={5}
                            value={form.observacoes}
                            onChange={(e) => handleChange("observacoes", e.target.value)}
                            readOnly={modoLeitura}
                            maxLength={OBSERVACOES_MAX}
                            placeholder="Instruções específicas para o atendimento no destino..."
                            className="border-slate-200 resize-none"
                          />
                        </div>

                        <div className="flex justify-between pt-4">
                          <Button variant="ghost" onClick={() => setActiveTab("origem")}>
                            Voltar
                          </Button>
                          <Button onClick={() => setActiveTab("confirmacao")} className="bg-primary px-8">
                            Revisar Dados
                          </Button>
                        </div>
                      </TabsContent>

                      {/* === ETAPA 3: CONFIRMAÇÃO === */}
                      <TabsContent value="confirmacao" className="mt-0 space-y-8 animate-in fade-in slide-in-from-right-2">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                          <ClipboardCheck className="w-5 h-5 text-amber-600 mt-0.5" />
                          <div className="text-sm text-amber-800 leading-relaxed">
                            <strong>{modoLeitura ? "Encaminhamento já registrado:" : "Confirmação de Envio:"}</strong>{" "}
                            {modoLeitura
                              ? "os dados abaixo estão disponíveis somente para consulta e impressão."
                              : 'Revise atentamente os dados abaixo. Ao clicar em "Registrar e Gerar Guia", o encaminhamento será oficialmente anexado ao prontuário e uma cópia para impressão será aberta.'}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-x-6 gap-y-4 bg-slate-50 border border-slate-200 rounded-xl p-6 md:grid-cols-2">
                          <div className="min-w-0 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Território</span>
                            <span className="font-bold text-slate-700 break-words [overflow-wrap:anywhere]">{codigoAreaLabel}</span>
                          </div>
                          <div className="min-w-0 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Destino</span>
                            <span className="font-bold text-primary break-words [overflow-wrap:anywhere]">{form.unidadeDestino || "N/A"}</span>
                          </div>
                          <div className="min-w-0 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unidade de Origem</span>
                            <span className="font-semibold text-slate-600 break-words [overflow-wrap:anywhere]">{form.unidadeOrigem || "N/A"}</span>
                          </div>
                          <div className="min-w-0 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profissional Responsável</span>
                            <span className="font-semibold text-slate-600 break-words [overflow-wrap:anywhere]">{form.profissionalRegistro}</span>
                          </div>
                          <div className="min-w-0 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contato de Origem</span>
                            <span className="min-w-0 font-semibold text-slate-600 flex items-center gap-2 break-words [overflow-wrap:anywhere]">
                              <Phone className="w-3 h-3" /> {form.telefoneContatoOrigem || "N/A"}
                            </span>
                          </div>
                          <div className="min-w-0 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Motivo Principal</span>
                            <span className="text-sm text-slate-600 line-clamp-2 break-words [overflow-wrap:anywhere]">{form.objetivoMotivo}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-6">
                          <Button variant="ghost" onClick={() => setActiveTab("detalhes")}>
                            Voltar para ajustar
                          </Button>
                          <div className="flex gap-3">
                            <Button variant="outline" onClick={handleImprimir} className="gap-2 border-slate-300">
                              <Printer className="h-4 w-4" /> {modoLeitura ? "Reimprimir" : "Pré-visualizar"}
                            </Button>
                            {modoLeitura ? (
                              <Button onClick={() => navigate("/sistema/agendamentos")} className="gap-2 bg-primary px-8">
                                <ArrowLeft className="h-4 w-4" /> Voltar aos Agendamentos
                              </Button>
                            ) : (
                              <Button onClick={handleSalvar} disabled={criarEncaminhamento.isPending} className="gap-2 bg-primary   px-8">
                                <Send className="h-4 w-4" /> {criarEncaminhamento.isPending ? "Registrando..." : "Registrar e Gerar Guia"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </CardHeader>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
