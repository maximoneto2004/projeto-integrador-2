import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Prontuario } from "@/types/prontuario";
import { toast } from "@/lib/sonner";
import { authStore } from "@/lib/authStore";
import { getApiErrorMessage } from "@/lib/notifications";
import {
  evolucaoAcompanhamentoService,
  type AnotacaoPlanejamentoResponse,
  type NovoIngressoResponse,
  type RegistroDesligamentoResponse,
  type EvolucaoAcompanhamentoResponse,
} from "@/services/prontuario/evolucaoAcompanhamentoService";
import {
  useAnotacaoPlanejamentoProntuario,
  useNovoIngressoProntuario,
  useRegistroDesligamentoProntuario,
  useEvolucaoAcompanhamentoProntuario,
} from "@/hooks/prontuario/useEvolucaoAcompanhamentoProntuario";
import { ChevronDown, Plus, ClipboardList, UserPlus, UserMinus, Save, ArrowRight, History } from "lucide-react";
import * as Accordion from "@radix-ui/react-accordion";
import { HoverText } from "@/utils/tooltips";

interface RegistroAcompanhamento {
  id: string;
  tipo: "ingresso" | "desligamento";
  data: string;
  motivo: string;
  observacao?: string;
}

interface Planejamento {
  id: string;
  data: string;
  tecnico: string;
  anotacao: string;
}

interface Props {
  prontuario: Prontuario | null;
  onNext: () => void;
  onSave: () => void;
}

type FieldErrors = Record<string, string>;

type AuthUserSession = {
  id?: string;
  nome?: string;
  email?: string;
};

const PLANEJAMENTO_ANOTACAO_MAX = 600;
const EVENTO_MOTIVO_MAX = 250;
const EVENTO_OBSERVACAO_MAX = 600;

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
    if (result && typeof result === "object" && Array.isArray((result as { results?: unknown[] }).results)) {
      return ((result as { results?: unknown[] }).results || []) as T[];
    }
  }
  if (payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown[] }).results)) {
    return ((payload as { results?: unknown[] }).results || []) as T[];
  }
  return [];
};

