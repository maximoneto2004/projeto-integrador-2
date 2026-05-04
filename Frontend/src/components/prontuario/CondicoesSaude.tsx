import { type WheelEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Stethoscope, HeartPulse, Baby, AlertTriangle, Save, ArrowRight, CheckCircle2, ChevronDown, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "@/lib/sonner";
import * as Accordion from "@radix-ui/react-accordion";
import { getApiErrorMessage } from "@/lib/notifications";
import { sanitizeTextInputValue } from "@/lib/textSanitizer";
import type { Prontuario } from "@/types/prontuario";
import {
  condicaoSaudeService,
  type CondicoesDeSaudeResponse,
  type DescumprimentoCondicionalidadesBolsaResponse,
  type SaudeCuidadosMembroResponse,
} from "@/services/prontuario/condicaoSaudeService";
import { membroComposicaoService, type MembroComposicaoResponse } from "@/services/prontuario/membroComposicaoService";
import {
  useCondicoesDeSaudeProntuario,
  useDescumprimentoCondicionalidadesBolsaProntuario,
  useSaudeCuidadosMembroProntuario,
} from "@/hooks/prontuario/useCondicaoSaudeProntuario";

interface Props {
  prontuario: Prontuario | null;
  onNext: () => void;
  onSave: () => void;
}

type MemberFormData = {
  deficiencia: string;
  acompanhamentoMedico: string;
  necessitaCuidadosConstantes: string;
  cuidadosConstantesResponsavel: string;
  doencasGraves: string;
  remediosTarjaPreta: string;
  usoAlcool: string;
  usoDrogas: string;
  usoDrogasQuais: string;
  tratamentos: string;
  medicacao: string;
  gestanteMeses: string;
  gestantePreNatal: string;
};

interface AnotacaoCondicionalidade {
  id: string;
  membroId: string;
  dataOcorrencia: string;
  condCodigo: string;
}

const initialFormSaude: MemberFormData = {
  deficiencia: "Não",
  acompanhamentoMedico: "Não",
  necessitaCuidadosConstantes: "Não",
  cuidadosConstantesResponsavel: "",
  doencasGraves: "",
  remediosTarjaPreta: "Não",
  usoAlcool: "Não",
  usoDrogas: "Não",
  usoDrogasQuais: "",
  tratamentos: "",
  medicacao: "",
  gestanteMeses: "",
  gestantePreNatal: "Não",
};
const DOENCAS_GRAVES_MAX = 500;
const CUIDADOS_RESPONSAVEL_MAX = 200;
const USO_DROGAS_QUAIS_MAX = 250;
const TRATAMENTOS_MAX = 600;
const MEDICACAO_MAX = 600;
const GESTANTE_MESES_MAX = 2;

const normalizeCpf = (value?: string) => (value || "").replace(/\D/g, "");

const parseApiList = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "result" in payload) {
    const result = (payload as { result?: unknown }).result;
    if (Array.isArray(result)) return result as T[];
  }
  return [];
};

const toSimNaoCode = (value?: string) => {
  const raw = String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (raw === "SIM") return "SIM";
  if (raw === "NAO") return "NAO";
  return "";
};

const fromSimNaoCode = (value?: string) => {
  const raw = String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (raw === "SIM") return "Sim";
  if (raw === "NAO") return "Não";
  return "Não";
};

