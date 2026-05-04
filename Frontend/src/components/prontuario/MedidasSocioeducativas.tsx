import { type WheelEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as Accordion from "@radix-ui/react-accordion";
import { ArrowRight, Check, CheckCircle2, ChevronDown, ChevronsUpDown, Save, Scale, ShieldAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/sonner";
import { getApiErrorMessage } from "@/lib/notifications";
import type { Prontuario } from "@/types/prontuario";
import { membroComposicaoService, type MembroComposicaoResponse } from "@/services/prontuario/membroComposicaoService";
import {
  medidaSocioeducativaService,
  type AcompanhamentoLAPSCResponse,
  type MedidaSocioeducativaMembroResponse,
  type MedidaSocioeducativaResponse,
} from "@/services/prontuario/medidaSocioeducativaService";
import {
  useAcompanhamentoLAPSCProntuario,
  useMedidaSocioeducativaMembroProntuario,
  useMedidaSocioeducativaProntuario,
} from "@/hooks/prontuario/useMedidaSocioeducativaProntuario";

interface Props {
  prontuario: Prontuario | null;
  onNext: () => void;
  onSave: () => void;
}

type MedidaFormData = {
  medida: string;
  dataInicio: string;
  dataTermino: string;
  responsavel: string;
};

type AcompanhamentoFormData = {
  acompanhadoCreas: "SIM" | "NAO" | "";
  dataAnotacao: string;
  observacaoAcompanhamento: string;
};

type MedidaMembroLocal = {
  id: string;
  membroId: string;
  medida: string;
  dataInicio: string;
  dataTermino: string;
  responsavel: string;
};

type AcompanhamentoLocal = {
  id: string;
  membroId: string;
  acompanhadoCreas: "SIM" | "NAO" | "";
  dataAnotacao: string;
  observacaoAcompanhamento: string;
};

const RESPONSAVEL_MAX = 150;
const OBSERVACOES_MAX = 600;

const TIPOS_MEDIDAS = [
  { value: "ADVERTENCIA", label: "Advertência" },
  { value: "REPARAR_DANO", label: "Obrigação de reparar o dano" },
  { value: "PRESTACAO_SERVICOS", label: "Prestação de serviços a comunidade" },
  { value: "LIBERDADE_ASSISTIDA", label: "Liberdade assistida" },
  { value: "SEMILIBERDADE", label: "Inserção em regime de semiliberdade" },
  { value: "ESTABELECIMENTO_EDUCACIONAL", label: "Internação em estabelecimento educacional" },
  { value: "QUALQUER", label: "Qualquer uma das medidas protetivas" },
];

const EMPTY_MEDIDA_FORM: MedidaFormData = {
  medida: "",
  dataInicio: "",
  dataTermino: "",
  responsavel: "",
};

const EMPTY_ACOMP_FORM: AcompanhamentoFormData = {
  acompanhadoCreas: "",
  dataAnotacao: "",
  observacaoAcompanhamento: "",
};

const normalizeCpf = (value?: string) => (value || "").replace(/\D/g, "");
const textMax = (value: string, max: number) => value.slice(0, max);

const parseApiList = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "result" in payload) {
    const result = (payload as { result?: unknown }).result;
    if (Array.isArray(result)) return result as T[];
  }
  return [];
};

const asId = (value: unknown) =>
  value && typeof value === "object" && "id" in value ? String((value as { id?: unknown }).id || "") : String(value || "");

const mapMedidaMembro = (
  item: MedidaSocioeducativaMembroResponse,
  cidadaoIdByMembroId: Record<string, string>,
): MedidaMembroLocal => {
  const membroComposicaoId = asId(item.membro);
  return {
    id: String(item.id || ""),
    membroId: cidadaoIdByMembroId[membroComposicaoId] || membroComposicaoId,
    medida: String(item.tipo_medida || ""),
    dataInicio: String(item.data_inicio || ""),
    dataTermino: String(item.data_termino || ""),
    responsavel: String(item.numero_processo || ""),
  };
};

