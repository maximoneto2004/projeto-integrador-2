import { type WheelEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Prontuario } from "@/types/prontuario";
import { getApiErrorMessage } from "@/lib/notifications";
import {
  acolhimentoInstitucionalService,
  type AcolhimentoFamiliarResponse,
  type AcolhimentoInstitucionalResponse,
} from "@/services/prontuario/acolhimentoInstitucionalService";
import { membroComposicaoService, type MembroComposicaoResponse } from "@/services/prontuario/membroComposicaoService";
import {
  useAcolhimentoFamiliarProntuario,
  useAcolhimentoInstitucionalProntuario,
  useRemoverAcolhimentoFamiliarProntuario,
} from "@/hooks/prontuario/useAcolhimentoInstitucionalProntuario";
import { toast } from "@/lib/sonner";
import { Trash2, Plus, Home, Users, Scale, Save, ArrowRight, MessageSquare, Check, ChevronsUpDown } from "lucide-react";
import { HoverText } from "@/utils/tooltips";

interface Props {
  prontuario: Prontuario | null;
  onNext: () => void;
  onSave: () => void;
}

type FieldErrors = Record<string, string>;

type AcolhimentoLocal = {
  id: string;
  membroId: string;
  dataEntrada: string;
  dataSaida: string;
  motivo: string;
  detalhes: string;
};

const ACOLHIMENTO_MOTIVO_MAX = 250;
const ACOLHIMENTO_DETALHE_MAX = 200;
const PERDA_DOMICILIO_MAX = 600;
const GUARDA_TERCEIROS_MAX = 600;
const OBSERVACAO_FINAL_MAX = 600;
const TODAY_ISO = (() => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
})();

const normalizeCpf = (value?: string) => (value || "").replace(/\D/g, "");
const textMax = (value: string, max: number) => value.slice(0, max);

const normalizeFieldErrorMessage = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const firstText = value.find((item) => typeof item === "string");
    return typeof firstText === "string" ? firstText : undefined;
  }
  return undefined;
};

const extractFieldErrors = (err: unknown, knownFields: Set<string>): FieldErrors => {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};

  const direct = data as Record<string, unknown>;
  const nested =
    (direct.errors && typeof direct.errors === "object" && !Array.isArray(direct.errors) ? (direct.errors as Record<string, unknown>) : null) ||
    (direct.result && typeof direct.result === "object" && !Array.isArray(direct.result) ? (direct.result as Record<string, unknown>) : null);
  const source = nested ?? direct;

  const mapped: FieldErrors = {};
  Object.entries(source).forEach(([key, value]) => {
    if (!knownFields.has(key)) return;
    const message = normalizeFieldErrorMessage(value);
    if (!message) return;
    mapped[key] = message;
  });

  return mapped;
};

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

const mapAcolhimentoFamiliar = (item: AcolhimentoFamiliarResponse): AcolhimentoLocal => ({
  id: String(item.id || ""),
  membroId: asId(item.membro),
  dataEntrada: String(item.data_entrada || ""),
  dataSaida: String(item.data_saida || ""),
  motivo: String(item.motivo || ""),
  detalhes: String(item.detalhe || ""),
});

