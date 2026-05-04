import { type WheelEvent, useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Users, FileText, Check, ChevronDown, ChevronsUpDown, Save, ArrowRight, AlertTriangle } from "lucide-react";
import { toast } from "@/lib/sonner";
import * as Accordion from "@radix-ui/react-accordion";
import { getApiErrorMessage } from "@/lib/notifications";
import { sanitizeTextInputValue } from "@/lib/textSanitizer";
import type { Prontuario } from "@/types/prontuario";
import {
  condicaoEducacionalService,
  type CondicaoEducacionalMembroResponse,
  type DescumprimentoEducacionalResponse,
} from "@/services/prontuario/condicaoEducacionalService";
import { membroComposicaoService, type MembroComposicaoResponse } from "@/services/prontuario/membroComposicaoService";
import {
  useCondicaoEducacionalProntuario,
  useCondicaoEducacionalMembroProntuario,
  useDescumprimentoEducacionalProntuario,
} from "@/hooks/prontuario/useCondicaoEducacionalProntuario";

interface Props {
  prontuario: Prontuario | null;
  onNext: () => void;
  onSave: () => void;
}

type MemberFormData = {
  escolaridade: string;
  alfabetizado: boolean;
  frequenciaEscolar: string;
  situacaoEscolar: string;
  observacoes: string;
};

interface AnotacaoCondicionalidade {
  id: string;
  membroId: string;
  dataOcorrencia: string;
  condCodigo: string;
}

const initialFormData: MemberFormData = {
  escolaridade: "",
  alfabetizado: true,
  frequenciaEscolar: "",
  situacaoEscolar: "",
  observacoes: "",
};
const OBSERVACAO_MEMBRO_MAX = 600;

const ESCOLARIDADE_OPTIONS = [
  { value: "SEM_ESCOLARIDADE", label: "Sem escolaridade" },
  { value: "CRECHE", label: "Creche" },
  { value: "EDUCACAO_INFANTIL", label: "Educação Infantil" },
  { value: "FUNDAMENTAL_INCOMPLETO", label: "Ensino Fundamental Incompleto" },
  { value: "EJA_FUNDAMENTAL_INCOMPLETO", label: "EJA Ensino Fundamental Incompleto" },
  { value: "FUNDAMENTAL_COMPLETO", label: "Ensino Fundamental Completo" },
  { value: "EJA_FUNDAMENTAL_COMPLETO", label: "EJA Ensino Fundamental Completo" },
  { value: "MEDIO_INCOMPLETO", label: "Ensino Médio Incompleto" },
  { value: "EJA_MEDIO_INCOMPLETO", label: "EJA Ensino Médio Incompleto" },
  { value: "MEDIO_COMPLETO", label: "Ensino Médio Completo" },
  { value: "EJA_MEDIO_COMPLETO", label: "EJA Ensino Médio Completo" },
  { value: "SUPERIOR_IMCOMPLETO", label: "Ensino Superior Incompleto" },
  { value: "SUPERIOR_COMPLETO", label: "Ensino Superior Completo" },
];

const FREQUENCIA_OPTIONS = [
  { value: "REGULAR", label: "Regular" },
  { value: "IRREGULAR", label: "Irregular" },
  { value: "NAO_FREQUENTA", label: "Não frequenta" },
  { value: "EVADIDO", label: "Evadido" },
];

const SITUACAO_OPTIONS = [
  { value: "CURSANDO", label: "Cursando" },
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "EVADIDO", label: "Evadido" },
  { value: "NUNCA_FREQUENTOU", label: "Nunca frequentou" },
];

const EFEITO_OPTIONS = [
  { value: "ADVERTENCIA", label: "1 - Advertência" },
  { value: "BLOQUEIO", label: "2 - Bloqueio" },
  { value: "SUSPENSAO", label: "3 - Suspensão" },
  { value: "CANCELAMENTO", label: "4 - Cancelamento" },
];

const normalizeCpf = (value?: string) => (value || "").replace(/\D/g, "");

const parseApiList = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "result" in payload) {
    const result = (payload as { result?: unknown }).result;
    if (Array.isArray(result)) return result as T[];
  }
  return [];
};

const excludeEmoji = sanitizeTextInputValue;