export function CondicoesSaude({ prontuario, onNext, onSave }: Props) {
  const [searchParams] = useSearchParams();
  const cpfRef = useMemo(() => normalizeCpf(prontuario?.membros.find((m) => m.id === prontuario?.pessoaReferenciaId)?.cpf || ""), [prontuario]);
  const prontuarioId = useMemo(
    () => searchParams.get("prontuarioId") || (cpfRef ? localStorage.getItem(`prontuarioIdByCpf:${cpfRef}`) || "" : ""),
    [searchParams, cpfRef],
  );

  const [activeMembroId, setActiveMembroId] = useState<string>("");
  const [formData, setFormData] = useState<MemberFormData>(initialFormSaude);
  const [membrosApi, setMembrosApi] = useState<SaudeCuidadosMembroResponse[]>([]);
  const [membroIdByCidadaoId, setMembroIdByCidadaoId] = useState<Record<string, string>>({});
  const [cidadaoIdByMembroId, setCidadaoIdByMembroId] = useState<Record<string, string>>({});
  const [condicoesSaudeId, setCondicoesSaudeId] = useState("");
  const [carregandoApi, setCarregandoApi] = useState(false);

  const [insegurancaAlimentar, setInsegurancaAlimentar] = useState("Não");
  const [outrasObs, setOutrasObs] = useState("");

  const [anotacoes, setAnotacoes] = useState<AnotacaoCondicionalidade[]>([]);
  const [membroCond, setMembroCond] = useState("");
  const [membroCondOpen, setMembroCondOpen] = useState(false);
  const [dataCond, setDataCond] = useState("");
  const [codigoCond, setCodigoCond] = useState("");

  const { mutateAsync: salvarMembro, isPending: salvandoMembro } = useSaudeCuidadosMembroProntuario();
  const { mutateAsync: salvarCondicoesSaude, isPending: salvandoCondicoesSaude } = useCondicoesDeSaudeProntuario();
  const { mutateAsync: salvarDescumprimentoCondicionalidade, isPending: salvandoDescumprimento } =
    useDescumprimentoCondicionalidadesBolsaProntuario();
  const [modalConfirmarRegistroAberto, setModalConfirmarRegistroAberto] = useState(false);

  const [paginaAtual, setPaginaAtual] = useState(1);
  const pageSize = 5;
  const totalItens = anotacoes.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / pageSize));
  const membroCondSelecionadoLabel = useMemo(
    () => prontuario?.membros.find((m) => String(m.id) === String(membroCond))?.nome || "",
    [prontuario, membroCond],
  );

  const resolveMembroId = useCallback((id: string) => membroIdByCidadaoId[String(id)] || String(id), [membroIdByCidadaoId]);
  const handleWheelOnCommandList = (event: WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    container.scrollTop += event.deltaY;
    event.preventDefault();
    event.stopPropagation();
  };

  const syncCondicoesSaude = useCallback(
    async (membros: SaudeCuidadosMembroResponse[], descumprimentos: AnotacaoCondicionalidade[], inseguranca: string, observacoes: string) => {
      if (!prontuarioId) return;
      const salvo = await salvarCondicoesSaude({
        id: condicoesSaudeId || undefined,
        payload: {
          prontuario: prontuarioId,
          condicoes_saude_membro: membros.map((m) => String(m.id)),
          descumprimento_condicionalidade: descumprimentos.map((d) => String(d.id)),
          inseguranca_alimentar: toSimNaoCode(inseguranca) || undefined,
          observacoes: observacoes || undefined,
        },
      });
      if (salvo?.id) setCondicoesSaudeId(String(salvo.id));
    },
    [condicoesSaudeId, prontuarioId, salvarCondicoesSaude],
  );

  useEffect(() => {
    if (!prontuarioId) return;
    const load = async () => {
      setCarregandoApi(true);
      try {
        const [membrosRes, condRes, composicaoRes, descRes] = await Promise.all([
          condicaoSaudeService.listarMembro({ prontuario: prontuarioId }),
          condicaoSaudeService.listar({ prontuario: prontuarioId }),
          membroComposicaoService.listar({ prontuario: prontuarioId }),
          condicaoSaudeService.listarDescumprimentoCondicionalidadesBolsa({ prontuario: prontuarioId }),
        ]);

        const composicaoLista = parseApiList<MembroComposicaoResponse>(composicaoRes.data).filter(
          (item) => String(item.prontuario) === String(prontuarioId),
        );
        const byCidadao: Record<string, string> = {};
        const byMembro: Record<string, string> = {};
        composicaoLista.forEach((item) => {
          const membroId = String(item.id || "");
          const cidadaoId = typeof item.cidadao === "object" ? String(item.cidadao?.id || "") : String(item.cidadao || "");
          if (membroId && cidadaoId) {
            byCidadao[cidadaoId] = membroId;
            byMembro[membroId] = cidadaoId;
          }
        });
        setMembroIdByCidadaoId(byCidadao);
        setCidadaoIdByMembroId(byMembro);

        const membrosLista = parseApiList<SaudeCuidadosMembroResponse>(membrosRes.data).filter(
          (item) => String(item.prontuario) === String(prontuarioId),
        );
        setMembrosApi(membrosLista);

        const condLista = parseApiList<CondicoesDeSaudeResponse>(condRes.data).filter((item) => String(item.prontuario) === String(prontuarioId));
        const cond = condLista.length ? condLista[condLista.length - 1] : null;
        if (cond) {
          setCondicoesSaudeId(String(cond.id || ""));
          setInsegurancaAlimentar(fromSimNaoCode(cond.inseguranca_alimentar));
          setOutrasObs(String(cond.observacoes || ""));
        }

        const descLista = parseApiList<DescumprimentoCondicionalidadesBolsaResponse>(descRes.data)
          .filter((item) => String(item.prontuario) === String(prontuarioId))
          .map((item) => ({
            id: String(item.id),
            membroId: String(item.membro),
            dataOcorrencia: String(item.data_ocorrencia || "").slice(0, 7),
            condCodigo: String(item.efeito_codigo || ""),
          }));
        setAnotacoes(descLista);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Não foi possível carregar as condições de saúde."));
      } finally {
        setCarregandoApi(false);
      }
    };
    load();
  }, [prontuarioId]);

  useEffect(() => {
    if (!activeMembroId) return;
    const membroComposicaoId = resolveMembroId(activeMembroId);
    const registro = membrosApi.find((r) => String(r.membro) === String(membroComposicaoId));
    if (!registro) {
      setFormData(initialFormSaude);
      return;
    }
    setFormData({
      deficiencia: fromSimNaoCode(registro.deficiencia),
      acompanhamentoMedico: fromSimNaoCode(registro.acompanhamento),
      necessitaCuidadosConstantes: fromSimNaoCode(registro.cuidados_terceiros),
      cuidadosConstantesResponsavel: String(registro.realiza_cuidados || ""),
      doencasGraves: String(registro.doencas_graves || ""),
      remediosTarjaPreta: fromSimNaoCode(registro.remedio),
      usoAlcool: fromSimNaoCode(registro.alcool),
      usoDrogas: fromSimNaoCode(registro.drogas),
      usoDrogasQuais: String(registro.substancia || ""),
      tratamentos: String(registro.tratamentos || ""),
      medicacao: String(registro.medicamentos || ""),
      gestanteMeses: registro.meses_gestante === null || registro.meses_gestante === undefined ? "" : String(registro.meses_gestante),
      gestantePreNatal: fromSimNaoCode(registro.gestante),
    });
  }, [activeMembroId, membrosApi, resolveMembroId]);

  const excludeEmoji = sanitizeTextInputValue;

  const updateField = (field: keyof MemberFormData, value: string) => {
    const clean = excludeEmoji(value);
    let nextValue = clean;

    switch (field) {
      case "doencasGraves":
        nextValue = clean.slice(0, DOENCAS_GRAVES_MAX);
        break;
      case "cuidadosConstantesResponsavel":
        nextValue = clean.slice(0, CUIDADOS_RESPONSAVEL_MAX);
        break;
      case "usoDrogasQuais":
        nextValue = clean.slice(0, USO_DROGAS_QUAIS_MAX);
        break;
      case "tratamentos":
        nextValue = clean.slice(0, TRATAMENTOS_MAX);
        break;
      case "medicacao":
        nextValue = clean.slice(0, MEDICACAO_MAX);
        break;
      case "gestanteMeses":
        nextValue = value.replace(/\D/g, "").slice(0, GESTANTE_MESES_MAX);
        break;
      default:
        nextValue = clean;
    }

    setFormData((prev) => ({ ...prev, [field]: nextValue }));
  };

  const handleSaveMembro = async () => {
    if (!prontuarioId || !activeMembroId) return;
    try {
      const membroComposicaoId = resolveMembroId(activeMembroId);
      const existing = membrosApi.find((r) => String(r.membro) === String(membroComposicaoId));
      const mesesGestanteNum =
        formData.gestanteMeses.trim() === ""
          ? undefined
          : Number.isFinite(Number(formData.gestanteMeses))
            ? Number(formData.gestanteMeses)
            : undefined;

      const salvo = await salvarMembro({
        id: existing?.id ? String(existing.id) : undefined,
        payload: {
          prontuario: prontuarioId,
          membro: membroComposicaoId,
          deficiencia: toSimNaoCode(formData.deficiencia) || undefined,
          acompanhamento: toSimNaoCode(formData.acompanhamentoMedico) || undefined,
          doencas_graves: formData.doencasGraves || undefined,
          cuidados_terceiros: toSimNaoCode(formData.necessitaCuidadosConstantes) || undefined,
          realiza_cuidados: formData.cuidadosConstantesResponsavel || undefined,
          remedio: toSimNaoCode(formData.remediosTarjaPreta) || undefined,
          alcool: toSimNaoCode(formData.usoAlcool) || undefined,
          drogas: toSimNaoCode(formData.usoDrogas) || undefined,
          substancia: formData.usoDrogasQuais || undefined,
          tratamentos: formData.tratamentos || undefined,
          medicamentos: formData.medicacao || undefined,
          gestante: toSimNaoCode(formData.gestantePreNatal) || undefined,
          meses_gestante: mesesGestanteNum,
        },
      });

      if (salvo) {
        const atualizados = existing
          ? membrosApi.map((item) => (String(item.id) === String(salvo.id) ? { ...item, ...salvo } : item))
          : [...membrosApi, salvo];
        setMembrosApi(atualizados);
        await syncCondicoesSaude(atualizados, anotacoes, insegurancaAlimentar, outrasObs);
      }
      toast.success("Dados de saúde do membro atualizados!");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar os dados de saúde do membro."));
    }
  };

  const handleAddCondicionalidade = async () => {
    if (!prontuarioId || !membroCond || !dataCond || !codigoCond) {
      toast.error("Preencha o membro, a data e o código da condicionalidade.");
      return;
    }
    try {
      const membroComposicaoId = resolveMembroId(membroCond);
      const salvo = await salvarDescumprimentoCondicionalidade({
        payload: {
          prontuario: prontuarioId,
          membro: membroComposicaoId,
          efeito_codigo: codigoCond,
          data_ocorrencia: `${dataCond}-01`,
        },
      });
      if (!salvo) return;

      const nova: AnotacaoCondicionalidade = {
        id: String(salvo.id),
        membroId: String(salvo.membro),
        dataOcorrencia: dataCond,
        condCodigo: String(salvo.efeito_codigo),
      };
      const atualizadas = [...anotacoes, nova];
      setAnotacoes(atualizadas);
      await syncCondicoesSaude(membrosApi, atualizadas, insegurancaAlimentar, outrasObs);

      setMembroCond("");
      setDataCond("");
      setCodigoCond("");
      toast.success("Descumprimento registrado com sucesso!");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível registrar o descumprimento."));
    }
  };

  const handleAbrirConfirmacaoCondicionalidade = () => {
    if (!prontuarioId || !membroCond || !dataCond || !codigoCond) {
      toast.error("Preencha o membro, a data e o código da condicionalidade.");
      return;
    }
    setModalConfirmarRegistroAberto(true);
  };

  const handleConfirmarRegistroCondicionalidade = async () => {
    setModalConfirmarRegistroAberto(false);
    await handleAddCondicionalidade();
  };

  const handleSalvarGeral = async () => {
    if (!prontuarioId) {
      toast.error("Prontuário não identificado na URL.");
      return false;
    }
    try {
      await syncCondicoesSaude(membrosApi, anotacoes, insegurancaAlimentar, outrasObs);
      toast.success("Condições de saúde salvas.");
      onSave();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar as condições de saúde."));
      return false;
    }
  };

  const handleSubmit = async () => {
    const ok = await handleSalvarGeral();
    if (ok) onNext();
  };

  if (!prontuario) return <div className="text-center p-8 text-muted-foreground">Carregando dados...</div>;

  return (
    <div className="space-y-10 pb-20">
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <HeartPulse className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Saúde e Cuidados por Membro</h3>
        </div>

        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Accordion.Root type="single" collapsible value={activeMembroId} onValueChange={setActiveMembroId} className="w-full">
              {prontuario.membros.map((m, index) => {
                const membroComposicaoId = resolveMembroId(m.id);
                const hasData = membrosApi.some((r) => String(r.membro) === String(membroComposicaoId));
                return (
                  <Accordion.Item key={m.id} value={m.id} className="border-b last:border-0">
                    <Accordion.Header>
                      <Accordion.Trigger className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all group">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${"bg-slate-100 text-slate-500"}`}
                          >
                            {`${index + 1}o`}
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-slate-700 group-data-[state=open]:text-primary transition-colors">{m.nome}</p>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{m.parentesco}</p>
                          </div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400 group-data-[state=open]:rotate-180 transition-transform" />
                      </Accordion.Trigger>
                    </Accordion.Header>

                    <Accordion.Content className="p-6 bg-slate-50/50 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-6 space-y-2">
                          <Label className="text-xs font-bold uppercase text-slate-500">Possui Deficiência?</Label>
                          <Select value={formData.deficiencia} onValueChange={(v) => updateField("deficiencia", v)}>
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sim">Sim</SelectItem>
                              <SelectItem value="Não">Não</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-6 space-y-2">
                          <Label className="text-xs font-bold uppercase text-slate-500">Realiza acompanhamento médico?</Label>
                          <Select value={formData.acompanhamentoMedico} onValueChange={(v) => updateField("acompanhamentoMedico", v)}>
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sim">Sim</SelectItem>
                              <SelectItem value="Não">Não</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-12 space-y-2">
                          <div className="flex justify-between items-center">
                            <Label className="text-xs font-bold uppercase text-slate-500">Doenças graves/crônicas</Label>
                          </div>
                          <Textarea
                            className="bg-white"
                            placeholder="Descreva doenças graves/crônicas (se houver)."
                            value={formData.doencasGraves}
                            maxLength={DOENCAS_GRAVES_MAX}
                            onChange={(e) => updateField("doencasGraves", e.target.value)}
                          />
                        </div>

                        <div className="md:col-span-12 space-y-2">
                          <Label className="text-xs font-bold uppercase text-slate-500">Necessita de cuidados constantes de terceiros?</Label>
                          <Select value={formData.necessitaCuidadosConstantes} onValueChange={(v) => updateField("necessitaCuidadosConstantes", v)}>
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sim">Sim</SelectItem>
                              <SelectItem value="Não">Não</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.necessitaCuidadosConstantes === "Sim" && (
                          <div className="md:col-span-12 space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-500">Quem é o responsável pelos cuidados?</Label>
                            <Textarea
                              className="bg-white"
                              placeholder="Descreva quem realiza os cuidados constantes."
                              value={formData.cuidadosConstantesResponsavel}
                              maxLength={CUIDADOS_RESPONSAVEL_MAX}
                              onChange={(e) => updateField("cuidadosConstantesResponsavel", e.target.value)}
                            />
                          </div>
                        )}

                        <div className="md:col-span-4 space-y-2">
                          <Label className="text-xs font-bold uppercase text-slate-500">Uso de remédios controlados?</Label>
                          <Select value={formData.remediosTarjaPreta} onValueChange={(v) => updateField("remediosTarjaPreta", v)}>
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sim">Sim</SelectItem>
                              <SelectItem value="Não">Não</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-4 space-y-2">
                          <Label className="text-xs font-bold uppercase text-slate-500">Uso abusivo de álcool?</Label>
                          <Select value={formData.usoAlcool} onValueChange={(v) => updateField("usoAlcool", v)}>
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sim">Sim</SelectItem>
                              <SelectItem value="Não">Não</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-4 space-y-2">
                          <Label className="text-xs font-bold uppercase text-slate-500">Uso abusivo de drogas?</Label>
                          <Select value={formData.usoDrogas} onValueChange={(v) => updateField("usoDrogas", v)}>
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sim">Sim</SelectItem>
                              <SelectItem value="Não">Não</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.usoDrogas === "Sim" && (
                          <div className="md:col-span-12 space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-500">Quais substâncias?</Label>
                            <Textarea
                              className="bg-white"
                              placeholder="Descreva quais substâncias são utilizadas."
                              value={formData.usoDrogasQuais}
                              maxLength={USO_DROGAS_QUAIS_MAX}
                              onChange={(e) => updateField("usoDrogasQuais", e.target.value)}
                            />
                          </div>
                        )}

                        <div className="md:col-span-6 space-y-2">
                          <Label className="text-xs font-bold uppercase text-slate-500">Tratamentos Atuais</Label>
                          <Textarea
                            className="bg-white"
                            value={formData.tratamentos}
                            maxLength={TRATAMENTOS_MAX}
                            onChange={(e) => updateField("tratamentos", e.target.value)}
                          />
                        </div>

                        <div className="md:col-span-6 space-y-2">
                          <Label className="text-xs font-bold uppercase text-slate-500">Medicamentos em Uso</Label>
                          <Textarea
                            className="bg-white"
                            value={formData.medicacao}
                            maxLength={MEDICACAO_MAX}
                            onChange={(e) => updateField("medicacao", e.target.value)}
                          />
                        </div>

                        <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                          <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
                              <Baby className="w-3 h-3" />
                              Se Gestante
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                              <Select value={formData.gestantePreNatal} onValueChange={(v) => updateField("gestantePreNatal", v)}>
                                <SelectTrigger className="bg-white">
                                  <SelectValue placeholder="Pré-natal?" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Sim">Sim</SelectItem>
                                  <SelectItem value="Não">Não</SelectItem>
                                </SelectContent>
                              </Select>
                              {formData.gestantePreNatal === "Sim" && (
                                <Input
                                  placeholder="Meses"
                                  value={formData.gestanteMeses}
                                  inputMode="numeric"
                                  maxLength={GESTANTE_MESES_MAX}
                                  onChange={(e) => updateField("gestanteMeses", e.target.value)}
                                  className="bg-white"
                                />
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-12 flex justify-end">
                          <Button
                            size="sm"
                            onClick={handleSaveMembro}
                            className="gap-2"
                            disabled={carregandoApi || salvandoMembro || salvandoCondicoesSaude}
                          >
                            <Save className="w-4 h-4" /> {salvandoMembro ? "Salvando..." : "Atualizar Saúde"}
                          </Button>
                        </div>
                      </div>
                    </Accordion.Content>
                  </Accordion.Item>
                );
              })}
            </Accordion.Root>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1 ">
          <AlertTriangle className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Descumprimento de Condicionalidades (Bolsa Família)</h3>
        </div>

        <Card className="">
          <CardHeader className="bg-amber-100/100 border-b border-amber-100">
            <CardDescription>Registre advertências, bloqueios ou suspensões relacionadas ao acompanhamento de saúde do PBF.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>Membro da Família</Label>
                <Popover open={membroCondOpen} onOpenChange={setMembroCondOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={membroCondOpen} className="w-full justify-between font-normal">
                      <span className="truncate">{membroCondSelecionadoLabel || "Selecione..."}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar membro..." />
                      <CommandList onWheel={handleWheelOnCommandList} className="max-h-[240px] overscroll-contain">
                        <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                        <CommandGroup>
                          {prontuario.membros.map((m) => (
                            <CommandItem
                              key={m.id}
                              value={m.nome}
                              onSelect={() => {
                                setMembroCond(m.id);
                                setMembroCondOpen(false);
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 ${membroCond === m.id ? "opacity-100" : "opacity-0"}`} />
                              <span className="truncate">{m.nome}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Data da Ocorrência</Label>
                <Input type="month" value={dataCond} onChange={(e) => setDataCond(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Efeito/Código</Label>
                <Select value={codigoCond} onValueChange={setCodigoCond}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADVERTENCIA">1 - Advertência</SelectItem>
                    <SelectItem value="BLOQUEIO">2 - Bloqueio</SelectItem>
                    <SelectItem value="SUSPENSAO">3 - Suspensão</SelectItem>
                    <SelectItem value="CANCELAMENTO">4 - Cancelamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleAbrirConfirmacaoCondicionalidade}
                variant="secondary"
                className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200"
                disabled={salvandoDescumprimento || carregandoApi}
              >
                {salvandoDescumprimento ? "Registrando..." : "Registrar Ocorrência"}
              </Button>
            </div>

            <AlertDialog open={modalConfirmarRegistroAberto} onOpenChange={setModalConfirmarRegistroAberto}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar registro de ocorrência</AlertDialogTitle>
                  <AlertDialogDescription>Deseja confirmar o registro da ocorrência? Essa ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmarRegistroCondicionalidade} disabled={salvandoDescumprimento || carregandoApi}>
                    {salvandoDescumprimento ? "Registrando..." : "Confirmar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {anotacoes.length > 0 && (
              <div className="mt-6 border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Membro</th>
                      <th className="px-4 py-2 text-left font-medium">Data/Ref</th>
                      <th className="px-4 py-2 text-left font-medium">Código</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anotacoes.slice((paginaAtual - 1) * pageSize, paginaAtual * pageSize).map((anot) => (
                      <tr key={anot.id} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium">
                          {prontuario.membros.find((m) => String(m.id) === String(cidadaoIdByMembroId[anot.membroId] || anot.membroId))?.nome}
                        </td>
                        <td className="px-4 py-2 text-slate-600">{anot.dataOcorrencia}</td>
                        <td className="px-4 py-2">
                          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">CÓDIGO {anot.condCodigo}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-end gap-2 px-4 py-4 border-t bg-white">

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                    disabled={paginaAtual === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {paginaAtual} / {totalPaginas}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtual >= totalPaginas}
                  >
                    Próxima
                  </Button>
                </div>

              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Stethoscope className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Situação Epidemiológica e Alimentar</h3>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium leading-relaxed">
                A família declara ou há indícios de insegurança alimentar por insuficiência de alimentos?
              </Label>
              <Select value={insegurancaAlimentar} onValueChange={setInsegurancaAlimentar}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 border-t pt-4">
              <Label className="text-xs font-bold uppercase text-slate-500 block">Outras observações técnicas (Diagnóstico de Saúde)</Label>
              <Textarea
                className="min-h-[120px] bg-slate-50/50"
                placeholder={
                  "Descreva observações sobre saneamento, endemias ou outras vulnerabilidades de saúde...\n(Atenção! Toda anotação incluída neste espaço deve ser precedida de data, nome e função do profissional responsável pela mesma)"
                }
                value={outrasObs}
                onChange={(e) => setOutrasObs(e.target.value)}
                maxLength={600}
              />
              <p className="text-xs text-slate-400 text-right mt-1">{outrasObs.length}/600</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button
          variant="outline"
          onClick={handleSalvarGeral}
          className="gap-2"
          disabled={carregandoApi || salvandoMembro || salvandoCondicoesSaude || salvandoDescumprimento}
        >
          <Save className="w-4 h-4" /> {salvandoMembro || salvandoCondicoesSaude || salvandoDescumprimento ? "Salvando..." : "Salvar Rascunho"}
        </Button>
        <Button
          onClick={handleSubmit}
          className="gap-2 bg-primary"
          disabled={carregandoApi || salvandoMembro || salvandoCondicoesSaude || salvandoDescumprimento}
        >
          Salvar e avançar <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