export function AcolhimentoInstitucional({ prontuario, onNext, onSave }: Props) {
  const [searchParams] = useSearchParams();
  const cpfRef = useMemo(() => normalizeCpf(prontuario?.membros.find((m) => m.id === prontuario?.pessoaReferenciaId)?.cpf || ""), [prontuario]);
  const prontuarioId = useMemo(
    () => searchParams.get("prontuarioId") || (cpfRef ? localStorage.getItem(`prontuarioIdByCpf:${cpfRef}`) || "" : ""),
    [searchParams, cpfRef],
  );

  const { mutateAsync: salvarAcolhimentoFamiliar, isPending: salvandoAcolhimentoFamiliar } = useAcolhimentoFamiliarProntuario();
  const { mutateAsync: removerAcolhimentoFamiliar, isPending: removendoAcolhimentoFamiliar } = useRemoverAcolhimentoFamiliarProntuario();
  const { mutateAsync: salvarAcolhimentoInstitucional, isPending: salvandoAcolhimentoInstitucional } = useAcolhimentoInstitucionalProntuario();

  const [carregandoApi, setCarregandoApi] = useState(false);
  const [institucionalId, setInstitucionalId] = useState("");
  const [acolhimentos, setAcolhimentos] = useState<AcolhimentoLocal[]>([]);
  const [membroIdByCidadaoId, setMembroIdByCidadaoId] = useState<Record<string, string>>({});
  const [cidadaoIdByMembroId, setCidadaoIdByMembroId] = useState<Record<string, string>>({});
  const [textoPerdaDomicilio, setTextoPerdaDomicilio] = useState("");
  const [textoGuardaExterna, setTextoGuardaExterna] = useState("");
  const [situacaoPrisional, setSituacaoPrisional] = useState(false);
  const [situacaoSocioeducativa, setSituacaoSocioeducativa] = useState(false);
  const [observacoesFinais, setObservacoesFinais] = useState("");
  const [novoRegistro, setNovoRegistro] = useState({
    membroId: "",
    dataEntrada: "",
    dataSaida: "",
    motivo: "",
    detalhes: "",
  });
  const [membroRegistroOpen, setMembroRegistroOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [paginaAtual, setPaginaAtual] = useState(1);
  const pageSize = 5;
  const totalItens = acolhimentos.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / pageSize));
  const membroRegistroLabel = useMemo(
    () => prontuario?.membros.find((m) => String(m.id) === String(novoRegistro.membroId))?.nome || "",
    [prontuario, novoRegistro.membroId],
  );

  const resolveMembroId = useCallback((id: string) => membroIdByCidadaoId[String(id)] || String(id), [membroIdByCidadaoId]);
  const handleWheelOnCommandList = (event: WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    container.scrollTop += event.deltaY;
    event.preventDefault();
    event.stopPropagation();
  };
  const clearFieldError = (...fields: string[]) => {
    setFieldErrors((prev) => {
      let changed = false;
      const next = { ...prev };
      fields.forEach((field) => {
        if (!next[field]) return;
        delete next[field];
        changed = true;
      });
      return changed ? next : prev;
    });
  };

  useEffect(() => {
    if (!prontuarioId) return;

    const load = async () => {
      setCarregandoApi(true);
      try {
        const [familiarRes, institucionalRes] = await Promise.all([
          acolhimentoInstitucionalService.listarAcolhimentoFamiliar({ prontuario: prontuarioId }),
          acolhimentoInstitucionalService.listarAcolhimentoInstitucional({ prontuario: prontuarioId }),
        ]);

        const composicaoRes = await membroComposicaoService.listar({ prontuario: prontuarioId });
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

        const familiares = parseApiList<AcolhimentoFamiliarResponse>(familiarRes.data)
          .filter((item) => String(item.prontuario) === String(prontuarioId))
          .map(mapAcolhimentoFamiliar);
        setAcolhimentos(familiares);

        const institucional = parseApiList<AcolhimentoInstitucionalResponse>(institucionalRes.data).find(
          (item) => String(item.prontuario) === String(prontuarioId),
        );
        if (!institucional) return;

        setInstitucionalId(String(institucional.id || ""));
        setTextoPerdaDomicilio(String(institucional.perda_domicilio || ""));
        setTextoGuardaExterna(String(institucional.guarda_terceiros || ""));
        setSituacaoPrisional(Boolean(institucional.adulto_prisional));
        setSituacaoSocioeducativa(Boolean(institucional.adolescente_internacao));
        setObservacoesFinais(String(institucional.observacao || ""));
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Não foi possível carregar acolhimento institucional/familiar."));
      } finally {
        setCarregandoApi(false);
      }
    };

    load();
  }, [prontuarioId]);

  const handleAdicionar = async () => {
    setFieldErrors({});
    if (!prontuarioId) {
      toast.error("Prontuário não identificado na URL.");
      return;
    }
    if (!novoRegistro.membroId || !novoRegistro.dataEntrada || !novoRegistro.motivo.trim()) {
      setFieldErrors({
        ...(novoRegistro.membroId ? {} : { membro: "Selecione o membro da família." }),
        ...(novoRegistro.dataEntrada ? {} : { data_entrada: "Informe a data de entrada." }),
        ...(novoRegistro.motivo.trim() ? {} : { motivo: "Informe o motivo principal do acolhimento." }),
      });
      toast.error("Preencha os campos obrigatórios (*).");
      return;
    }

    const dateErrors: FieldErrors = {};
    if (novoRegistro.dataEntrada > TODAY_ISO) {
      dateErrors.data_entrada = "A data de entrada não pode ser futura.";
    }
    if (novoRegistro.dataSaida) {
      if (novoRegistro.dataSaida > TODAY_ISO) {
        dateErrors.data_saida = "A data de saída não pode ser futura.";
      } else if (novoRegistro.dataSaida < novoRegistro.dataEntrada) {
        dateErrors.data_saida = "A data de saída não pode ser anterior à data de entrada.";
      }
    }
    if (Object.keys(dateErrors).length) {
      setFieldErrors(dateErrors);
      toast.error("Revise as datas informadas antes de registrar.");
      return;
    }

    try {
      const membroComposicaoId = resolveMembroId(novoRegistro.membroId);
      const salvo = await salvarAcolhimentoFamiliar({
        id: undefined,
        payload: {
          prontuario: prontuarioId,
          membro: membroComposicaoId,
          data_entrada: novoRegistro.dataEntrada,
          data_saida: novoRegistro.dataSaida || undefined,
          motivo: textMax(novoRegistro.motivo.trim(), ACOLHIMENTO_MOTIVO_MAX),
          detalhe: textMax(novoRegistro.detalhes.trim(), ACOLHIMENTO_DETALHE_MAX) || undefined,
        },
      });

      if (!salvo) return;

      const mapeado = mapAcolhimentoFamiliar(salvo);
      setAcolhimentos((prev) => [...prev.filter((item) => item.id !== mapeado.id), mapeado]);
      setNovoRegistro({ membroId: "", dataEntrada: "", dataSaida: "", motivo: "", detalhes: "" });
      toast.success("Registro de acolhimento salvo com sucesso.");
    } catch (err) {
      const apiErrors = extractFieldErrors(err, new Set(["membro", "data_entrada", "data_saida", "motivo", "detalhe", "prontuario"]));
      if (Object.keys(apiErrors).length) {
        setFieldErrors(apiErrors);
        toast.error("Encontramos erros no formulário. Revise os campos destacados e tente novamente.");
        return;
      }
      toast.error(getApiErrorMessage(err, "Não foi possível salvar acolhimento familiar."));
    }
  };

  const handleRemover = async (id: string) => {
    try {
      await removerAcolhimentoFamiliar(id);
      setAcolhimentos((prev) => prev.filter((a) => a.id !== id));
      toast.success("Registro de acolhimento removido com sucesso.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível remover acolhimento familiar."));
    }
  };

  const handleSalvarFinal = async (): Promise<boolean> => {
    setFieldErrors({});
    if (!prontuarioId) {
      toast.error("Prontuário não identificado na URL.");
      return false;
    }

    try {
      const salvo = await salvarAcolhimentoInstitucional({
        id: institucionalId || undefined,
        payload: {
          prontuario: prontuarioId,
          acolhimento_familiar: acolhimentos.map((item) => item.id),
          perda_domicilio: textMax(textoPerdaDomicilio, PERDA_DOMICILIO_MAX) || undefined,
          guarda_terceiros: textMax(textoGuardaExterna, GUARDA_TERCEIROS_MAX) || undefined,
          adulto_prisional: situacaoPrisional,
          adolescente_internacao: situacaoSocioeducativa,
          observacao: textMax(observacoesFinais, OBSERVACAO_FINAL_MAX) || undefined,
        },
      });
      if (salvo?.id) setInstitucionalId(String(salvo.id));
      toast.success("Informações de acolhimento salvas!");
      onSave();
      return true;
    } catch (err) {
      const apiErrors = extractFieldErrors(
        err,
        new Set([
          "acolhimento_familiar",
          "perda_domicilio",
          "guarda_terceiros",
          "adulto_prisional",
          "adolescente_internacao",
          "observacao",
          "prontuario",
        ]),
      );
      if (Object.keys(apiErrors).length) {
        setFieldErrors(apiErrors);
        toast.error("Encontramos erros no formulário. Revise os campos destacados e tente novamente.");
        return false;
      }
      toast.error(getApiErrorMessage(err, "Não foi possível salvar acolhimento institucional."));
      return false;
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Home className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Acolhimento Institucional ou Familiar</h3>
        </div>

        <Card className="border-blue-100 shadow-sm border-l-4 border-l-primary">
          <CardHeader className="bg-blue-50/50 border-b">
            <div className="flex items-start gap-3">
              <p className="text-sm leading-relaxed">
                Registre situações de acolhimento (abrigos, casas-lar ou família acolhedora) vivenciadas por membros do grupo familiar.
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Membro da Família *</Label>
                <Popover open={membroRegistroOpen} onOpenChange={setMembroRegistroOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={membroRegistroOpen}
                      className="w-full justify-between bg-white font-normal"
                      type="button"
                    >
                      <span className="truncate">{membroRegistroLabel || "Selecione..."}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar membro..." />
                      <CommandList onWheel={handleWheelOnCommandList} className="max-h-[240px] overscroll-contain">
                        <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                        <CommandGroup>
                          {(prontuario?.membros || []).map((m) => (
                            <CommandItem
                              key={m.id}
                              value={m.nome}
                              onSelect={() => {
                                setNovoRegistro({ ...novoRegistro, membroId: m.id });
                                clearFieldError("membro");
                                setMembroRegistroOpen(false);
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 ${novoRegistro.membroId === m.id ? "opacity-100" : "opacity-0"}`} />
                              <span className="truncate">{m.nome}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {!!fieldErrors.membro && <p className="text-xs text-red-600">{fieldErrors.membro}</p>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Data de Entrada *</Label>
                  <Input
                    type="date"
                    className="bg-white"
                    value={novoRegistro.dataEntrada}
                    max={TODAY_ISO}
                    onChange={(e) => {
                      setNovoRegistro({ ...novoRegistro, dataEntrada: e.target.value });
                      clearFieldError("data_entrada", "data_saida");
                    }}
                  />
                  {!!fieldErrors.data_entrada && <p className="text-xs text-red-600">{fieldErrors.data_entrada}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Data de Saída</Label>
                  <Input
                    type="date"
                    className="bg-white"
                    value={novoRegistro.dataSaida}
                    min={novoRegistro.dataEntrada || undefined}
                    max={TODAY_ISO}
                    onChange={(e) => {
                      setNovoRegistro({ ...novoRegistro, dataSaida: e.target.value });
                      clearFieldError("data_saida");
                    }}
                  />
                  {!!fieldErrors.data_saida && <p className="text-xs text-red-600">{fieldErrors.data_saida}</p>}
                </div>
              </div>

              <div className="col-span-full space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Motivo Principal do Acolhimento *</Label>
                <Input
                  className="bg-white"
                  value={novoRegistro.motivo}
                  maxLength={ACOLHIMENTO_MOTIVO_MAX}
                  onChange={(e) => {
                    setNovoRegistro({ ...novoRegistro, motivo: textMax(e.target.value, ACOLHIMENTO_MOTIVO_MAX) });
                    clearFieldError("motivo");
                  }}
                  placeholder="Ex.: Negligência, violência, abandono..."
                />
                {!!fieldErrors.motivo && <p className="text-xs text-red-600">{fieldErrors.motivo}</p>}
              </div>

              <div className="col-span-full space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Detalhamento / Contexto</Label>
                <Textarea
                  className="bg-white"
                  value={novoRegistro.detalhes}
                  maxLength={ACOLHIMENTO_DETALHE_MAX}
                  onChange={(e) => {
                    setNovoRegistro({ ...novoRegistro, detalhes: textMax(e.target.value, ACOLHIMENTO_DETALHE_MAX) });
                    clearFieldError("detalhe");
                  }}
                  placeholder="Outras informações sobre este acolhimento..."
                  rows={2}
                />
                <p className="text-[11px] text-slate-400 text-right">
                  {novoRegistro.detalhes.length}/{ACOLHIMENTO_DETALHE_MAX}
                </p>
                {!!fieldErrors.detalhe && <p className="text-xs text-red-600">{fieldErrors.detalhe}</p>}
              </div>

              <Button
                onClick={handleAdicionar}
                className="col-span-full justify-self-end gap-2"
                disabled={carregandoApi || salvandoAcolhimentoFamiliar || removendoAcolhimentoFamiliar}
              >
                <Plus className="w-4 h-4" /> {salvandoAcolhimentoFamiliar ? "Salvando..." : "Registrar Acolhimento"}
              </Button>
            </div>

            {acolhimentos.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                  <Users className="w-4 h-4" /> Registros Adicionados ({acolhimentos.length})
                </h4>
                <div className="mt-2 border rounded-lg overflow-hidden border-slate-200">
                  <table className="w-full text-sm table-fixed">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold w-[16%]">Membro</th>
                        <th className="px-4 py-2 text-left font-semibold w-[12%]">Data de Entrada</th>
                        <th className="px-4 py-2 text-left font-semibold w-[12%]">Data de Saída</th>
                        <th className="px-4 py-2 text-left font-semibold w-[24%]">Motivo</th>
                        <th className="px-4 py-2 text-left font-semibold w-[28%]">Detalhamento</th>
                        <th className="px-4 py-2 text-right font-semibold w-[8%]">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acolhimentos.slice((paginaAtual - 1) * pageSize, paginaAtual * pageSize).map((item) => (
                        <tr key={item.id} className="bg-white border-b border-slate-200">
                          <td className="px-4 py-2 font-medium">
                            {prontuario?.membros.find((m) => String(m.id) === String(cidadaoIdByMembroId[item.membroId] || item.membroId))?.nome ||
                              "-"}
                          </td>
                          <td className="px-4 py-2 text-slate-600 whitespace-nowrap align-top">{item.dataEntrada || "-"}</td>
                          <td className="px-4 py-2 text-slate-600 whitespace-nowrap align-top">{item.dataSaida || "-"}</td>
                          <td className="px-4 py-2 text-slate-600 align-top">
                            <div className="break-all [overflow-wrap:anywhere] whitespace-pre-wrap">
                              {" "}
                              <HoverText text={item.motivo} cellClassName="font-medium" />
                            </div>
                          </td>
                          <td className="px-4 py-2 text-slate-600 align-top">
                            <div className="break-all [overflow-wrap:anywhere] whitespace-pre-wrap">
                              {" "}
                              <HoverText text={item.detalhes || "-"} cellClassName="font-medium" />
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right align-top">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemover(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              disabled={carregandoApi || salvandoAcolhimentoFamiliar || removendoAcolhimentoFamiliar}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Scale className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Perda de Domicílio e Guarda Externa</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <Card className="border-slate-200">
            <CardContent className="p-4 space-y-3">
              <Label className="text-xs font-bold uppercase text-slate-500 leading-tight block">Perda de Domicílio (Catástrofe ou Fatalidade)</Label>
              <Textarea
                rows={4}
                placeholder="Descreva se o grupo familiar já vivenciou abrigamento por perda de moradia..."
                value={textoPerdaDomicilio}
                maxLength={PERDA_DOMICILIO_MAX}
                onChange={(e) => {
                  setTextoPerdaDomicilio(textMax(e.target.value, PERDA_DOMICILIO_MAX));
                  clearFieldError("perda_domicilio");
                }}
              />
              {!!fieldErrors.perda_domicilio && <p className="text-xs text-red-600">{fieldErrors.perda_domicilio}</p>}
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 space-y-3">
              <Label className="text-xs font-bold uppercase text-slate-500 leading-tight block">Criança/Adolescente sob Guarda de Terceiros</Label>
              <Textarea
                rows={4}
                placeholder="Registre se houve guarda (legal ou informal) por família extensa ou amigos..."
                value={textoGuardaExterna}
                maxLength={GUARDA_TERCEIROS_MAX}
                onChange={(e) => {
                  setTextoGuardaExterna(textMax(e.target.value, GUARDA_TERCEIROS_MAX));
                  clearFieldError("guarda_terceiros");
                }}
              />
              {!!fieldErrors.guarda_terceiros && <p className="text-xs text-red-600">{fieldErrors.guarda_terceiros}</p>}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <Card className="bg-amber-50/20 border-l-4 border-l-primary">
          <CardContent className="p-6">
            <Label className="text-sm mb-1 block">Outras situações de afastamento familiar</Label>
            <p className="text-xs text-slate-500 mb-4">Pode marcar mais de uma opção.</p>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                <Checkbox
                  id="prisional"
                  className="h-5 w-5 rounded-[4px] border-2 border-primary data-[state=checked]:bg-primary"
                  checked={situacaoPrisional}
                  onCheckedChange={(v) => setSituacaoPrisional(!!v)}
                />
                <Label className="font-semibold">Algum membro adulto está em instituição prisional.</Label>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                <Checkbox
                  id="socio"
                  className="h-5 w-5 rounded-[4px] border-2 border-primary data-[state=checked]:bg-primary"
                  checked={situacaoSocioeducativa}
                  onCheckedChange={(v) => setSituacaoSocioeducativa(!!v)}
                />
                <Label className="font-semibold">Algum adolescente cumpre medida socioeducativa de internação.</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <Label className="font-semibold">Observações Finais do Diagnóstico</Label>
          </div>
          <Textarea
            placeholder="Anote considerações técnicas adicionais sobre o histórico de acolhimento e afastamento familiar..."
            className="text-black min-h-[120px] placeholder:text-slate-500"
            value={observacoesFinais}
            maxLength={OBSERVACAO_FINAL_MAX}
            onChange={(e) => {
              setObservacoesFinais(textMax(e.target.value, OBSERVACAO_FINAL_MAX));
              clearFieldError("observacao");
            }}
          />
          <p className="text-[11px] text-slate-400 text-right">
            {observacoesFinais.length}/{OBSERVACAO_FINAL_MAX}
          </p>
          {!!fieldErrors.observacao && <p className="text-xs text-red-600">{fieldErrors.observacao}</p>}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
        <Button
          variant="outline"
          onClick={handleSalvarFinal}
          className="gap-2 border-slate-300"
          disabled={carregandoApi || salvandoAcolhimentoFamiliar || removendoAcolhimentoFamiliar || salvandoAcolhimentoInstitucional}
        >
          <Save className="w-4 h-4" /> {salvandoAcolhimentoInstitucional ? "Salvando..." : "Salvar Progresso"}
        </Button>
        <Button
          onClick={async () => {
            const salvou = await handleSalvarFinal();
            if (salvou) onNext();
          }}
          className="gap-2 bg-primary px-8"
          disabled={carregandoApi || salvandoAcolhimentoFamiliar || removendoAcolhimentoFamiliar || salvandoAcolhimentoInstitucional}
        >
          Salvar e avançar <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
