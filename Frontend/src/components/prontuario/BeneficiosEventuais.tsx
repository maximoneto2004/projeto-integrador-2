import { type WheelEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Gift, Users, Save, ArrowRight, Info, Pencil, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "@/lib/sonner";
import { getApiErrorMessage } from "@/lib/notifications";
import { sanitizeTextInputValue } from "@/lib/textSanitizer";
import type { Prontuario } from "@/types/prontuario";
import {
  beneficiosServicosService,
  type BeneficioEventualResponse,
  type BeneficiosServicosResponse,
  type ChoiceOption,
  type ConvivenciaFortalecimentoResponse,
} from "@/services/prontuario/beneficiosServicosService";
import { membroComposicaoService, type MembroComposicaoResponse } from "@/services/prontuario/membroComposicaoService";
import { HoverText } from "@/utils/tooltips";

interface Props {
  prontuario: Prontuario | null;
  onNext: () => void;
  onSave: () => void;
}

type FieldErrors = Record<string, string>;

type BeneficioItem = {
  id: string;
  tipo: string;
  data: string;
  observacoes: string;
  registroNascimento?: string;
  cpfFalecido?: string;
};

type NovoBeneficio = {
  tipo: string;
  data: string;
  observacoes: string;
  registroNascimento: string;
  cpfFalecido: string;
};

type BeneficioEmEdicao = {
  id: string;
  tipo: string;
  data: string;
  observacoes: string;
  registroNascimento: string;
  cpfFalecido: string;
};

type ParticipacaoItem = {
  id: string;
  membroId: string;
  servico: string;
  dataInicio: string;
  unidadeRealizacao: string;
};

type NovaParticipacao = {
  membroId: string;
  servico: string;
  dataInicio: string;
  unidadeRealizacao: string;
};

type ItemParaExcluir = {
  id: string;
  tipo: "benefício" | "participação";
  descricao: string;
};

const TIPO_BENEFICIO_OPTIONS = [
  { value: "NATALIDADE", label: "Auxílio Natalidade" },
  { value: "FUNERAL", label: "Auxílio Funeral" },
  { value: "EMERGENCIA", label: "Item/Kit Emergência" },
  { value: "BASICA", label: "Cesta Básica" },
  { value: "ALUGUEL", label: "Aluguel Social" },
];

const BENEFICIO_OBSERVACAO_MAX = 600;
const BENEFICIO_REGISTRO_NASCIMENTO_MAX = 150;
const BENEFICIO_CPF_FALECIDO_MAX = 15;
const SERVICO_NOME_MAX = 20;

const parseApiList = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "result" in payload) {
    const result = (payload as { result?: unknown }).result;
    if (Array.isArray(result)) return result as T[];
  }
  return [];
};

const parseApiObject = <T,>(payload: unknown): T | null => {
  if (!payload) return null;
  if (payload && typeof payload === "object" && "result" in payload) {
    const result = (payload as { result?: unknown }).result;
    if (result && typeof result === "object") return result as T;
  }
  if (payload && typeof payload === "object") return payload as T;
  return null;
};

const digitsOnly = (value?: string) => (value || "").replace(/\D/g, "");
const digitsMax = (value: string, max: number) => digitsOnly(value).slice(0, max);
const normalizeCpf = (value?: string) => digitsOnly(value);

const maskCpf = (value?: string) => {
  const v = digitsMax(value || "", 11);
  const a = v.slice(0, 3);
  const b = v.slice(3, 6);
  const c = v.slice(6, 9);
  const d = v.slice(9, 11);
  if (v.length <= 3) return a;
  if (v.length <= 6) return `${a}.${b}`;
  if (v.length <= 9) return `${a}.${b}.${c}`;
  return `${a}.${b}.${c}-${d}`;
};

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
const formatDate = (value?: string) => (value ? value.split("-").reverse().join("/") : "-");
const getBeneficioDocumento = (beneficio: BeneficioItem) => {
  if (beneficio.tipo === "NATALIDADE") return beneficio.registroNascimento || "-";
  return beneficio.cpfFalecido || "-";
};