const toCode = (value: string | undefined, options: Array<{ value: string; label: string }>) => {
  const raw = (value || "").trim();
  if (!raw) return "";
  const up = raw.toUpperCase();
  if (options.some((o) => o.value === up)) return up;
  const byLabel = options.find((o) => o.label.toUpperCase() === up);
  return byLabel?.value || "";
};

export function CondicoesEducacionais({ prontuario, onNext, onSave }: Props) {
  const [searchParams] = useSearchParams();
  const [membrosComposicao, setMembrosComposicao] = useState<MembroComposicaoResponse[]>([]);

  const cpfRef = useMemo(() => normalizeCpf(prontuario?.membros.find((m) => m.id === prontuario?.pessoaReferenciaId)?.cpf || ""), [prontuario]);
  const prontuarioId = useMemo(
    () => searchParams.get("prontuarioId") || (cpfRef ? localStorage.getItem(`prontuarioIdByCpf:${cpfRef}`) || "" : ""),
    [searchParams, cpfRef],
  );

  const [activeMembroId, setActiveMembroId] = useState<string>("");
  const [memberFormData, setMemberFormData] = useState<MemberFormData>(initialFormData);
  const [membroCond, setMembroCond] = useState("");
  const [dataCond, setDataCond] = useState("");
  const [codigoCond, setCodigoCond] = useState("");
  const [anotacoes, setAnotacoes] = useState<AnotacaoCondicionalidade[]>([]);
  const [observacoesDiagnostico, setObservacoesDiagnostico] = useState("");
  const [membrosApi, setMembrosApi] = useState<CondicaoEducacionalMembroResponse[]>([]);
  const [condicaoEducacionalId, setCondicaoEducacionalId] = useState("");
  const [membroIdByCidadaoId, setMembroIdByCidadaoId] = useState<Record<string, string>>({});
  const [cidadaoIdByMembroId, setCidadaoIdByMembroId] = useState<Record<string, string>>({});
  const [carregandoApi, setCarregandoApi] = useState(false);
  const [modalConfirmarRegistroAberto, setModalConfirmarRegistroAberto] = useState(false);
  const [escolaridadeOpen, setEscolaridadeOpen] = useState(false);
  const [membroCondOpen, setMembroCondOpen] = useState(false);

  const { mutateAsync: salvarCondicaoEducacional, isPending: salvandoCondicaoEducacional } = useCondicaoEducacionalProntuario();
  const { mutateAsync: salvarCondicaoEducacionalMembro, isPending: salvandoMembro } = useCondicaoEducacionalMembroProntuario();
  const { mutateAsync: salvarDescumprimentoEducacional, isPending: salvandoDescumprimento } = useDescumprimentoEducacionalProntuario();

  const [paginaAtual, setPaginaAtual] = useState(1);
  const pageSize = 5;
  const totalItens = anotacoes.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / pageSize));
  const escolaridadeSelecionadaLabel = useMemo(
    () => ESCOLARIDADE_OPTIONS.find((option) => option.value === memberFormData.escolaridade)?.label || "",
    [memberFormData.escolaridade],
  );
  const membroCondSelecionadoLabel = useMemo(
    () => prontuario?.membros.find((m) => String(m.id) === String(membroCond))?.nome || "",
    [prontuario, membroCond],
  );

  const handleWheelOnCommandList = (event: WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    container.scrollTop += event.deltaY;
    event.preventDefault();
    event.stopPropagation();
  };

  const resolveMembroId = useCallback((id: string) => membroIdByCidadaoId[String(id)] || String(id), [membroIdByCidadaoId]);
  // const resolveMembroId = useCallback((id: string) => membroIdByCidadaoId[String(id)] || String(id), [membroIdByCidadaoId]);

  const syncCondicaoEducacional = useCallback(
    async (membros: CondicaoEducacionalMembroResponse[], descs: AnotacaoCondicionalidade[], observacaoGeral: string) => {
      if (!prontuarioId) return;
      const salvo = await salvarCondicaoEducacional({
        id: condicaoEducacionalId || undefined,
        payload: {
          prontuario: prontuarioId,
          condicao_educacional_membro: membros.map((m) => String(m.id)),
          descumprimento_educacional_membro: descs.map((d) => String(d.id)),
          observacao_geral: observacaoGeral || undefined,
        },
      });
      if (salvo?.id) setCondicaoEducacionalId(String(salvo.id));
    },
    [condicaoEducacionalId, prontuarioId, salvarCondicaoEducacional],
  );

  useEffect(() => {
    if (!prontuarioId) return;
    const load = async () => {
      setCarregandoApi(true);
      try {
        const [membrosRes, descRes, condRes, composicaoRes] = await Promise.all([
          condicaoEducacionalService.listarMembro({ prontuario: prontuarioId }),
          condicaoEducacionalService.listarDescumprimento({ prontuario: prontuarioId }),
          condicaoEducacionalService.listar({ prontuario: prontuarioId }),
          membroComposicaoService.listar({ prontuario: prontuarioId }),
        ]);

        const membrosLista = parseApiList<CondicaoEducacionalMembroResponse>(membrosRes.data).filter(
          (item) => String(item.prontuario) === String(prontuarioId),
        );
        setMembrosApi(membrosLista);

        const composicaoLista = parseApiList<MembroComposicaoResponse>(composicaoRes.data).filter(
          (item) => String(item.prontuario) === String(prontuarioId),
        );
        setMembrosComposicao(composicaoLista);
        const byCidadao: Record<string, string> = {};
        const byMembro: Record<string, string> = {};
        composicaoLista.forEach((item) => {
          const membroId = String(item.id || "");
          const cidadaoId = typeof item.cidadao === "object" ? String(item.cidadao?.id || "") : String(item.cidadao || "");
          if (cidadaoId && membroId) {
            byCidadao[cidadaoId] = membroId;
            byMembro[membroId] = cidadaoId;
          }
        });
        setMembroIdByCidadaoId(byCidadao);
        setCidadaoIdByMembroId(byMembro);

        const descLista = parseApiList<DescumprimentoEducacionalResponse>(descRes.data)
          .filter((item) => String(item.prontuario) === String(prontuarioId))
          .map((item) => ({
            id: String(item.id),
            membroId: String(item.membro),
            dataOcorrencia: String(item.data_ocorrencia || ""),
            condCodigo: String(item.efeito_codigo || ""),
          }));
        setAnotacoes(descLista);

        const condLista = parseApiList<{ id: string; prontuario: string; observacao_geral?: string }>(condRes.data);
        const cond = condLista.find((item) => String(item.prontuario) === String(prontuarioId));
        if (cond) {
          setCondicaoEducacionalId(String(cond.id || ""));
          setObservacoesDiagnostico(String(cond.observacao_geral || ""));
        }
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Não foi possível carregar as condições educacionais."));
      } finally {
        setCarregandoApi(false);
      }
    };

    load();
  }, [prontuarioId]);

  useEffect(() => {
    if (!activeMembroId) return;
    const membroComposicaoId = resolveMembroId(activeMembroId);
    const registro = membrosApi.find((c) => String(c.membro) === String(membroComposicaoId));
    if (registro) {
      setMemberFormData({
        escolaridade: toCode(registro.escolaridade, ESCOLARIDADE_OPTIONS),
        alfabetizado: Boolean(registro.alfabetizado),
        frequenciaEscolar: toCode(registro.frequencia, FREQUENCIA_OPTIONS),
        situacaoEscolar: toCode(registro.situacao, SITUACAO_OPTIONS),
        observacoes: String(registro.observacao || ""),
      });
    } else {
      setMemberFormData(initialFormData);
    }
  }, [activeMembroId, membrosApi, resolveMembroId]);

  const handleFormChange = useCallback((field: keyof MemberFormData, value: string | boolean) => {
    setMemberFormData((prev) => ({
      ...prev,
      [field]: field === "observacoes" && typeof value === "string" ? value.slice(0, OBSERVACAO_MEMBRO_MAX) : value,
    }));
  }, []);

  const handleSaveMember = async () => {
    if (!prontuarioId) {
      toast.error("Prontuário não identificado na URL.");
      return;
    }
    if (!activeMembroId) {
      toast.error("Selecione um membro para salvar as condições educacionais.");
      return;
    }
    try {
      const membroComposicaoId = resolveMembroId(activeMembroId);
      const existing = membrosApi.find((c) => String(c.membro) === String(membroComposicaoId));
      const salvo = await salvarCondicaoEducacionalMembro({
        id: existing?.id ? String(existing.id) : undefined,
        payload: {
          prontuario: prontuarioId,
          membro: membroComposicaoId,
          escolaridade: memberFormData.escolaridade || undefined,
          alfabetizado: memberFormData.alfabetizado,
          frequencia: memberFormData.frequenciaEscolar || undefined,
          situacao: memberFormData.situacaoEscolar || undefined,
          observacao: memberFormData.observacoes || undefined,
        },
      });

      if (salvo) {
        const atualizado = existing
          ? membrosApi.map((item) => (String(item.id) === String(salvo.id) ? { ...item, ...salvo } : item))
          : [...membrosApi, salvo];
        setMembrosApi(atualizado);
        await syncCondicaoEducacional(atualizado, anotacoes, observacoesDiagnostico);
      }

      toast.success(
        existing ? "Condições educacionais do membro atualizadas com sucesso." : "Condições educacionais do membro registradas com sucesso.",
      );
      setActiveMembroId("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar a condição educacional do membro."));
    }
  };

  const handleAddCondicionalidade = async () => {
    if (!prontuarioId || !membroCond || !dataCond || !codigoCond) {
      toast.error("Preencha o membro, data e código da condicionalidade.");
      return;
    }
    try {
      const membroComposicaoId = resolveMembroId(membroCond);
      const salvo = await salvarDescumprimentoEducacional({
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
      await syncCondicaoEducacional(membrosApi, atualizadas, observacoesDiagnostico);
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
      toast.error("Preencha o membro, data e código da condicionalidade.");
      return;
    }
    setModalConfirmarRegistroAberto(true);
  };

  const handleConfirmarRegistroCondicionalidade = async () => {
    setModalConfirmarRegistroAberto(false);
    await handleAddCondicionalidade();
  };

  const handleSalvarGeral = async (): Promise<boolean> => {
    if (!prontuarioId) {
      toast.error("Prontuário não identificado na URL.");
      return;
    }
    try {
      await syncCondicaoEducacional(membrosApi, anotacoes, observacoesDiagnostico);
      toast.success("Condições educacionais salvas.");
      onSave();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar as condições educacionais."));
      return false;
    }
  };

  if (!prontuario) return <div className="text-center p-8 text-muted-foreground">Carregando dados...</div>;

  return (
    <div className="space-y-10 pb-20">
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Situação Educacional por Membro</h3>
        </div>

        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Accordion.Root type="single" collapsible value={activeMembroId} onValueChange={setActiveMembroId} className="w-full">
              {prontuario.membros.map((m, index) => {
                const membroComposicaoId = resolveMembroId(m.id);
                const hasData = membrosApi.some((c) => String(c.membro) === String(membroComposicaoId));
                return (
                  <Accordion.Item key={m.id} value={m.id} className="border-b last:border-0">
                    <Accordion.Header>
                      <Accordion.Trigger className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all group">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              "bg-slate-100 text-slate-500"
                            }`}
                          >
                            { `${index + 1}o`}
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-slate-700 group-data-[state=open]:text-primary transition-colors">{m.nome}</p>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                              {m.parentesco}
                            </p>
                          </div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400 group-data-[state=open]:rotate-180 transition-transform" />
                      </Accordion.Trigger>
                    </Accordion.Header>

                    <Accordion.Content className="p-6 bg-slate-50/50 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-6 space-y-2">
                          <Label className="text-xs font-bold uppercase text-slate-500">Escolaridade</Label>
                          <Popover open={escolaridadeOpen} onOpenChange={setEscolaridadeOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" aria-expanded={escolaridadeOpen} className="w-full justify-between bg-white font-normal">
                                <span className="truncate">{escolaridadeSelecionadaLabel || "Selecione"}</span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Buscar escolaridade..." />
                                <CommandList onWheel={handleWheelOnCommandList} className="overscroll-contain">
                                  <CommandEmpty>Nenhuma escolaridade encontrada.</CommandEmpty>
                                  <CommandGroup>
                                    {ESCOLARIDADE_OPTIONS.map((option) => (
                                      <CommandItem
                                        key={option.value}
                                        value={option.label}
                                        onSelect={() => {
                                          handleFormChange("escolaridade", option.value);
                                          setEscolaridadeOpen(false);
                                        }}
                                      >
                                        <Check className={`mr-2 h-4 w-4 ${memberFormData.escolaridade === option.value ? "opacity-100" : "opacity-0"}`} />
                                        {option.label}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="md:col-span-3 space-y-2">
                          <Label className="text-xs font-bold uppercase text-slate-500">Alfabetizado</Label>
                          <div className="flex items-center space-x-3 h-10 px-3 bg-white border rounded-md">
                            <Switch checked={memberFormData.alfabetizado} onCheckedChange={(c) => handleFormChange("alfabetizado", c)} />
                            <span className="text-sm font-medium">{memberFormData.alfabetizado ? "Sim" : "Não"}</span>
                          </div>
                        </div>

                        <div className="md:col-span-4 md:col-start-1 space-y-2">
                          <Label className="text-xs font-bold uppercase text-slate-500 italic">Frequência escolar</Label>
                          <Select value={memberFormData.frequenciaEscolar} onValueChange={(v) => handleFormChange("frequenciaEscolar", v)}>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {FREQUENCIA_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-4 space-y-2">
                          <Label className="text-xs font-bold uppercase text-slate-500 italic">Situação escolar</Label>
                          <Select value={memberFormData.situacaoEscolar} onValueChange={(v) => handleFormChange("situacaoEscolar", v)}>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {SITUACAO_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-12 space-y-2">
                          <Label className="text-xs font-bold uppercase text-slate-500">Observações do membro</Label>
                          <Textarea
                            className="bg-white"
                            placeholder="Particularidades sobre a vida escolar deste membro..."
                            value={memberFormData.observacoes}
                            maxLength={OBSERVACAO_MEMBRO_MAX}
                            onChange={(e) => handleFormChange("observacoes", e.target.value)}
                          />
                        </div>

                        <div className="md:col-span-12 flex justify-end">
                          <Button size="sm" onClick={handleSaveMember} className="gap-2" disabled={salvandoMembro || carregandoApi}>
                            <Save className="w-4 h-4" /> {salvandoMembro ? "Salvando..." : "Atualizar Membro"}
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
          <h3 className="font-semibold text-lg text-slate-800">Descumprimento de Condicionalidades (PBF)</h3>
        </div>

        <Card className="">
          <CardHeader className="bg-amber-100/100 border-b border-amber-100">
            <CardDescription>Registre advertências, bloqueios ou suspensões relacionadas ao acompanhamento de educação do PBF.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>Membro da família</Label>
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
                <Label>Data da ocorrência</Label>
                <Input type="month" value={dataCond} onChange={(e) => setDataCond(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Efeito gerado (código)</Label>
                <Select value={codigoCond} onValueChange={setCodigoCond}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EFEITO_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleAbrirConfirmacaoCondicionalidade}
                variant="secondary"
                className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200"
                disabled={salvandoDescumprimento || carregandoApi}
              >
                {salvandoDescumprimento ? "Registrando..." : "Registrar ocorrência"}
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
                          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">{anot.condCodigo}</span>
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
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Diagnóstico e Parecer Educacional</h3>
        </div>
        <Card className="">
          <CardContent className="p-6">
            <Label className="text-xs font-bold uppercase text-slate-500 block mb-3">Observações gerais da família</Label>
            <Textarea
              className="min-h-[100px] bg-slate-50/30"
              placeholder={
                "Análise técnica sobre acesso à educação, evasão escolar e superação do analfabetismo.\n(Atenção: toda anotação deve ser precedida de data, nome e função do profissional responsável.)"
              }
              value={observacoesDiagnostico}
              onChange={(e) => setObservacoesDiagnostico(excludeEmoji(e.target.value).slice(0, 600))}
              maxLength={600}
            />
            <p className="text-xs text-slate-400 text-right mt-1">{observacoesDiagnostico.length}/600</p>
          </CardContent>
        </Card>
      </section>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button variant="outline" onClick={handleSalvarGeral} className="gap-2" disabled={salvandoCondicaoEducacional || carregandoApi}>
          <Save className="w-4 h-4" /> {salvandoCondicaoEducacional ? "Salvando..." : "Salvar Prontuário"}
        </Button>
        <Button
          onClick={async () => {
            const salvou = await handleSalvarGeral();
            if (salvou) onNext();
          }}
          className="gap-2 bg-primary"
        >
          Salvar e avançar <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