const formatDateBR = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw) return "-";

  const datePart = raw.includes("T") ? raw.split("T")[0] : raw.split(" ")[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [y, m, d] = datePart.split("-");
    return `${d}/${m}/${y}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;

  return raw;
};

const getSessionUser = (): AuthUserSession | null => {
  const raw = sessionStorage.getItem("auth_user_session");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUserSession;
  } catch {
    return null;
  }
};

const resolveTecnico = (value: unknown, fallback: string) => {
  if (!value) return fallback;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return String(obj.nome || "") || String(obj.nome_completo || "") || String(obj.username || "") || String(obj.email || "") || fallback;
  }
  const raw = String(value);
  if (/^[0-9a-fA-F-]{32,36}$/.test(raw)) return fallback;
  return raw || fallback;
};

const mapPlanejamento = (item: AnotacaoPlanejamentoResponse, tecnicoFallback: string): Planejamento => ({
  id: String(item.id || ""),
  data: String(item.created_at || ""),
  tecnico: resolveTecnico(item.tecnico_responsavel, tecnicoFallback),
  anotacao: String(item.anotacao || ""),
});

const mapIngresso = (item: NovoIngressoResponse): RegistroAcompanhamento => ({
  id: String(item.id || ""),
  tipo: "ingresso",
  data: String(item.data_ingresso || ""),
  motivo: String(item.motivo || ""),
  observacao: String(item.observacoes || ""),
});

const mapDesligamento = (item: RegistroDesligamentoResponse): RegistroAcompanhamento => ({
  id: String(item.id || ""),
  tipo: "desligamento",
  data: String(item.data_desligamento || ""),
  motivo: String(item.motivo || ""),
  observacao: String(item.observacoes || ""),
});

export function EvolucaoFamiliar({ prontuario, onNext, onSave }: Props) {
  const [searchParams] = useSearchParams();

  const cpfRef = useMemo(() => normalizeCpf(prontuario?.membros.find((m) => m.id === prontuario?.pessoaReferenciaId)?.cpf || ""), [prontuario]);
  const prontuarioId = useMemo(
    () => searchParams.get("prontuarioId") || (cpfRef ? localStorage.getItem(`prontuarioIdByCpf:${cpfRef}`) || "" : ""),
    [searchParams, cpfRef],
  );

  const sessionUser = getSessionUser();
  const mockUser = authStore.getCurrentUser();
  const tecnicoId = String(sessionUser?.id || mockUser?.id || "");
  const tecnicoNome = String(sessionUser?.nome || mockUser?.nome || mockUser?.username || "Técnico responsável");

  const { mutateAsync: salvarPlanejamento, isPending: salvandoPlanejamento } = useAnotacaoPlanejamentoProntuario();
  const { mutateAsync: salvarIngresso, isPending: salvandoIngresso } = useNovoIngressoProntuario();
  const { mutateAsync: salvarDesligamento, isPending: salvandoDesligamento } = useRegistroDesligamentoProntuario();
  const { mutateAsync: salvarEvolucao, isPending: salvandoEvolucao } = useEvolucaoAcompanhamentoProntuario();

  const [carregandoApi, setCarregandoApi] = useState(false);
  const [evolucaoId, setEvolucaoId] = useState("");

  const [registros, setRegistros] = useState<RegistroAcompanhamento[]>([]);
  const [planejamentos, setPlanejamentos] = useState<Planejamento[]>([]);
  const [paginaAtualPlanejamentos, setPaginaAtualPlanejamentos] = useState(1);
  const [paginaAtualRegistros, setPaginaAtualRegistros] = useState(1);

  const [ingresso, setIngresso] = useState({
    data: "",
    motivo: "",
    observacao: "",
  });
  const [desligamento, setDesligamento] = useState({
    data: "",
    motivo: "",
    observacao: "",
  });
  const [novoPlanejamento, setNovoPlanejamento] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const pageSizePlanejamentos = 5;
  const totalPaginasPlanejamentos = Math.max(1, Math.ceil(planejamentos.length / pageSizePlanejamentos));
  const planejamentosPaginados = planejamentos.slice(
    (paginaAtualPlanejamentos - 1) * pageSizePlanejamentos,
    paginaAtualPlanejamentos * pageSizePlanejamentos,
  );
  const pageSizeRegistros = 5;
  const totalPaginasRegistros = Math.max(1, Math.ceil(registros.length / pageSizeRegistros));
  const registrosPaginados = registros.slice((paginaAtualRegistros - 1) * pageSizeRegistros, paginaAtualRegistros * pageSizeRegistros);

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
        const [planejamentoRes, ingressoRes, desligamentoRes, evolucaoRes] = await Promise.all([
          evolucaoAcompanhamentoService.listarAnotacaoPlanejamento({
            prontuario: prontuarioId,
          }),
          evolucaoAcompanhamentoService.listarNovoIngresso({
            prontuario: prontuarioId,
          }),
          evolucaoAcompanhamentoService.listarRegistroDesligamento({
            prontuario: prontuarioId,
          }),
          evolucaoAcompanhamentoService.listarEvolucaoAcompanhamento({
            prontuario: prontuarioId,
          }),
        ]);

        const planejamentoLista = parseApiList<AnotacaoPlanejamentoResponse>(planejamentoRes.data).filter(
          (item) => String(item.prontuario) === String(prontuarioId),
        );
        const ingressoLista = parseApiList<NovoIngressoResponse>(ingressoRes.data).filter((item) => String(item.prontuario) === String(prontuarioId));
        const desligamentoLista = parseApiList<RegistroDesligamentoResponse>(desligamentoRes.data).filter(
          (item) => String(item.prontuario) === String(prontuarioId),
        );
        const evolucaoLista = parseApiList<EvolucaoAcompanhamentoResponse>(evolucaoRes.data).filter(
          (item) => String(item.prontuario) === String(prontuarioId),
        );

        const ingressoMaisRecente = [...ingressoLista].sort((a, b) => String(b.data_ingresso || "").localeCompare(String(a.data_ingresso || "")))[0];
        const desligamentoMaisRecente = [...desligamentoLista].sort((a, b) =>
          String(b.data_desligamento || "").localeCompare(String(a.data_desligamento || "")),
        )[0];
        const primeiraEvolucao = evolucaoLista[0];

        const planejamentosOrdenados = [...planejamentoLista]
          .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
          .map((item) => mapPlanejamento(item, tecnicoNome));
        setPlanejamentos(planejamentosOrdenados);

        const timeline: RegistroAcompanhamento[] = [...ingressoLista.map(mapIngresso), ...desligamentoLista.map(mapDesligamento)].sort((a, b) =>
          String(b.data).localeCompare(String(a.data)),
        );
        if (ingressoMaisRecente) {
          setIngresso({
            data: String(ingressoMaisRecente.data_ingresso || ""),
            motivo: String(ingressoMaisRecente.motivo || ""),
            observacao: String(ingressoMaisRecente.observacoes || ""),
          });
        }

        if (desligamentoMaisRecente) {
          setDesligamento({
            data: String(desligamentoMaisRecente.data_desligamento || ""),
            motivo: String(desligamentoMaisRecente.motivo || ""),
            observacao: String(desligamentoMaisRecente.observacoes || ""),
          });
        }

        setRegistros(timeline);

        if (primeiraEvolucao) {
          setEvolucaoId(String(primeiraEvolucao.id || ""));
        } else {
          setEvolucaoId("");
        }
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Não foi possível carregar evolução do acompanhamento."));
      } finally {
        setCarregandoApi(false);
      }
    };

    load();
  }, [prontuarioId, tecnicoNome]);

  useEffect(() => {
    setPaginaAtualPlanejamentos((prev) => Math.min(prev, totalPaginasPlanejamentos));
  }, [totalPaginasPlanejamentos]);

  useEffect(() => {
    setPaginaAtualRegistros((prev) => Math.min(prev, totalPaginasRegistros));
  }, [totalPaginasRegistros]);

  const handleAddPlanejamento = async () => {
    setFieldErrors({});
    if (!prontuarioId) {
      toast.error("Prontuário não identificado na URL.");
      return;
    }
    if (!novoPlanejamento.trim()) {
      setFieldErrors({ anotacao: "Descreva o planejamento." });
      toast.error("Descreva o planejamento.");
      return;
    }
    if (!tecnicoId) {
      setFieldErrors({ tecnico_responsavel: "Não foi possível identificar o técnico responsável." });
      toast.error("Não foi possível identificar o técnico responsável logado.");
      return;
    }

    try {
      const salvo = await salvarPlanejamento({
        payload: {
          prontuario: prontuarioId,
          anotacao: textMax(novoPlanejamento.trim(), PLANEJAMENTO_ANOTACAO_MAX),
          tecnico_responsavel: tecnicoId,
        },
      });

      if (!salvo) return;

      const novo = mapPlanejamento(salvo, tecnicoNome);
      setPlanejamentos((prev) => [novo, ...prev.filter((item) => item.id !== novo.id)]);
      setPaginaAtualPlanejamentos(1);
      setNovoPlanejamento("");
      toast.success("Planejamento registrado.");
    } catch (err) {
      const apiErrors = extractFieldErrors(err, new Set(["anotacao", "tecnico_responsavel", "prontuario"]));
      if (Object.keys(apiErrors).length) {
        setFieldErrors(apiErrors);
        toast.error("Encontramos erros no formulário. Revise os campos destacados e tente novamente.");
        return;
      }
      toast.error(getApiErrorMessage(err, "Não foi possível salvar planejamento."));
    }
  };

  const handleRegistrarEvento = async (tipo: "ingresso" | "desligamento") => {
    setFieldErrors({});
    if (!prontuarioId) {
      toast.error("Prontuário não identificado na URL.");
      return;
    }

    const dados = tipo === "ingresso" ? ingresso : desligamento;
    if (!dados.data || !dados.motivo) {
      const nextErrors: FieldErrors = {};
      if (!dados.data) {
        nextErrors[tipo === "ingresso" ? "data_ingresso" : "data_desligamento"] =
          tipo === "ingresso" ? "Informe a data de ingresso." : "Informe a data de desligamento.";
      }
      if (!dados.motivo) nextErrors.motivo = "Informe o motivo.";
      setFieldErrors(nextErrors);
      toast.error("Preencha data e motivo.");
      return;
    }

    try {
      const salvo =
        tipo === "ingresso"
          ? await salvarIngresso({
              payload: {
                prontuario: prontuarioId,
                data_ingresso: dados.data,
                motivo: textMax(dados.motivo, EVENTO_MOTIVO_MAX),
                observacoes: textMax(dados.observacao || "", EVENTO_OBSERVACAO_MAX) || undefined,
              },
            })
          : await salvarDesligamento({
              payload: {
                prontuario: prontuarioId,
                data_desligamento: dados.data,
                motivo: textMax(dados.motivo, EVENTO_MOTIVO_MAX),
                observacoes: textMax(dados.observacao || "", EVENTO_OBSERVACAO_MAX) || undefined,
              },
            });

      if (!salvo) return;

      const novoRegistro = tipo === "ingresso" ? mapIngresso(salvo as NovoIngressoResponse) : mapDesligamento(salvo as RegistroDesligamentoResponse);

      if (tipo === "ingresso") {
        setIngresso({
          data: novoRegistro.data,
          motivo: novoRegistro.motivo,
          observacao: novoRegistro.observacao || "",
        });
      } else {
        setDesligamento({
          data: novoRegistro.data,
          motivo: novoRegistro.motivo,
          observacao: novoRegistro.observacao || "",
        });
      }

      setRegistros((prev) => {
        const semMesmoId = prev.filter((item) => item.id !== novoRegistro.id);
        return [novoRegistro, ...semMesmoId].sort((a, b) => String(b.data).localeCompare(String(a.data)));
      });
      setPaginaAtualRegistros(1);

      toast.success(tipo === "ingresso" ? "Registro de ingresso confirmado com sucesso." : "Registro de desligamento confirmado com sucesso.");
    } catch (err) {
      const apiErrors = extractFieldErrors(
        err,
        new Set([tipo === "ingresso" ? "data_ingresso" : "data_desligamento", "motivo", "observacoes", "prontuario"]),
      );
      if (Object.keys(apiErrors).length) {
        setFieldErrors(apiErrors);
        toast.error("Encontramos erros no formulário. Revise os campos destacados e tente novamente.");
        return;
      }
      toast.error(getApiErrorMessage(err, `Não foi possível salvar ${tipo === "ingresso" ? "ingresso" : "desligamento"}.`));
    }
  };

  const handleSalvarFinal = async (): Promise<boolean> => {
    setFieldErrors({});
    if (!prontuarioId) {
      toast.error("Prontuário não identificado na URL.");
      return;
    }

    try {
      const planejamentoIds = planejamentos.map((item) => item.id).filter(Boolean);
      const ingressoIds = registros
        .filter((item) => item.tipo === "ingresso")
        .map((item) => item.id)
        .filter(Boolean);
      const desligamentoIds = registros
        .filter((item) => item.tipo === "desligamento")
        .map((item) => item.id)
        .filter(Boolean);

      const salvo = await salvarEvolucao({
        id: evolucaoId || undefined,
        payload: {
          prontuario: prontuarioId,
          anotacao_acompanhamento: planejamentoIds,
          novo_ingresso: ingressoIds,
          registros_desligamentos: desligamentoIds,
        },
      });

      if (salvo?.id) setEvolucaoId(String(salvo.id));
      toast.success("Evolução salva com sucesso.");
      onSave();
      return true;
    } catch (err) {
      const apiErrors = extractFieldErrors(err, new Set(["anotacao_acompanhamento", "novo_ingresso", "registros_desligamentos", "prontuario"]));
      if (Object.keys(apiErrors).length) {
        setFieldErrors(apiErrors);
        toast.error("Encontramos erros no formulário. Revise os campos destacados e tente novamente.");
        return false;
      }
      toast.error(getApiErrorMessage(err, "Não foi possível salvar evolução do acompanhamento."));
      return false;
    }
  };

  const bloqueado = carregandoApi || salvandoPlanejamento || salvandoIngresso || salvandoDesligamento || salvandoEvolucao;

  return (
    <div className="space-y-10 pb-20">
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Planejamento Inicial e Estratégias</h3>
        </div>

        <Card className="border border-l-4 border-l-primary">
          <CardContent className="p-6 space-y-6">
            <div className="border p-4 rounded-lg text-sm leading-relaxed">
              O planejamento deve ser <strong>dialogado com a família</strong>, identificando objetivos, ações e estratégias para potencializar a
              autonomia dos membros.
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase text-slate-500">Nova Anotação de Planejamento</Label>
              <div className="grid">
                <Textarea
                  placeholder="Descreva aqui os objetivos e metas pactuadas..."
                  className="min-h-[120px] pb-12 focus:ring-emerald-500"
                  maxLength={PLANEJAMENTO_ANOTACAO_MAX}
                  value={novoPlanejamento}
                  onChange={(e) => {
                    setNovoPlanejamento(textMax(e.target.value, PLANEJAMENTO_ANOTACAO_MAX));
                    clearFieldError("anotacao");
                  }}
                />
                <p className="text-[11px] text-slate-400 text-right mt-1">
                  {novoPlanejamento.length}/{PLANEJAMENTO_ANOTACAO_MAX}
                </p>
                {!!fieldErrors.anotacao && <p className="text-xs text-red-600 mt-1">{fieldErrors.anotacao}</p>}
                <Button onClick={handleAddPlanejamento} className="col-span-full justify-self-end hover:bg-blue-700 gap-2 mt-6" disabled={bloqueado}>
                  <Plus className="w-4 h-4" /> {salvandoPlanejamento ? "Salvando..." : "Adicionar ao Histórico"}
                </Button>
              </div>
            </div>

            {planejamentos.length > 0 && (
              <div className="space-y-4 border-t pt-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <History className="text-xs font-bold text-slate-500 uppercase px-1" /> Histórico de Planejamentos
                </h4>
                <div className="mt-4 border rounded-lg overflow-hidden">
                  <table className="w-full table-fixed text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="w-28 px-4 py-2 text-left font-semibold">Data</th>
                        <th className="w-48 px-4 py-2 text-left font-semibold">Técnico</th>
                        <th className="px-4 py-2 text-left font-semibold">Anotação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-50">
                      {planejamentosPaginados.map((p) => (
                        <tr key={p.id} className="bg-white hover:bg-purple-50/20">
                          <td className="px-4 py-2 text-slate-600 text-xs">{formatDateBR(p.data)}</td>
                          <td className="px-4 py-2 font-medium text-slate-700">{p.tecnico || "-"}</td>
                          <td className="max-w-0 px-4 py-2 text-slate-700">
                            <HoverText text={p.anotacao || "-"} cellClassName="font-medium" tooltipClassName="max-w-[420px]" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-end gap-2 px-4 py-4 border-t bg-white">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaAtualPlanejamentos((prev) => Math.max(1, prev - 1))}
                      disabled={paginaAtualPlanejamentos === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Página {paginaAtualPlanejamentos} / {totalPaginasPlanejamentos}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaAtualPlanejamentos((prev) => Math.min(totalPaginasPlanejamentos, prev + 1))}
                      disabled={paginaAtualPlanejamentos >= totalPaginasPlanejamentos}
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
          <History className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Fluxo de Acompanhamento (PAIF/PAEFI)</h3>
        </div>

        <Accordion.Root type="multiple" className="w-full">
          <Accordion.Item value="ingresso" className="border-b last:border-0">
            <Accordion.Header>
              <Accordion.Trigger className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all group">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-5 h-5 text-primary" />
                  <span className="font-bold text-sm uppercase tracking-wide">Registrar Novo Ingresso</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 group-data-[state=open]:rotate-180 transition-transform" />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="p-6 bg-slate-50/50 border-t space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase">Data de Ingresso</Label>
                  <Input
                    type="date"
                    value={ingresso.data}
                    onChange={(e) => {
                      setIngresso({ ...ingresso, data: e.target.value });
                      clearFieldError("data_ingresso");
                    }}
                  />
                  {!!fieldErrors.data_ingresso && <p className="text-xs text-red-600">{fieldErrors.data_ingresso}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase">Motivo/Forma de Ingresso</Label>
                  <Input
                    maxLength={EVENTO_MOTIVO_MAX}
                    onChange={(e) => {
                      setIngresso({ ...ingresso, motivo: textMax(e.target.value, EVENTO_MOTIVO_MAX) });
                      clearFieldError("motivo");
                    }}
                    placeholder="Ex: Demanda espontânea, busca ativa..."
                  />
                  {!!fieldErrors.motivo && <p className="text-xs text-red-600">{fieldErrors.motivo}</p>}
                </div>
                <div className="col-span-full space-y-2">
                  <Label className="text-xs font-bold uppercase">Observações do Ingresso</Label>
                  <Textarea
                    maxLength={EVENTO_OBSERVACAO_MAX}
                    onChange={(e) => {
                      setIngresso({ ...ingresso, observacao: textMax(e.target.value, EVENTO_OBSERVACAO_MAX) });
                      clearFieldError("observacoes");
                    }}
                    placeholder="Detalhes sobre a recepção da família..."
                    rows={2}
                  />
                  <p className="text-[11px] text-slate-400 text-right">
                    {ingresso.observacao.length}/{EVENTO_OBSERVACAO_MAX}
                  </p>
                  {!!fieldErrors.observacoes && <p className="text-xs text-red-600">{fieldErrors.observacoes}</p>}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => handleRegistrarEvento("ingresso")} className="w-1/2 bg-amber-600 hover:bg-amber-700" disabled={bloqueado}>
                  {salvandoIngresso ? "Salvando..." : "Confirmar Registro de Ingresso"}
                </Button>
              </div>
            </Accordion.Content>
          </Accordion.Item>

          <Accordion.Item value="desligamento" className="border-b last:border-0">
            <Accordion.Header>
              <Accordion.Trigger className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all group">
                <div className="flex items-center gap-3">
                  <UserMinus className="w-5 h-5 text-primary" />
                  <span className="font-bold text-sm uppercase tracking-wide">Registrar Desligamento</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 group-data-[state=open]:rotate-180 transition-transform" />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="p-6 bg-slate-50/50 border-t space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase">Data de Desligamento</Label>
                  <Input
                    type="date"
                    value={desligamento.data}
                    onChange={(e) => {
                      setDesligamento({ ...desligamento, data: e.target.value });
                      clearFieldError("data_desligamento");
                    }}
                  />
                  {!!fieldErrors.data_desligamento && <p className="text-xs text-red-600">{fieldErrors.data_desligamento}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase">Motivo do Desligamento</Label>
                  <Select
                    value={desligamento.motivo}
                    onValueChange={(v) => {
                      setDesligamento({ ...desligamento, motivo: v });
                      clearFieldError("motivo");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o motivo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="METAS">1 - Avaliação técnica (metas atingidas)</SelectItem>
                      <SelectItem value="EVASAO">2 - Evasão ou recusa da família</SelectItem>
                      <SelectItem value="MUDANCA">3 - Mudança de município</SelectItem>
                      <SelectItem value="OUTRO">4 - Outros (especificar em observações)</SelectItem>
                    </SelectContent>
                  </Select>
                  {!!fieldErrors.motivo && <p className="text-xs text-red-600">{fieldErrors.motivo}</p>}
                </div>
                <div className="col-span-full space-y-2">
                  <Label className="text-xs font-bold uppercase">Observações do Desligamento</Label>
                  <Textarea
                    maxLength={EVENTO_OBSERVACAO_MAX}
                    onChange={(e) => {
                      setDesligamento({
                        ...desligamento,
                        observacao: textMax(e.target.value, EVENTO_OBSERVACAO_MAX),
                      });
                      clearFieldError("observacoes");
                    }}
                    placeholder="Justificativa técnica para o encerramento do acompanhamento..."
                    rows={2}
                  />
                  <p className="text-[11px] text-slate-400 text-right">
                    {desligamento.observacao.length}/{EVENTO_OBSERVACAO_MAX}
                  </p>
                  {!!fieldErrors.observacoes && <p className="text-xs text-red-600">{fieldErrors.observacoes}</p>}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => handleRegistrarEvento("desligamento")} className="w-1/2 bg-amber-600 hover:bg-amber-700" disabled={bloqueado}>
                  {salvandoDesligamento ? "Salvando..." : "Confirmar Registro de Desligamento"}
                </Button>
              </div>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>

        {registros.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase px-1">Histórico do Acompanhamento</h4>
            <div className="border rounded-lg overflow-hidden border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Tipo</th>
                      <th className="px-4 py-2 text-left font-semibold">Data</th>
                      <th className="px-4 py-2 text-left font-semibold">Motivo</th>
                      <th className="px-4 py-2 text-left font-semibold">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosPaginados.map((r) => (
                      <tr key={r.id} className="border-b last:border-b-0">
                        <td className="px-4 py-2 font-medium">{r.tipo === "ingresso" ? "Ingresso" : "Desligamento"}</td>
                        <td className="px-4 py-2 text-slate-600">{formatDateBR(r.data)}</td>
                        <td className="px-4 py-2 text-slate-700">{r.motivo || "-"}</td>
                        <td className="max-w-0 px-4 py-2 text-slate-700">
                          {" "}
                          <HoverText text={r.observacao || "-"} cellClassName="font-medium" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-end gap-2 px-4 py-4 border-t bg-white">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaAtualRegistros((p) => Math.max(1, p - 1))}
                  disabled={paginaAtualRegistros === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {paginaAtualRegistros} / {totalPaginasRegistros}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaginaAtualRegistros((p) => Math.min(totalPaginasRegistros, p + 1))}
                  disabled={paginaAtualRegistros >= totalPaginasRegistros}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
        <Button variant="outline" onClick={handleSalvarFinal} className="gap-2 border-slate-300" disabled={bloqueado}>
          <Save className="w-4 h-4" /> {salvandoEvolucao ? "Salvando..." : "Salvar Evolução"}
        </Button>
        <Button
          onClick={async () => {
            const salvou = await handleSalvarFinal();
            if (salvou) onNext();
          }}
          className="gap-2 bg-primary px-8"
          disabled={bloqueado}
        >
          Salvar e avaçar <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