const mapAcompanhamento = (
  item: AcompanhamentoLAPSCResponse,
  medidaMembroById: Record<string, MedidaMembroLocal>,
): AcompanhamentoLocal | null => {
  const medidaMembroId = asId(item.membro);
  const medida = medidaMembroById[medidaMembroId];
  if (!medida?.membroId) return null;

  const acompanhadoRaw = String(item.acompanhado || "").toUpperCase();
  const acompanhadoCreas: "SIM" | "NAO" | "" = acompanhadoRaw === "SIM" || acompanhadoRaw === "NAO" ? acompanhadoRaw : "";
  const observacao = (item as { observação?: string; observacao?: string }).observação || item.observacao || "";

  return {
    id: String(item.id || ""),
    membroId: medida.membroId,
    acompanhadoCreas,
    dataAnotacao: String(item.data_anotacao || ""),
    observacaoAcompanhamento: String(observacao),
  };
};

export function MedidasSocioeducativas({ prontuario, onNext, onSave }: Props) {
  const [searchParams] = useSearchParams();

  const cpfRef = useMemo(() => normalizeCpf(prontuario?.membros.find((m) => m.id === prontuario?.pessoaReferenciaId)?.cpf || ""), [prontuario]);
  const prontuarioId = useMemo(
    () => searchParams.get("prontuarioId") || (cpfRef ? localStorage.getItem(`prontuarioIdByCpf:${cpfRef}`) || "" : ""),
    [searchParams, cpfRef],
  );

  const { mutateAsync: salvarMedidaMembro, isPending: salvandoMedidaMembro } = useMedidaSocioeducativaMembroProntuario();
  const { mutateAsync: salvarAcompanhamento, isPending: salvandoAcompanhamento } = useAcompanhamentoLAPSCProntuario();
  const { mutateAsync: salvarMedidaSocioeducativa, isPending: salvandoBlocoFinal } = useMedidaSocioeducativaProntuario();

  const [carregandoApi, setCarregandoApi] = useState(false);
  const [medidaSocioeducativaId, setMedidaSocioeducativaId] = useState("");
  const [membroIdByCidadaoId, setMembroIdByCidadaoId] = useState<Record<string, string>>({});
  const [cidadaoIdByMembroId, setCidadaoIdByMembroId] = useState<Record<string, string>>({});

  const [medidasMembro, setMedidasMembro] = useState<MedidaMembroLocal[]>([]);
  const [acompanhamentos, setAcompanhamentos] = useState<AcompanhamentoLocal[]>([]);

  const [activeMembroId, setActiveMembroId] = useState("");
  const [activeAcompanhamentoId, setActiveAcompanhamentoId] = useState("");
  const [medidaForm, setMedidaForm] = useState<MedidaFormData>(EMPTY_MEDIDA_FORM);
  const [acompanhamentoForm, setAcompanhamentoForm] = useState<AcompanhamentoFormData>(EMPTY_ACOMP_FORM);
  const [contatosPsc, setContatosPsc] = useState("");
  const [tipoMedidaOpen, setTipoMedidaOpen] = useState(false);
  const tipoMedidaSelecionadaLabel = useMemo(
    () => TIPOS_MEDIDAS.find((tipo) => tipo.value === medidaForm.medida)?.label || "",
    [medidaForm.medida],
  );

  useEffect(() => {
    if (!prontuarioId) return;

    const load = async () => {
      setCarregandoApi(true);
      try {
        const [membrosRes, medidasRes, acompanhamentosRes, medidaSocioeducativaRes] = await Promise.all([
          membroComposicaoService.listar({ prontuario: prontuarioId }),
          medidaSocioeducativaService.listarMedidaMembro({ prontuario: prontuarioId }),
          medidaSocioeducativaService.listarAcompanhamentoLAPSC({ prontuario: prontuarioId }),
          medidaSocioeducativaService.listarMedidaSocioeducativa({ prontuario: prontuarioId }),
        ]);

        const composicaoLista = parseApiList<MembroComposicaoResponse>(membrosRes.data).filter(
          (item) => String(item.prontuario) === String(prontuarioId),
        );

        const byCidadao: Record<string, string> = {};
        const byMembro: Record<string, string> = {};
        composicaoLista.forEach((item) => {
          const membroComposicaoId = String(item.id || "");
          const cidadaoId = typeof item.cidadao === "object" ? String(item.cidadao?.id || "") : String(item.cidadao || "");
          if (membroComposicaoId && cidadaoId) {
            byCidadao[cidadaoId] = membroComposicaoId;
            byMembro[membroComposicaoId] = cidadaoId;
          }
        });
        setMembroIdByCidadaoId(byCidadao);
        setCidadaoIdByMembroId(byMembro);

        const medidasLista = parseApiList<MedidaSocioeducativaMembroResponse>(medidasRes.data).filter(
          (item) => String(item.prontuario) === String(prontuarioId),
        );
        const medidasLocais = medidasLista.map((item) => mapMedidaMembro(item, byMembro));
        setMedidasMembro(medidasLocais);

        const medidaMembroById = medidasLocais.reduce<Record<string, MedidaMembroLocal>>((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {});

        const acompanhamentosLista = parseApiList<AcompanhamentoLAPSCResponse>(acompanhamentosRes.data).filter(
          (item) => String(item.prontuario) === String(prontuarioId),
        );
        const acompanhamentosLocais = acompanhamentosLista
          .map((item) => mapAcompanhamento(item, medidaMembroById))
          .filter(Boolean) as AcompanhamentoLocal[];
        setAcompanhamentos(acompanhamentosLocais);

        const blocoFinal = parseApiList<MedidaSocioeducativaResponse>(medidaSocioeducativaRes.data).find(
          (item) => String(item.prontuario) === String(prontuarioId),
        );
        if (blocoFinal) {
          setMedidaSocioeducativaId(String(blocoFinal.id || ""));
          setContatosPsc(String(blocoFinal.contatos_PSC || ""));
        } else {
          setMedidaSocioeducativaId("");
          setContatosPsc("");
        }
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Não foi possível carregar as medidas socioeducativas."));
      } finally {
        setCarregandoApi(false);
      }
    };

    load();
  }, [prontuarioId]);

  useEffect(() => {
    if (!activeMembroId) {
      setMedidaForm(EMPTY_MEDIDA_FORM);
      return;
    }

    const registro = medidasMembro.find((m) => String(m.membroId) === String(activeMembroId));
    if (!registro) {
      setMedidaForm(EMPTY_MEDIDA_FORM);
      return;
    }

    setMedidaForm({
      medida: registro.medida || "",
      dataInicio: registro.dataInicio || "",
      dataTermino: registro.dataTermino || "",
      responsavel: registro.responsavel || "",
    });
  }, [activeMembroId, medidasMembro]);

  useEffect(() => {
    if (!activeAcompanhamentoId) {
      setAcompanhamentoForm(EMPTY_ACOMP_FORM);
      return;
    }

    const registro = acompanhamentos.find((m) => String(m.membroId) === String(activeAcompanhamentoId));
    if (!registro) {
      setAcompanhamentoForm(EMPTY_ACOMP_FORM);
      return;
    }

    setAcompanhamentoForm({
      acompanhadoCreas: registro.acompanhadoCreas || "",
      dataAnotacao: registro.dataAnotacao || "",
      observacaoAcompanhamento: registro.observacaoAcompanhamento || "",
    });
  }, [activeAcompanhamentoId, acompanhamentos]);

  const handleMedidaChange = useCallback((field: keyof MedidaFormData, value: string) => {
    setMedidaForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAcompanhamentoChange = useCallback((field: keyof AcompanhamentoFormData, value: string) => {
    setAcompanhamentoForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleWheelOnCommandList = (event: WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    container.scrollTop += event.deltaY;
    event.preventDefault();
    event.stopPropagation();
  };

  const handleSalvarMedida = async () => {
    if (!prontuarioId) {
      toast.error("Prontuário não identificado na URL.");
      return;
    }
    if (!activeMembroId) {
      toast.error("Selecione um membro da família.");
      return;
    }
    if (!medidaForm.medida || !medidaForm.dataInicio || !medidaForm.responsavel.trim()) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    const membroComposicaoId = membroIdByCidadaoId[activeMembroId] || activeMembroId;
    const existente = medidasMembro.find((m) => String(m.membroId) === String(activeMembroId));

    try {
      const salvo = await salvarMedidaMembro({
        id: existente?.id || undefined,
        payload: {
          prontuario: prontuarioId,
          membro: membroComposicaoId,
          tipo_medida: medidaForm.medida,
          data_inicio: medidaForm.dataInicio,
          data_termino: medidaForm.dataTermino || undefined,
          numero_processo: textMax(medidaForm.responsavel.trim(), RESPONSAVEL_MAX),
        },
      });

      if (!salvo) return;

      const mapeado = mapMedidaMembro(salvo, cidadaoIdByMembroId);
      setMedidasMembro((prev) => [...prev.filter((item) => item.id !== mapeado.id && item.membroId !== mapeado.membroId), mapeado]);
      toast.success("Medida socioeducativa salva com sucesso.");
      onSave();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar medida socioeducativa."));
    }
  };

  const handleSalvarAcompanhamento = async () => {
    if (!prontuarioId) {
      toast.error("Prontuário não identificado na URL.");
      return;
    }
    if (!activeAcompanhamentoId) {
      toast.error("Selecione um membro da família.");
      return;
    }

    const medidaMembro = medidasMembro.find((m) => String(m.membroId) === String(activeAcompanhamentoId));
    if (!medidaMembro?.id) {
      toast.error("Cadastre primeiro a medida socioeducativa desse membro.");
      return;
    }

    const existente = acompanhamentos.find((a) => String(a.membroId) === String(activeAcompanhamentoId));

    try {
      const salvo = await salvarAcompanhamento({
        id: existente?.id || undefined,
        payload: {
          prontuario: prontuarioId,
          membro: medidaMembro.id,
          acompanhado: acompanhamentoForm.acompanhadoCreas || undefined,
          data_anotacao: acompanhamentoForm.dataAnotacao || undefined,
          observação: textMax(acompanhamentoForm.observacaoAcompanhamento, OBSERVACOES_MAX) || undefined,
        },
      });

      if (!salvo) return;

      const mapeado = mapAcompanhamento(salvo, { [medidaMembro.id]: medidaMembro });
      if (!mapeado) return;
      setAcompanhamentos((prev) => [...prev.filter((item) => item.id !== mapeado.id && item.membroId !== mapeado.membroId), mapeado]);
      toast.success("Acompanhamento salvo com sucesso.");
      onSave();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar acompanhamento."));
    }
  };

  const handleSalvarFinal = async (): Promise<boolean> => {
    if (!prontuarioId) {
      toast.error("Prontuário não identificado na URL.");
      return false;
    }

    try {
      const salvo = await salvarMedidaSocioeducativa({
        id: medidaSocioeducativaId || undefined,
        payload: {
          prontuario: prontuarioId,
          membro_socio_educativo: medidasMembro.map((item) => item.id).filter(Boolean),
          acompanhamento_LAPSC_membro: acompanhamentos.map((item) => item.id).filter(Boolean),
          contatos_PSC: textMax(contatosPsc, OBSERVACOES_MAX) || undefined,
        },
      });

      if (salvo?.id) setMedidaSocioeducativaId(String(salvo.id));
      toast.success("Medidas socioeducativas salvas com sucesso.");
      onSave();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar medidas socioeducativas."));
      return false;
    }
  };

  if (!prontuario) return <div className="p-8 text-center text-muted-foreground">Carregando dados...</div>;

  const bloqueado = carregandoApi || salvandoMedidaMembro || salvandoAcompanhamento || salvandoBlocoFinal;

  return (
    <div className="space-y-10 pb-20">
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Scale className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-slate-800">Medidas Socioeducativas por Membro</h3>
        </div>

        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <Accordion.Root type="single" collapsible value={activeMembroId} onValueChange={setActiveMembroId} className="w-full">
              {prontuario.membros.map((membro, index) => {
                const hasData = medidasMembro.some((m) => String(m.membroId) === String(membro.id));
                return (
                  <Accordion.Item key={membro.id} value={membro.id} className="border-b last:border-0">
                    <Accordion.Header>
                      <Accordion.Trigger className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all group">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${"bg-slate-100 text-slate-500"
                              }`}
                          >
                            {hasData ? <CheckCircle2 className="h-4 w-4" /> : `${index + 1}o`}
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-slate-700 transition-colors group-data-[state=open]:text-primary">{membro.nome}</p>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{membro.parentesco}</p>
                          </div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400 group-data-[state=open]:rotate-180 transition-transform" />
                      </Accordion.Trigger>
                    </Accordion.Header>

                    <Accordion.Content className="p-6 bg-slate-50/50 border-t">
                      {activeMembroId === membro.id && (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                          <div className="space-y-2 md:col-span-6">
                            <Label className="text-xs font-bold uppercase text-slate-500">Tipo de medida *</Label>
                            <Popover open={tipoMedidaOpen} onOpenChange={setTipoMedidaOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={tipoMedidaOpen}
                                  className="w-full justify-between bg-white font-normal"
                                  type="button"
                                >
                                  <span className="truncate">{tipoMedidaSelecionadaLabel || "Selecione..."}</span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Buscar tipo de medida..." />
                                  <CommandList onWheel={handleWheelOnCommandList} className="max-h-[240px] overscroll-contain">
                                    <CommandEmpty>Nenhum tipo de medida encontrado.</CommandEmpty>
                                    <CommandGroup>
                                      {TIPOS_MEDIDAS.map((tipo) => (
                                        <CommandItem
                                          key={tipo.value}
                                          value={tipo.label}
                                          onSelect={() => {
                                            handleMedidaChange("medida", tipo.value);
                                            setTipoMedidaOpen(false);
                                          }}
                                        >
                                          <Check className={`mr-2 h-4 w-4 ${medidaForm.medida === tipo.value ? "opacity-100" : "opacity-0"}`} />
                                          <span className="truncate">{tipo.label}</span>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="space-y-2 md:col-span-3">
                            <Label className="text-xs font-bold uppercase text-slate-500">Data de início *</Label>
                            <Input type="date" className="bg-white" value={medidaForm.dataInicio} onChange={(e) => handleMedidaChange("dataInicio", e.target.value)} />
                          </div>

                          <div className="space-y-2 md:col-span-3">
                            <Label className="text-xs font-bold uppercase text-slate-500">Data de término</Label>
                            <Input type="date" className="bg-white" value={medidaForm.dataTermino} onChange={(e) => handleMedidaChange("dataTermino", e.target.value)} />
                          </div>

                          <div className="space-y-2 md:col-span-12">
                            <Label className="text-xs font-bold uppercase text-slate-500">Número do processo *</Label>
                            <Input
                              className="bg-white"
                              value={medidaForm.responsavel}
                              maxLength={RESPONSAVEL_MAX}
                              onChange={(e) => handleMedidaChange("responsavel", textMax(e.target.value, RESPONSAVEL_MAX))}
                            />
                          </div>

                          <div className="flex justify-end md:col-span-12">
                            <Button size="sm" className="gap-2" onClick={handleSalvarMedida} disabled={bloqueado}>
                              <Save className="h-4 w-4" /> {salvandoMedidaMembro ? "Salvando..." : "Salvar medida"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </Accordion.Content>
                  </Accordion.Item>
                );
              })}
            </Accordion.Root>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-slate-800">Acompanhamento pelo CRAS</h3>
        </div>

        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <Accordion.Root type="single" collapsible value={activeAcompanhamentoId} onValueChange={setActiveAcompanhamentoId} className="w-full">
              {prontuario.membros.map((membro, index) => {
                const registro = acompanhamentos.find((m) => String(m.membroId) === String(membro.id));
                const hasData = !!(registro?.acompanhadoCreas || registro?.dataAnotacao || registro?.observacaoAcompanhamento);

                return (
                  <Accordion.Item key={`acomp-${membro.id}`} value={membro.id} className="border-b last:border-0">
                    <Accordion.Header>
                      <Accordion.Trigger className="group flex w-full items-center justify-between p-4 transition-all hover:bg-slate-50">
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${"bg-slate-100 text-slate-500"
                              }`}
                          >
                            {hasData ? <CheckCircle2 className="h-4 w-4" /> : `${index + 1}o`}
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-slate-700 transition-colors group-data-[state=open]:text-primary">{membro.nome}</p>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{membro.parentesco}</p>
                          </div>
                        </div>
                        <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-data-[state=open]:rotate-180" />
                      </Accordion.Trigger>
                    </Accordion.Header>

                    <Accordion.Content className="border-t bg-slate-50/50 p-6">
                      {activeAcompanhamentoId === membro.id && (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                          <div className="space-y-2 md:col-span-4">
                            <Label className="text-xs font-bold uppercase text-slate-500">Acompanhado pelo CRAS</Label>
                            <Select
                              value={acompanhamentoForm.acompanhadoCreas}
                              onValueChange={(v: "SIM" | "NAO") => handleAcompanhamentoChange("acompanhadoCreas", v)}
                            >
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SIM">Sim</SelectItem>
                                <SelectItem value="NAO">Não</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2 md:col-span-4">
                            <Label className="text-xs font-bold uppercase text-slate-500">Data da anotação</Label>
                            <Input
                              type="date"
                              className="bg-white"
                              value={acompanhamentoForm.dataAnotacao}
                              onChange={(e) => handleAcompanhamentoChange("dataAnotacao", e.target.value)}
                            />
                          </div>

                          <div className="space-y-2 md:col-span-12">
                            <Label className="text-xs font-bold uppercase text-slate-500">Observação</Label>
                            <Textarea
                              className="min-h-[90px] resize-none bg-white"
                              value={acompanhamentoForm.observacaoAcompanhamento}
                              maxLength={OBSERVACOES_MAX}
                              placeholder="Observação sobre o acompanhamento"
                              onChange={(e) =>
                                handleAcompanhamentoChange("observacaoAcompanhamento", textMax(e.target.value, OBSERVACOES_MAX))
                              }
                            />
                            <p className="text-right text-[11px] text-slate-400">
                              {acompanhamentoForm.observacaoAcompanhamento.length}/{OBSERVACOES_MAX}
                            </p>
                          </div>

                          <div className="flex justify-end md:col-span-12">
                            <Button size="sm" className="gap-2" onClick={handleSalvarAcompanhamento} disabled={bloqueado}>
                              <Save className="h-4 w-4" /> {salvandoAcompanhamento ? "Salvando..." : "Salvar acompanhamento"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </Accordion.Content>
                  </Accordion.Item>
                );
              })}
            </Accordion.Root>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-slate-800">Contatos Relativos a PSC</h3>
        </div>

        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardContent className="space-y-4 p-6">
            <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 text-primary" />
                <span>
                  As anotações relativas ao acompanhamento do adolescente em cumprimento de Medida Socioeducativa pelo CREAS devem ser registradas no
                  bloco Planejamento e Evolução do Acompanhamento Familiar.
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">
                Caso esteja cumprindo medida socioeducativa de PSC, registre os contatos do local de prestação e do orientador responsável
              </Label>
              <Textarea
                className="min-h-[140px] resize-none bg-white"
                value={contatosPsc}
                maxLength={OBSERVACOES_MAX}
                onChange={(e) => setContatosPsc(textMax(e.target.value, OBSERVACOES_MAX))}
                placeholder="Ex.: nome da instituição, endereço, telefone, nome do orientador, dias/horários e observações técnicas."
              />
              <p className="text-right text-[11px] text-slate-400">{contatosPsc.length}/{OBSERVACOES_MAX}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="flex justify-end gap-3 border-t pt-6">
        <Button variant="outline" onClick={handleSalvarFinal} className="gap-2" disabled={bloqueado}>
          <Save className="h-4 w-4" /> {salvandoBlocoFinal ? "Salvando..." : "Salvar prontuário"}
        </Button>
        <Button
          onClick={async () => {
            const salvou = await handleSalvarFinal();
            if (salvou) onNext();
          }}
          className="gap-2 bg-primary"
          disabled={bloqueado}
        >
          Salvar e avançar <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