export function BeneficiosEventuais({ prontuario, onNext, onSave }: Props) {
  const [searchParams] = useSearchParams();
  const membros = useMemo(() => prontuario?.membros || [], [prontuario]);
  const cpfRef = useMemo(() => normalizeCpf(prontuario?.membros.find((m) => m.id === prontuario?.pessoaReferenciaId)?.cpf || ""), [prontuario]);
  const prontuarioId = useMemo(
    () => searchParams.get("prontuarioId") || (cpfRef ? localStorage.getItem(`prontuarioIdByCpf:${cpfRef}`) || "" : ""),
    [searchParams, cpfRef],
  );

  const [beneficios, setBeneficios] = useState<BeneficioItem[]>([]);
  const [novoBeneficio, setNovoBeneficio] = useState<NovoBeneficio>({
    tipo: "",
    data: "",
    observacoes: "",
    registroNascimento: "",
    cpfFalecido: "",
  });

  const [participacoes, setParticipacoes] = useState<ParticipacaoItem[]>([]);
  const [novaParticipacao, setNovaParticipacao] = useState<NovaParticipacao>({
    membroId: "",
    servico: "",
    dataInicio: "",
    unidadeRealizacao: "",
  });
  const [membroParticipacaoOpen, setMembroParticipacaoOpen] = useState(false);

  const [beneficiosServicosId, setBeneficiosServicosId] = useState("");
  const [membroIdByCidadaoId, setMembroIdByCidadaoId] = useState<Record<string, string>>({});
  const [cidadaoIdByMembroId, setCidadaoIdByMembroId] = useState<Record<string, string>>({});
  const [unidadeRealizacaoOptions, setUnidadeRealizacaoOptions] = useState<ChoiceOption[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvandoBeneficio, setSalvandoBeneficio] = useState(false);
  const [salvandoEdicaoBeneficio, setSalvandoEdicaoBeneficio] = useState(false);
  const [salvandoParticipacao, setSalvandoParticipacao] = useState(false);
  const [salvandoGeral, setSalvandoGeral] = useState(false);
  const [beneficioFieldErrors, setBeneficioFieldErrors] = useState<FieldErrors>({});
  const [participacaoFieldErrors, setParticipacaoFieldErrors] = useState<FieldErrors>({});
  const [itemParaExcluir, setItemParaExcluir] = useState<ItemParaExcluir | null>(null);
  const [removendoItem, setRemovendoItem] = useState(false);
  const [beneficioEmEdicao, setBeneficioEmEdicao] = useState<BeneficioEmEdicao | null>(null);

  const clearBeneficioFieldError = (...fields: string[]) => {
    setBeneficioFieldErrors((prev) => {
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

  const clearParticipacaoFieldError = (...fields: string[]) => {
    setParticipacaoFieldErrors((prev) => {
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

  const [paginaAtualBeneficios, setPaginaAtualBeneficios] = useState(1);
  const pageSize = 5;
  const totalItensBeneficios = beneficios.length;
  const totalPaginasBeneficios = Math.max(1, Math.ceil(totalItensBeneficios / pageSize));

  const [paginaAtualServicos, setPaginaAtualServicos] = useState(1);
  const totalItensServicos = participacoes.length;
  const totalPaginasServicos = Math.max(1, Math.ceil(totalItensServicos / pageSize));

  const tipoBeneficioLabel = useMemo(
    () => TIPO_BENEFICIO_OPTIONS.reduce<Record<string, string>>((acc, item) => ({ ...acc, [item.value]: item.label }), {}),
    [],
  );
  const unidadeRealizacaoLabel = useMemo(
    () => unidadeRealizacaoOptions.reduce<Record<string, string>>((acc, item) => ({ ...acc, [item.value]: item.label }), {}),
    [unidadeRealizacaoOptions],
  );
  const membroParticipacaoLabel = useMemo(
    () => membros.find((m) => String(m.id) === String(novaParticipacao.membroId))?.nome || "",
    [membros, novaParticipacao.membroId],
  );

  const handleWheelOnCommandList = (event: WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    container.scrollTop += event.deltaY;
    event.preventDefault();
    event.stopPropagation();
  };

  useEffect(() => {
    if (!prontuarioId) return;

    const load = async () => {
      setCarregando(true);
      try {
        const [beneficiosRes, convivenciaRes, beneficiosServicosRes, composicaoRes, unidadeRealizacaoRes] = await Promise.all([
          beneficiosServicosService.listarBeneficiosEventuais({ prontuario: prontuarioId }),
          beneficiosServicosService.listarConvivenciaFortalecimento({ prontuario: prontuarioId }),
          beneficiosServicosService.listarBeneficiosServicos({ prontuario: prontuarioId }),
          membroComposicaoService.listar({ prontuario: prontuarioId }),
          beneficiosServicosService.listarUnidadeRealizacaoOpcoes(),
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

        const beneficiosLista = parseApiList<BeneficioEventualResponse>(beneficiosRes.data)
          .filter((item) => String(item.prontuario) === String(prontuarioId))
          .map((item) => ({
            id: String(item.id),
            tipo: String(item.beneficio || ""),
            data: String(item.data_beneficio || item.created_at || "").slice(0, 10),
            observacoes: String(item.observacao || ""),
            registroNascimento: String(item.registro_nascimento || ""),
            cpfFalecido: String(item.cpf_falecido || ""),
          }));
        setBeneficios(beneficiosLista);

        const convivenciaLista = parseApiList<ConvivenciaFortalecimentoResponse>(convivenciaRes.data)
          .filter((item) => String(item.prontuario) === String(prontuarioId))
          .map((item) => {
            const membro = item.membro;
            const membroComposicaoId = String((membro && typeof membro === "object" ? (membro as { id?: unknown }).id : membro) ?? "");
            return {
              id: String(item.id),
              membroId: String(byMembro[membroComposicaoId] || membroComposicaoId),
              servico: String(item.servico || ""),
              dataInicio: String(item.data_inicio || ""),
              unidadeRealizacao: String(item.unidade_realizacao || ""),
            };
          });
        setParticipacoes(convivenciaLista);

        const beneficiosServicosLista = parseApiList<BeneficiosServicosResponse>(beneficiosServicosRes.data).filter(
          (item) => String(item.prontuario) === String(prontuarioId),
        );
        if (beneficiosServicosLista.length > 0) {
          setBeneficiosServicosId(String(beneficiosServicosLista[beneficiosServicosLista.length - 1].id || ""));
        }

        const unidadeOptions = parseApiList<ChoiceOption>(unidadeRealizacaoRes.data).filter((item) => item && item.value && item.label);
        setUnidadeRealizacaoOptions(unidadeOptions);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Não foi possível carregar benefícios e serviços."));
      } finally {
        setCarregando(false);
      }
    };

    load();
  }, [prontuarioId]);

  const syncBeneficiosServicos = async (listaBeneficios: BeneficioItem[], listaParticipacoes: ParticipacaoItem[]) => {
    if (!prontuarioId) return;
    const payload = {
      prontuario: prontuarioId,
      beneficios_eventuais: listaBeneficios.map((b) => String(b.id)),
      convivencia_e_fortalecimento: listaParticipacoes.map((p) => String(p.id)),
    };
    const response = beneficiosServicosId
      ? await beneficiosServicosService.atualizarBeneficiosServicos(beneficiosServicosId, payload)
      : await beneficiosServicosService.criarBeneficiosServicos(payload);
    const salvo = parseApiObject<BeneficiosServicosResponse>(response.data);
    if (salvo?.id) setBeneficiosServicosId(String(salvo.id));
  };

  const handleAddBeneficio = async () => {
    setBeneficioFieldErrors({});
    if (!prontuarioId) {
      toast.error("Prontuário não identificado na URL.");
      return;
    }
    if (!novoBeneficio.tipo) {
      setBeneficioFieldErrors({ beneficio: "Selecione o tipo do benefício." });
      toast.error("Selecione o tipo do benefício.");
      return;
    }

    setSalvandoBeneficio(true);
    try {
      const response = await beneficiosServicosService.criarBeneficioEventual({
        prontuario: prontuarioId,
        beneficio: novoBeneficio.tipo,
        data_beneficio: novoBeneficio.data || undefined,
        observacao: novoBeneficio.observacoes.trim() || undefined,
        registro_nascimento: novoBeneficio.tipo === "NATALIDADE" ? novoBeneficio.registroNascimento.trim() || undefined : undefined,
        cpf_falecido: novoBeneficio.tipo === "FUNERAL" ? novoBeneficio.cpfFalecido.trim() || undefined : undefined,
      });
      const salvo = parseApiObject<BeneficioEventualResponse>(response.data);
      if (!salvo?.id) return;

      const novoItem: BeneficioItem = {
        id: String(salvo.id),
        tipo: String(salvo.beneficio || novoBeneficio.tipo),
        data: String(salvo.data_beneficio || novoBeneficio.data || salvo.created_at || "").slice(0, 10),
        observacoes: String(salvo.observacao || novoBeneficio.observacoes || ""),
        registroNascimento: String(salvo.registro_nascimento || novoBeneficio.registroNascimento || ""),
        cpfFalecido: maskCpf(String(salvo.cpf_falecido || novoBeneficio.cpfFalecido || "")),
      };

      setBeneficios((prev) => [...prev, novoItem]);
      setNovoBeneficio({ tipo: "", data: "", observacoes: "", registroNascimento: "", cpfFalecido: "" });
      toast.success("Benefício adicionado com sucesso.");
    } catch (err) {
      const apiErrors = extractFieldErrors(
        err,
        new Set(["beneficio", "data_beneficio", "observacao", "registro_nascimento", "cpf_falecido", "prontuario"]),
      );
      if (Object.keys(apiErrors).length) {
        setBeneficioFieldErrors(apiErrors);
        toast.error("Encontramos erros no formulário. Revise os campos destacados e tente novamente.");
        return;
      }
      toast.error(getApiErrorMessage(err, "Não foi possível adicionar o benefício."));
    } finally {
      setSalvandoBeneficio(false);
    }
  };

  const handleRemoveBeneficio = async (id: string) => {
    try {
      await beneficiosServicosService.removerBeneficioEventual(id);
      setBeneficios((prev) => prev.filter((item) => item.id !== id));
      toast.success("Benefício removido.");
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível remover o benefício."));
      return false;
    }
  };

  const abrirEdicaoBeneficio = (item: BeneficioItem) => {
    setBeneficioEmEdicao({
      id: item.id,
      tipo: item.tipo,
      data: item.data || "",
      observacoes: item.observacoes || "",
      registroNascimento: item.registroNascimento || "",
      cpfFalecido: maskCpf(item.cpfFalecido || ""),
    });
  };

  const handleSalvarEdicaoBeneficio = async () => {
    if (!beneficioEmEdicao) return;
    if (!beneficioEmEdicao.tipo) {
      toast.error("Selecione o tipo do benefício.");
      return;
    }

    setSalvandoEdicaoBeneficio(true);
    try {
      const response = await beneficiosServicosService.atualizarBeneficioEventual(beneficioEmEdicao.id, {
        beneficio: beneficioEmEdicao.tipo,
        data_beneficio: beneficioEmEdicao.data || undefined,
        observacao: beneficioEmEdicao.observacoes.trim() || undefined,
        registro_nascimento: beneficioEmEdicao.tipo === "NATALIDADE" ? beneficioEmEdicao.registroNascimento.trim() || undefined : undefined,
        cpf_falecido: beneficioEmEdicao.tipo === "FUNERAL" ? beneficioEmEdicao.cpfFalecido.trim() || undefined : undefined,
      });
      const salvo = parseApiObject<BeneficioEventualResponse>(response.data);

      setBeneficios((prev) =>
        prev.map((item) =>
          item.id === beneficioEmEdicao.id
            ? {
              ...item,
              tipo: String(salvo?.beneficio || beneficioEmEdicao.tipo),
              data: String(salvo?.data_beneficio || beneficioEmEdicao.data || item.data || "").slice(0, 10),
              observacoes: String(salvo?.observacao || beneficioEmEdicao.observacoes || ""),
              registroNascimento: String(
                salvo?.registro_nascimento || (beneficioEmEdicao.tipo === "NATALIDADE" ? beneficioEmEdicao.registroNascimento : "") || "",
              ),
              cpfFalecido: maskCpf(
                String(salvo?.cpf_falecido || (beneficioEmEdicao.tipo === "FUNERAL" ? beneficioEmEdicao.cpfFalecido : "") || ""),
              ),
            }
            : item,
        ),
      );

      setBeneficioEmEdicao(null);
      toast.success("Benefício atualizado com sucesso.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível atualizar o benefício."));
    } finally {
      setSalvandoEdicaoBeneficio(false);
    }
  };

  const handleAddParticipacao = async () => {
    setParticipacaoFieldErrors({});
    if (!prontuarioId) {
      toast.error("Prontuário não identificado na URL.");
      return;
    }
    if (!novaParticipacao.membroId || !novaParticipacao.servico || !novaParticipacao.dataInicio || !novaParticipacao.unidadeRealizacao) {
      setParticipacaoFieldErrors({
        ...(novaParticipacao.membroId ? {} : { membro: "Selecione o membro da família." }),
        ...(novaParticipacao.servico ? {} : { servico: "Informe o nome do serviço." }),
        ...(novaParticipacao.dataInicio ? {} : { data_inicio: "Informe a data de início." }),
        ...(novaParticipacao.unidadeRealizacao ? {} : { unidade_realizacao: "Selecione a unidade de realização." }),
      });
      toast.error("Preencha membro, serviço, data de início e unidade.");
      return;
    }

    setSalvandoParticipacao(true);
    try {
      const membroComposicaoId = membroIdByCidadaoId[String(novaParticipacao.membroId)] || String(novaParticipacao.membroId);
      const response = await beneficiosServicosService.criarConvivenciaFortalecimento({
        prontuario: prontuarioId,
        membro: membroComposicaoId,
        servico: novaParticipacao.servico.trim(),
        data_inicio: novaParticipacao.dataInicio,
        unidade_realizacao: novaParticipacao.unidadeRealizacao,
      });
      const salvo = parseApiObject<ConvivenciaFortalecimentoResponse>(response.data);
      if (!salvo?.id) return;

      const novoItem: ParticipacaoItem = {
        id: String(salvo.id),
        membroId: novaParticipacao.membroId,
        servico: String(salvo.servico || novaParticipacao.servico),
        dataInicio: String(salvo.data_inicio || novaParticipacao.dataInicio),
        unidadeRealizacao: String(salvo.unidade_realizacao || novaParticipacao.unidadeRealizacao),
      };

      setParticipacoes((prev) => [...prev, novoItem]);
      setNovaParticipacao({ membroId: "", servico: "", dataInicio: "", unidadeRealizacao: "" });
      toast.success("Participação registrada.");
    } catch (err) {
      const apiErrors = extractFieldErrors(err, new Set(["membro", "servico", "data_inicio", "unidade_realizacao", "prontuario"]));
      if (Object.keys(apiErrors).length) {
        setParticipacaoFieldErrors(apiErrors);
        toast.error("Encontramos erros no formulário. Revise os campos destacados e tente novamente.");
        return;
      }
      toast.error(getApiErrorMessage(err, "Não foi possível registrar a participação."));
    } finally {
      setSalvandoParticipacao(false);
    }
  };

  const handleRemoveParticipacao = async (id: string) => {
    try {
      await beneficiosServicosService.removerConvivenciaFortalecimento(id);
      setParticipacoes((prev) => prev.filter((item) => item.id !== id));
      toast.success("Participação removida.");
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível remover a participação."));
      return false;
    }
  };

  const solicitarExclusaoBeneficio = (item: BeneficioItem) => {
    const nomeBeneficio = tipoBeneficioLabel[String(item.tipo || "")] || item.tipo || "benefício";
    setItemParaExcluir({
      id: item.id,
      tipo: "benefício",
      descricao: nomeBeneficio,
    });
  };

  const solicitarExclusaoParticipacao = (item: ParticipacaoItem) => {
    setItemParaExcluir({
      id: item.id,
      tipo: "participação",
      descricao: item.servico || "participação",
    });
  };

  const handleConfirmarExclusao = async () => {
    if (!itemParaExcluir) return;

    setRemovendoItem(true);
    try {
      const ok =
        itemParaExcluir.tipo === "benefício" ? await handleRemoveBeneficio(itemParaExcluir.id) : await handleRemoveParticipacao(itemParaExcluir.id);
      if (ok) setItemParaExcluir(null);
    } finally {
      setRemovendoItem(false);
    }
  };

  const persistirDados = async () => {
    if (!prontuarioId) {
      toast.error("Prontuário não identificado na URL.");
      return false;
    }
    setSalvandoGeral(true);
    try {
      await syncBeneficiosServicos(beneficios, participacoes);
      toast.success("Benefícios e serviços salvos.");
      onSave();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar benefícios e serviços."));
      return false;
    } finally {
      setSalvandoGeral(false);
    }
  };

  const handleNext = async () => {
    const ok = await persistirDados();
    if (ok) onNext();
  };

  const excludeEmoji = sanitizeTextInputValue;

  const BENEFICIO_OBS_MAX = 500;

  if (!prontuario) return <div className="text-center p-8 text-muted-foreground">Carregando dados...</div>;

  return (
    <div className="space-y-10 pb-20">
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Gift className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Acesso a Benefícios Eventuais</h3>
        </div>

        <Card className="border-purple-100 shadow-sm border-l-4 border-l-primary">
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start bg-slate-50/50 rounded-lg">
              <div className="md:col-span-4 space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Data do Benefício</Label>
                <Input
                  type="date"
                  value={novoBeneficio.data}
                  onChange={(e) => {
                    setNovoBeneficio({ ...novoBeneficio, data: e.target.value });
                    clearBeneficioFieldError("data_beneficio");
                  }}
                  className="bg-white"
                />
                {!!beneficioFieldErrors.data_beneficio && <p className="text-xs text-red-600">{beneficioFieldErrors.data_beneficio}</p>}
              </div>

              <div className="md:col-span-8 space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Tipo de Benefício</Label>
                <Select
                  value={novoBeneficio.tipo}
                  onValueChange={(v) => {
                    setNovoBeneficio({ ...novoBeneficio, tipo: v, cpfFalecido: "", registroNascimento: "" });
                    clearBeneficioFieldError("beneficio", "cpf_falecido", "registro_nascimento");
                  }}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione o tipo de auxílio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_BENEFICIO_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!!beneficioFieldErrors.beneficio && <p className="text-xs text-red-600">{beneficioFieldErrors.beneficio}</p>}
              </div>

              {novoBeneficio.tipo === "NATALIDADE" && (
                <div className="md:col-span-12 p-3 bg-blue-50 border border-blue-100 rounded-md">
                  <Label className="text-[10px] font-bold uppercase text-blue-600">Registro de Nascimento</Label>
                  <Input
                    placeholder="Número do termo/registro..."
                    className="h-9 bg-white mt-1"
                    value={novoBeneficio.registroNascimento}
                    maxLength={BENEFICIO_REGISTRO_NASCIMENTO_MAX}
                    onChange={(e) => {
                      setNovoBeneficio({ ...novoBeneficio, registroNascimento: textMax(e.target.value, BENEFICIO_REGISTRO_NASCIMENTO_MAX) });
                      clearBeneficioFieldError("registro_nascimento");
                    }}
                  />
                  {!!beneficioFieldErrors.registro_nascimento && (
                    <p className="mt-1 text-xs text-red-600">{beneficioFieldErrors.registro_nascimento}</p>
                  )}
                </div>
              )}

              {novoBeneficio.tipo === "FUNERAL" && (
                <div className="md:col-span-12 p-3 bg-blue-50 border border-blue-100 rounded-md">
                  <Label className="text-[10px] font-bold uppercase text-blue-600">CPF da Pessoa Falecida</Label>
                  <Input
                    placeholder="000.000.000-00"
                    className="h-9 bg-white mt-1"
                    value={novoBeneficio.cpfFalecido}
                    inputMode="numeric"
                    maxLength={BENEFICIO_CPF_FALECIDO_MAX}
                    onChange={(e) => {
                      setNovoBeneficio({ ...novoBeneficio, cpfFalecido: maskCpf(e.target.value) });
                      clearBeneficioFieldError("cpf_falecido");
                    }}
                  />
                  {!!beneficioFieldErrors.cpf_falecido && <p className="mt-1 text-xs text-red-600">{beneficioFieldErrors.cpf_falecido}</p>}
                </div>
              )}

              <div className="md:col-span-12 space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Observações e Justificativa Técnica</Label>
                <Textarea
                  placeholder="Descreva o motivo da concessão, itens entregues ou situação encontrada..."
                  className="bg-white min-h-[100px] resize-none"
                  maxLength={BENEFICIO_OBSERVACAO_MAX}
                  value={novoBeneficio.observacoes}
                  onChange={(e) => {
                    const clean = excludeEmoji(e.target.value);
                    setNovoBeneficio({
                      ...novoBeneficio,
                      observacoes: textMax(clean, BENEFICIO_OBSERVACAO_MAX),
                    });
                    clearBeneficioFieldError("observacao");
                  }}
                />
                <p className="text-[11px] text-slate-400 text-right">
                  {novoBeneficio.observacoes.length}/{BENEFICIO_OBSERVACAO_MAX}
                </p>
                {!!beneficioFieldErrors.observacao && <p className="text-xs text-red-600">{beneficioFieldErrors.observacao}</p>}
              </div>

              <Button onClick={handleAddBeneficio} className="w-[200px] bg-primary shadow-sm" disabled={salvandoBeneficio || carregando}>
                {salvandoBeneficio ? "Adicionando..." : "Adicionar benefício"}
              </Button>
            </div>

            {beneficios.length > 0 && (
              <div className="mt-4 border rounded-lg overflow-hidden ">
                <table className="w-full table-fixed text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="w-28 px-4 py-2 text-left font-semibold">Data</th>
                      <th className="w-48 px-4 py-2 text-left font-semibold">Tipo de benefício</th>
                      <th className="w-36 px-4 py-2 text-left font-semibold">CPF/Registro</th>
                      <th className="px-4 py-2 text-left font-semibold">Observações</th>
                      <th className="w-24 px-4 py-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50">
                    {beneficios.slice((paginaAtualBeneficios - 1) * pageSize, paginaAtualBeneficios * pageSize).map((b) => (
                      <tr key={b.id} className="bg-white hover:bg-purple-50/20">
                        <td className="px-4 py-2 text-slate-600 text-xs">{formatDate(b.data)}</td>
                        <td className="px-4 py-2 font-medium">{tipoBeneficioLabel[String(b.tipo || "")] || b.tipo || "-"}</td>
                        <td className="px-4 py-2 text-slate-700">{getBeneficioDocumento(b)}</td>
                        <td className="max-w-0 px-4 py-2 text-slate-700">
                          <HoverText text={b.observacoes || "-"} cellClassName="font-medium" tooltipClassName="max-w-[420px]" />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => abrirEdicaoBeneficio(b)}>
                              <Pencil className="w-4 h-4 text-slate-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => solicitarExclusaoBeneficio(b)}>
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-end gap-2 px-4 py-4 border-t bg-white">

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaAtualBeneficios((p) => Math.max(1, p - 1))}
                    disabled={paginaAtualBeneficios === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {paginaAtualBeneficios} / {totalPaginasBeneficios}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaAtualBeneficios((p) => Math.min(totalPaginasBeneficios, p + 1))}
                    disabled={paginaAtualBeneficios >= totalPaginasBeneficios}
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
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Convivência e Fortalecimento de Vínculos</h3>
        </div>

        <Card className="border-blue-100 shadow-sm border-l-4 border-l-primary">
          <CardHeader className="bg-blue-50/30 border-b">
            <CardDescription className="flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Registre programas, projetos ou serviços (SCFV, PAIF, etc) que os membros participam.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Membro da Família</Label>
                <Popover open={membroParticipacaoOpen} onOpenChange={setMembroParticipacaoOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={membroParticipacaoOpen}
                      className="w-full justify-between font-normal"
                      type="button"
                    >
                      <span className="truncate">{membroParticipacaoLabel || "Selecione..."}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar membro..." />
                      <CommandList onWheel={handleWheelOnCommandList} className="max-h-[240px] overscroll-contain">
                        <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                        <CommandGroup>
                          {membros.map((m) => (
                            <CommandItem
                              key={m.id}
                              value={m.nome}
                              onSelect={() => {
                                setNovaParticipacao({ ...novaParticipacao, membroId: m.id });
                                clearParticipacaoFieldError("membro");
                                setMembroParticipacaoOpen(false);
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 ${novaParticipacao.membroId === m.id ? "opacity-100" : "opacity-0"}`} />
                              <span className="truncate">{m.nome}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {!!participacaoFieldErrors.membro && <p className="text-xs text-red-600">{participacaoFieldErrors.membro}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Nome do Serviço</Label>
                <Input
                  placeholder="Ex: SCFV Idosos"
                  value={novaParticipacao.servico}
                  maxLength={SERVICO_NOME_MAX}
                  onChange={(e) => {
                    const clean = excludeEmoji(e.target.value);
                    setNovaParticipacao({ ...novaParticipacao, servico: textMax(clean, SERVICO_NOME_MAX) });
                    clearParticipacaoFieldError("servico");
                  }}
                />
                {!!participacaoFieldErrors.servico && <p className="text-xs text-red-600">{participacaoFieldErrors.servico}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Data de Início</Label>
                <Input
                  type="date"
                  value={novaParticipacao.dataInicio}
                  onChange={(e) => {
                    setNovaParticipacao({ ...novaParticipacao, dataInicio: e.target.value });
                    clearParticipacaoFieldError("data_inicio");
                  }}
                />
                {!!participacaoFieldErrors.data_inicio && <p className="text-xs text-red-600">{participacaoFieldErrors.data_inicio}</p>}
              </div>

              <div className="md:col-span-3 space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Unidade de realização</Label>
                <div className="flex gap-2">
                  <Select
                    value={novaParticipacao.unidadeRealizacao}
                    onValueChange={(v) => {
                      setNovaParticipacao({ ...novaParticipacao, unidadeRealizacao: v });
                      clearParticipacaoFieldError("unidade_realizacao");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={unidadeRealizacaoOptions.length ? "Selecione a unidade..." : "Sem opções carregadas"} />
                    </SelectTrigger>
                    <SelectContent>
                      {unidadeRealizacaoOptions.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button onClick={handleAddParticipacao} disabled={salvandoParticipacao || carregando || !unidadeRealizacaoOptions.length}>
                    <Plus className="w-4 h-4" /> {salvandoParticipacao ? "Registrando..." : "Registrar"}
                  </Button>
                </div>
                {!!participacaoFieldErrors.unidade_realizacao && <p className="text-xs text-red-600">{participacaoFieldErrors.unidade_realizacao}</p>}
              </div>
            </div>

            {participacoes.length > 0 && (
              <div className="mt-4 border rounded-lg overflow-hidden ">
                <table className="w-full text-sm">
                  <thead className="border-b ">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Membro</th>
                      <th className="px-4 py-2 text-left font-semibold">Serviço</th>
                      <th className="px-4 py-2 text-left font-semibold">Unidade</th>
                      <th className="px-4 py-2 text-left font-semibold">Início</th>
                      <th className="px-4 py-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y ">
                    {participacoes.slice((paginaAtualServicos - 1) * pageSize, paginaAtualServicos * pageSize).map((p) => (
                      <tr key={p.id} className="bg-white ">
                        <td className="px-4 py-2 font-medium">
                          {membros.find((m) => String(m.id) === String(p.membroId || cidadaoIdByMembroId[p.membroId]))?.nome || "Não encontrado"}
                        </td>
                        <td className="px-4 py-2">{p.servico}</td>
                        <td className="px-4 py-2">{unidadeRealizacaoLabel[String(p.unidadeRealizacao || "")] || p.unidadeRealizacao || "-"}</td>

                        <td className="px-4 py-2 text-slate-500 text-xs">{formatDate(p.dataInicio)}</td>
                        <td className="px-4 py-2 text-right">
                          <Button variant="ghost" size="icon" onClick={() => solicitarExclusaoParticipacao(p)}>
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-end mt-4 pr-4 pb-4">
                  <div className="flex items-center gap-2">
                    <button
                      className="px-3 py-2 rounded border disabled:opacity-50"
                      onClick={() => setPaginaAtualServicos((p) => Math.max(1, p - 1))}
                      disabled={paginaAtualServicos === 1}
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Página {paginaAtualServicos} / {totalPaginasServicos}
                    </span>
                    <button
                      className="px-3 py-2 rounded border disabled:opacity-50"
                      onClick={() => setPaginaAtualServicos((p) => Math.min(totalPaginasServicos, p + 1))}
                      disabled={paginaAtualServicos >= totalPaginasServicos}
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
        <Button variant="outline" onClick={persistirDados} className="gap-2" disabled={carregando || salvandoGeral}>
          <Save className="w-4 h-4" /> {salvandoGeral ? "Salvando..." : "Salvar Alterações"}
        </Button>
        <Button onClick={handleNext} className="gap-2 bg-primary" disabled={carregando || salvandoGeral}>
          Salvar e avançar <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <Dialog open={!!beneficioEmEdicao} onOpenChange={(open) => !open && setBeneficioEmEdicao(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Editar benefício eventual</DialogTitle>
            <DialogDescription>Atualize os dados do benefício selecionado no histórico.</DialogDescription>
          </DialogHeader>

          {beneficioEmEdicao && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Data do benefício</Label>
                <Input
                  type="date"
                  value={beneficioEmEdicao.data}
                  onChange={(e) => setBeneficioEmEdicao((prev) => (prev ? { ...prev, data: e.target.value } : prev))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Tipo de benefício</Label>
                <Select
                  value={beneficioEmEdicao.tipo}
                  onValueChange={(value) =>
                    setBeneficioEmEdicao((prev) =>
                      prev
                        ? {
                          ...prev,
                          tipo: value,
                          cpfFalecido: value === "FUNERAL" ? prev.cpfFalecido : "",
                          registroNascimento: value === "NATALIDADE" ? prev.registroNascimento : "",
                        }
                        : prev,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de auxílio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_BENEFICIO_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {beneficioEmEdicao.tipo === "FUNERAL" && (
                <div className="space-y-2 rounded-md border border-blue-100 bg-blue-50 p-3">
                  <Label className="text-[10px] font-bold uppercase text-blue-600">CPF da Pessoa Falecida</Label>
                  <Input
                    value={beneficioEmEdicao.cpfFalecido}
                    inputMode="numeric"
                    maxLength={BENEFICIO_CPF_FALECIDO_MAX}
                    placeholder="000.000.000-00"
                    onChange={(e) => setBeneficioEmEdicao((prev) => (prev ? { ...prev, cpfFalecido: maskCpf(e.target.value) } : prev))}
                  />
                </div>
              )}

              {beneficioEmEdicao.tipo === "NATALIDADE" && (
                <div className="space-y-2 rounded-md border border-blue-100 bg-blue-50 p-3">
                  <Label className="text-[10px] font-bold uppercase text-blue-600">Registro de Nascimento</Label>
                  <Input
                    value={beneficioEmEdicao.registroNascimento}
                    maxLength={BENEFICIO_REGISTRO_NASCIMENTO_MAX}
                    placeholder="Número do termo/registro..."
                    onChange={(e) =>
                      setBeneficioEmEdicao((prev) =>
                        prev ? { ...prev, registroNascimento: textMax(e.target.value, BENEFICIO_REGISTRO_NASCIMENTO_MAX) } : prev,
                      )
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Observações e Justificativa Técnica</Label>
                <Textarea
                  value={beneficioEmEdicao.observacoes}
                  maxLength={BENEFICIO_OBSERVACAO_MAX}
                  className="min-h-[120px] resize-none"
                  placeholder="Descreva o motivo da concessão, itens entregues ou situação encontrada..."
                  onChange={(e) =>
                    setBeneficioEmEdicao((prev) =>
                      prev
                        ? {
                          ...prev,
                          observacoes: textMax(excludeEmoji(e.target.value), BENEFICIO_OBSERVACAO_MAX),
                        }
                        : prev,
                    )
                  }
                />
                <p className="text-right text-[11px] text-slate-400">
                  {beneficioEmEdicao.observacoes.length}/{BENEFICIO_OBSERVACAO_MAX}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBeneficioEmEdicao(null)} disabled={salvandoEdicaoBeneficio}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarEdicaoBeneficio} disabled={!beneficioEmEdicao || salvandoEdicaoBeneficio}>
              {salvandoEdicaoBeneficio ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemParaExcluir} onOpenChange={(open) => !open && setItemParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {`Deseja realmente excluir ${itemParaExcluir?.tipo === "benefício" ? "o benefício" : "a participação"} "${itemParaExcluir?.descricao || "-"
                }"? Essa ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removendoItem}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarExclusao} disabled={removendoItem} className="bg-red-600 hover:bg-red-700">
              {removendoItem ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
