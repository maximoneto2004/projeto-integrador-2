import { useEffect, useMemo, useState, useCallback, type KeyboardEvent, type WheelEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Briefcase,
  Wallet,
  ChevronDown,
  Save,
  ArrowRight,
  CheckCircle2,
  Info,
  Banknote,
  GraduationCap,
  PlusCircle,
  Trash2,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "@/lib/sonner";
import * as Accordion from "@radix-ui/react-accordion";
import { getApiErrorMessage } from "@/lib/notifications";
import type { Prontuario } from "@/types/prontuario";
import { beneficioService, type BeneficioSocial } from "@/services/prontuario/beneficioService";
import { membroComposicaoService, type MembroComposicaoResponse } from "@/services/prontuario/membroComposicaoService";
import { prontuarioService } from "@/services/prontuario/prontuarioService";
import {
  trabalhoRendimentoService,
  type TrabalhoRendimentoMembroResponse,
  type TrabalhoRendimentoResponse,
  type TransferenciaRendaResponse,
} from "@/services/prontuario/trabalhoRendimentoService";
import {
  useTrabalhoRendimentoMembroProntuario,
  useTrabalhoRendimentoProntuario,
  useTransferenciaRendaProntuario,
} from "@/hooks/prontuario/useTrabalhoRendimentoProntuario";

// Criamos uma interface para os benefícios dinâmicos
interface BeneficioValor {
  nome: string;
  valor: string;
  beneficioId?: string;
  transferenciaId?: string;
}

type MemberFormData = {
  ocupacao: string;
  vinculo: string;
  rendaIndividual: number;
  carteiraAssinada: boolean;
  aposentadoPensionista: boolean;
  qualificacaoProfissional: string[];
};

const initialFormData: MemberFormData = {
  ocupacao: "",
  vinculo: "",
  rendaIndividual: 0,
  carteiraAssinada: false,
  aposentadoPensionista: false,
  qualificacaoProfissional: [],
};

const qualificacaoPadraoOptions = ["NAO_POSSUI", "TECNICO", "PROFISSIONALIZANTE", "SUPERIOR"] as const;

const qualificacaoLabelByValue: Record<string, string> = {
  NAO_POSSUI: "Não possui",
  TECNICO: "Curso técnico",
  PROFISSIONALIZANTE: "Profissionalizante",
  SUPERIOR: "Ensino superior",
};

const legacyQualificacaoValueMap: Record<string, string> = {
  CURSO_TECNICO: "TECNICO",
};

const uniqueValues = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const normalizeQualificacaoValue = (value: string) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  return legacyQualificacaoValueMap[normalized] || normalized;
};

const normalizeQualificacaoList = (values: string[]) => uniqueValues(values.map((value) => normalizeQualificacaoValue(String(value))));

const formatQualificacaoLabel = (value: string) => {
  const normalized = normalizeQualificacaoValue(value);
  const mapped = qualificacaoLabelByValue[normalized];
  if (mapped) return mapped;
  return normalized
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

interface Props {
  prontuario: Prontuario | null;
  onNext: () => void;
  onSave: () => void;
}

const normalizeCpf = (value?: string) => (value || "").replace(/\D/g, "");

const asRecord = (value: unknown): Record<string, unknown> | null => (value && typeof value === "object" ? (value as Record<string, unknown>) : null);

const extractListFromPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  const maybe = asRecord(payload);
  if (!maybe) return [];

  if ("result" in maybe) {
    const nested = extractListFromPayload(maybe.result);
    if (nested.length) return nested;
  }

  if ("results" in maybe) {
    const nested = extractListFromPayload(maybe.results);
    if (nested.length) return nested;
  }

  if ("data" in maybe) {
    const nested = extractListFromPayload(maybe.data);
    if (nested.length) return nested;
  }

  if ("id" in maybe || "prontuario_id" in maybe) {
    return [maybe];
  }

  return [];
};

const parseApiList = <T,>(payload: unknown): T[] => {
  const extracted = extractListFromPayload(payload);
  if (extracted.length) return extracted as T[];
  return [];
};

const firstProntuarioIdFromResponse = (payload: unknown): string => {
  const primeiro = parseApiList<Record<string, unknown>>(payload)[0];
  return String(primeiro?.id || primeiro?.prontuario_id || "");
};

const toNum = (value: string | number) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
};
const CURRENCY_MAX_DIGITS = 10;
const CURRENCY_MAX_LENGTH = 13;

const formatCurrencyInput = (value: number) => {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseCurrencyInput = (value: string, maxDigits = CURRENCY_MAX_DIGITS) => {
  const digits = value.replace(/\D/g, "").slice(0, maxDigits);
  if (!digits) return 0;
  return Number(digits) / 100;
};
const formatCurrencyValue = (value: string) => {
  if (!value) return "";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? formatCurrencyInput(numeric) : "";
};

const parseCurrencyValue = (value: string, maxDigits = CURRENCY_MAX_DIGITS) => {
  const digits = value.replace(/\D/g, "").slice(0, maxDigits);
  if (!digits) return "";
  return String(parseCurrencyInput(digits, maxDigits));
};

const handleNumericValueKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
  if (event.key === "e" || event.key === "E" || event.key === "+" || event.key === "-") {
    event.preventDefault();
  }
};
const ITEM_NOME_MAX = 40;

export function CondicoesTrabalho({ prontuario, onNext, onSave }: Props) {
  const [searchParams] = useSearchParams();
  const cpfFromUrl = useMemo(() => normalizeCpf(searchParams.get("cpf") || ""), [searchParams]);
  const cpfRef = useMemo(
    () => normalizeCpf(prontuario?.membros.find((m) => m.id === prontuario?.pessoaReferenciaId)?.cpf || cpfFromUrl),
    [prontuario, cpfFromUrl],
  );
  const prontuarioNumero = useMemo(() => String(prontuario?.numero || "").trim(), [prontuario?.numero]);
  const prontuarioIdFromContext = useMemo(
    () => searchParams.get("prontuarioId") || (cpfRef ? localStorage.getItem(`prontuarioIdByCpf:${cpfRef}`) || "" : ""),
    [searchParams, cpfRef],
  );
  const [prontuarioId, setProntuarioId] = useState(prontuarioIdFromContext);

  const [activeMembroId, setActiveMembroId] = useState<string>("");
  const [memberFormData, setMemberFormData] = useState(initialFormData);
  const [membrosApi, setMembrosApi] = useState<TrabalhoRendimentoMembroResponse[]>([]);
  const [membroIdByCidadaoId, setMembroIdByCidadaoId] = useState<Record<string, string>>({});

  const [qualificacaoOptions, setQualificacaoOptions] = useState<string[]>(() => [...qualificacaoPadraoOptions]);
  const [beneficiosOptions, setBeneficiosOptions] = useState<string[]>([]);
  const [beneficioIdByNome, setBeneficioIdByNome] = useState<Record<string, string>>({});
  const [beneficiosFamilia, setBeneficiosFamilia] = useState<BeneficioValor[]>([]);
  const [transferenciasRemovidasIds, setTransferenciasRemovidasIds] = useState<string[]>([]);

  const [rendaFamiliarTotal, setRendaFamiliarTotal] = useState("");
  const [rendaFamiliarTotalSobrescritoManual, setRendaFamiliarTotalSobrescritoManual] = useState(false);
  const [rendaPerCapita, setRendaPerCapita] = useState("");
  const [rendaTotalIncluindoBeneficios, setRendaTotalIncluindoBeneficios] = useState("");
  const [rendaPerCapitaIncluindoBeneficios, setRendaPerCapitaIncluindoBeneficios] = useState("");
  const [parecer, setParecer] = useState("");
  const [trabalhoRendimentoId, setTrabalhoRendimentoId] = useState("");

  // Modais
  const [beneficioModalOpen, setBeneficioModalOpen] = useState(false);
  const [beneficioSelectOpen, setBeneficioSelectOpen] = useState(false);
  const [qualificacaoPopoverOpen, setQualificacaoPopoverOpen] = useState(false);
  const [novoItemNome, setNovoItemNome] = useState("");
  const [salvandoNovoBeneficio, setSalvandoNovoBeneficio] = useState(false);
  const [carregandoApi, setCarregandoApi] = useState(false);

  const { mutateAsync: salvarMembro, isPending: salvandoMembro } = useTrabalhoRendimentoMembroProntuario();
  const { mutateAsync: salvarTransferencia, isPending: salvandoTransferencia } = useTransferenciaRendaProntuario();
  const { mutateAsync: salvarConsolidado, isPending: salvandoConsolidado } = useTrabalhoRendimentoProntuario();

  const resolveMembroId = useCallback((cidadaoId: string) => membroIdByCidadaoId[cidadaoId] || cidadaoId, [membroIdByCidadaoId]);

  useEffect(() => {
    setProntuarioId(prontuarioIdFromContext);
  }, [prontuarioIdFromContext]);

  useEffect(() => {
    if (!qualificacaoPopoverOpen) return;

    const closePopover = () => setQualificacaoPopoverOpen(false);
    window.addEventListener("scroll", closePopover, true);
    window.addEventListener("resize", closePopover);

    return () => {
      window.removeEventListener("scroll", closePopover, true);
      window.removeEventListener("resize", closePopover);
    };
  }, [qualificacaoPopoverOpen]);

  const applyBeneficiosSociais = useCallback((beneficiosApi: BeneficioSocial[]) => {
    const byNome: Record<string, string> = {};
    const byId: Record<string, string> = {};
    beneficiosApi.forEach((beneficio) => {
      const nome = String(beneficio.nome || "").trim();
      const id = String(beneficio.id || "");
      if (!nome || !id) return;
      byNome[nome] = id;
      byId[id] = nome;
    });
    setBeneficioIdByNome(byNome);
    setBeneficiosOptions(Object.keys(byNome).sort((a, b) => a.localeCompare(b, "pt-BR")));
    return { byId };
  }, []);

  const ensureProntuarioId = useCallback(async () => {
    if (prontuarioId) return prontuarioId;

    if (cpfRef) {
      const cached = localStorage.getItem(`prontuarioIdByCpf:${cpfRef}`) || "";
      if (cached) {
        setProntuarioId(cached);
        return cached;
      }
    }

    try {
      if (cpfRef) {
        const buscaPorCpf = await prontuarioService.listar({ search: cpfRef, limit: 1, offset: 0 });
        const resolvedByCpf = firstProntuarioIdFromResponse(buscaPorCpf.data);
        if (resolvedByCpf) {
          localStorage.setItem(`prontuarioIdByCpf:${cpfRef}`, resolvedByCpf);
          setProntuarioId(resolvedByCpf);
          return resolvedByCpf;
        }
      }

      if (prontuarioNumero) {
        const buscaPorNumero = await prontuarioService.listar({ search: prontuarioNumero, limit: 1, offset: 0 });
        const resolvedByNumero = firstProntuarioIdFromResponse(buscaPorNumero.data);
        if (resolvedByNumero) {
          if (cpfRef) localStorage.setItem(`prontuarioIdByCpf:${cpfRef}`, resolvedByNumero);
          setProntuarioId(resolvedByNumero);
          return resolvedByNumero;
        }
      }

      return "";
    } catch {
      return "";
    }
  }, [prontuarioId, cpfRef, prontuarioNumero]);

  useEffect(() => {
    const load = async () => {
      const resolvedProntuarioId = await ensureProntuarioId();
      if (!resolvedProntuarioId) return;

      setCarregandoApi(true);
      try {
        const [compRes, membRes, transRes, trabRes, benRes] = await Promise.all([
          membroComposicaoService.listar({ prontuario: resolvedProntuarioId }),
          trabalhoRendimentoService.listarMembro({ prontuario: resolvedProntuarioId }),
          trabalhoRendimentoService.listarTransferencia({ prontuario: resolvedProntuarioId }),
          trabalhoRendimentoService.listar({ prontuario: resolvedProntuarioId }),
          beneficioService.listarBeneficiosSociais(),
        ]);

        const comp = parseApiList<MembroComposicaoResponse>(compRes.data).filter((i) => String(i.prontuario) === String(resolvedProntuarioId));
        const byCidadao: Record<string, string> = {};
        comp.forEach((item) => {
          const cidadaoId = typeof item.cidadao === "object" ? String(item.cidadao?.id || "") : String(item.cidadao || "");
          const membroId = String(item.id || "");
          if (cidadaoId && membroId) byCidadao[cidadaoId] = membroId;
        });
        setMembroIdByCidadaoId(byCidadao);

        const membros = parseApiList<TrabalhoRendimentoMembroResponse>(membRes.data).filter(
          (i) => String(i.prontuario) === String(resolvedProntuarioId),
        );
        setMembrosApi(membros);
        const qualificacoesRegistradas = membros.flatMap((item) =>
          Array.isArray(item.qualificacao_profissional) ? normalizeQualificacaoList(item.qualificacao_profissional) : [],
        );
        setQualificacaoOptions((prev) =>
          uniqueValues([...qualificacaoPadraoOptions, ...normalizeQualificacaoList(prev), ...qualificacoesRegistradas]),
        );

        const beneficiosApi = parseApiList<BeneficioSocial>(benRes.data);
        const { byId } = applyBeneficiosSociais(beneficiosApi);

        const transferencias = parseApiList<TransferenciaRendaResponse>(transRes.data)
          .filter((i) => String(i.prontuario) === String(resolvedProntuarioId))
          .map((i) => {
            const beneficioId = i.beneficio ? String(i.beneficio) : "";
            return {
              nome: byId[beneficioId] || `Benefício ${beneficioId}`,
              valor: i.valor === null || i.valor === undefined ? "" : String(i.valor),
              beneficioId: beneficioId || undefined,
              transferenciaId: String(i.id || ""),
            } as BeneficioValor;
          });
        setBeneficiosFamilia(transferencias);
        setTransferenciasRemovidasIds([]);

        const consolidado = parseApiList<TrabalhoRendimentoResponse>(trabRes.data).find((i) => String(i.prontuario) === String(resolvedProntuarioId));
        if (consolidado) {
          setTrabalhoRendimentoId(String(consolidado.id || ""));
          const totalAutomatico = membros.reduce((acc, item) => acc + Number(item.renda_individual || 0), 0);
          const rendaTotalConsolidada =
            consolidado.renda_total === null || consolidado.renda_total === undefined ? undefined : Number(consolidado.renda_total);
          if (Number.isFinite(rendaTotalConsolidada)) {
            setRendaFamiliarTotal(String(rendaTotalConsolidada));
            setRendaFamiliarTotalSobrescritoManual(Math.abs(Number(rendaTotalConsolidada) - totalAutomatico) > 0.009);
          } else {
            setRendaFamiliarTotal(totalAutomatico.toFixed(2));
            setRendaFamiliarTotalSobrescritoManual(false);
          }
          setParecer(String(consolidado.parecer || ""));
        } else {
          const totalAutomatico = membros.reduce((acc, item) => acc + Number(item.renda_individual || 0), 0);
          setRendaFamiliarTotal(totalAutomatico.toFixed(2));
          setRendaFamiliarTotalSobrescritoManual(false);
        }
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Não foi possível carregar trabalho e rendimento."));
      } finally {
        setCarregandoApi(false);
      }
    };
    load();
  }, [ensureProntuarioId, applyBeneficiosSociais]);

  useEffect(() => {
    if (!activeMembroId) return;
    const membroComposicaoId = resolveMembroId(activeMembroId);
    const registro = membrosApi.find((item) => String(item.membro) === String(membroComposicaoId));
    if (!registro) {
      setMemberFormData(initialFormData);
      return;
    }
    setMemberFormData({
      ocupacao: String(registro.condicao_ocupacao || ""),
      vinculo: String(registro.vinculo_empregatico || ""),
      rendaIndividual: Number(registro.renda_individual || 0),
      carteiraAssinada: Boolean(registro.carteira_assinada),
      aposentadoPensionista: Boolean(registro.aposentado_pensionista),
      qualificacaoProfissional: Array.isArray(registro.qualificacao_profissional)
        ? normalizeQualificacaoList(registro.qualificacao_profissional)
        : [],
    });
  }, [activeMembroId, membrosApi, resolveMembroId]);

  const rendaFamiliarSemBeneficiosAutomatica = useMemo(
    () => membrosApi.reduce((acc, item) => acc + Number(item.renda_individual || 0), 0),
    [membrosApi],
  );

  useEffect(() => {
    if (rendaFamiliarTotalSobrescritoManual) return;
    setRendaFamiliarTotal(rendaFamiliarSemBeneficiosAutomatica.toFixed(2));
  }, [rendaFamiliarSemBeneficiosAutomatica, rendaFamiliarTotalSobrescritoManual]);

  const handleChangeRendaFamiliarTotal = useCallback(
    (value: string) => {
      const parsed = parseCurrencyValue(value, CURRENCY_MAX_DIGITS);
      setRendaFamiliarTotal(parsed);
      const valorAtual = Number(parsed || 0);
      setRendaFamiliarTotalSobrescritoManual(Math.abs(valorAtual - rendaFamiliarSemBeneficiosAutomatica) > 0.009);
    },
    [rendaFamiliarSemBeneficiosAutomatica],
  );

  useEffect(() => {
    const rendaBase = Number(rendaFamiliarTotal || 0);
    const membrosCount = prontuario?.membros.length || 0;
    const perCapitaSemBeneficios = membrosCount > 0 ? rendaBase / membrosCount : 0;
    setRendaPerCapita(perCapitaSemBeneficios ? perCapitaSemBeneficios.toFixed(2) : "");

    const totalBeneficios = beneficiosFamilia.reduce((acc, b) => acc + Number(b.valor || 0), 0);
    const total = rendaBase + totalBeneficios;
    setRendaTotalIncluindoBeneficios(Number.isFinite(total) ? String(total) : "");
    const perCapita = membrosCount > 0 ? total / membrosCount : 0;
    setRendaPerCapitaIncluindoBeneficios(perCapita ? perCapita.toFixed(2) : "");
  }, [rendaFamiliarTotal, beneficiosFamilia, prontuario?.membros.length]);

  const handleFormChange = useCallback(<K extends keyof MemberFormData>(field: K, value: MemberFormData[K]) => {
    setMemberFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const qualificacaoSelecionadaTexto = useMemo(
    () => memberFormData.qualificacaoProfissional.map((value) => formatQualificacaoLabel(value)).join(", "),
    [memberFormData.qualificacaoProfissional],
  );

  const qualificacaoSelecaoAjudaTexto = useMemo(
    () =>
      memberFormData.qualificacaoProfissional.length
        ? `${memberFormData.qualificacaoProfissional.length} selecionada(s)`
        : "Selecione uma ou mais opções",
    [memberFormData.qualificacaoProfissional.length],
  );

  const handleToggleQualificacao = (option: string, checked: boolean | "indeterminate") => {
    const current = memberFormData.qualificacaoProfissional;
    const nextValues = checked ? uniqueValues([...current, option]) : current.filter((item) => item !== option);
    handleFormChange("qualificacaoProfissional", nextValues);
  };

  const handleWheelOnCommandList = (event: WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    container.scrollTop += event.deltaY;
    event.preventDefault();
    event.stopPropagation();
  };

  // Lógica para gerenciar benefícios na lista do formulário
  const handleAddBeneficio = (nome: string) => {
    if (beneficiosFamilia.some((b) => b.nome === nome)) {
      toast.error("Este benefício já foi adicionado.");
      return;
    }
    setBeneficiosFamilia((prev) => [...prev, { nome, valor: "", beneficioId: beneficioIdByNome[nome] }]);
  };

  const handleUpdateBeneficioValor = (nome: string, valor: string) => {
    setBeneficiosFamilia((prev) => prev.map((b) => (b.nome === nome ? { ...b, valor } : b)));
  };

  const handleRemoveBeneficio = (nome: string) => {
    setBeneficiosFamilia((prev) => {
      const beneficioRemovido = prev.find((b) => b.nome === nome);
      const transferenciaIdRemovida = beneficioRemovido?.transferenciaId;
      if (transferenciaIdRemovida) {
        setTransferenciasRemovidasIds((ids) => (ids.includes(transferenciaIdRemovida) ? ids : [...ids, transferenciaIdRemovida]));
      }
      return prev.filter((b) => b.nome !== nome);
    });
  };

  const handleSaveMember = async () => {
    const resolvedProntuarioId = await ensureProntuarioId();
    if (!resolvedProntuarioId) {
      toast.error("Prontuário não identificado.");
      return;
    }
    if (!activeMembroId) {
      toast.warning("Selecione um membro para atualizar.");
      return;
    }
    try {
      const membroComposicaoId = resolveMembroId(activeMembroId);
      const existing = membrosApi.find((item) => String(item.membro) === String(membroComposicaoId));
      const salvo = await salvarMembro({
        id: existing?.id ? String(existing.id) : undefined,
        payload: {
          prontuario: resolvedProntuarioId,
          membro: membroComposicaoId,
          condicao_ocupacao: memberFormData.ocupacao || undefined,
          vinculo_empregatico: memberFormData.vinculo || undefined,
          renda_individual: toNum(memberFormData.rendaIndividual),
          carteira_assinada: memberFormData.carteiraAssinada,
          aposentado_pensionista: memberFormData.aposentadoPensionista,
          qualificacao_profissional: normalizeQualificacaoList(memberFormData.qualificacaoProfissional),
        },
      });
      if (salvo) {
        setMembrosApi((prev) =>
          existing ? prev.map((item) => (String(item.id) === String(salvo.id) ? { ...item, ...salvo } : item)) : [...prev, salvo],
        );
      }
      toast.success("Dados do membro atualizados!");
      setActiveMembroId("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar o membro."));
    }
  };

  const ensureBeneficioId = async (nome: string, existingId?: string) => {
    if (existingId) return existingId;
    if (beneficioIdByNome[nome]) return beneficioIdByNome[nome];
    const res = await beneficioService.criarBeneficioSocial({ nome });
    const payload = res.data as { id?: string; nome?: string; result?: { id?: string; nome?: string } };
    const saved = payload.result || payload;
    const id = String(saved?.id || "");
    if (!id) return "";
    const nomeFinal = String(saved?.nome || nome);
    setBeneficioIdByNome((prev) => ({ ...prev, [nomeFinal]: id }));
    setBeneficiosOptions((prev) => (prev.includes(nomeFinal) ? prev : [...prev, nomeFinal]));
    return id;
  };

  const handleSalvarNovoBeneficio = async () => {
    const nomeInformado = novoItemNome.trim().slice(0, ITEM_NOME_MAX);
    if (!nomeInformado) {
      toast.error("Informe o nome do benefício.");
      return;
    }

    const nomeExistente = Object.keys(beneficioIdByNome).find((item) => item.toLowerCase() === nomeInformado.toLowerCase());
    if (nomeExistente) {
      toast.warning("Esse benefício já está cadastrado.");
      setNovoItemNome(nomeExistente);
      return;
    }

    try {
      setSalvandoNovoBeneficio(true);
      const resposta = await beneficioService.criarBeneficioSocial({ nome: nomeInformado });
      const payload = resposta.data as { id?: string; nome?: string; result?: { id?: string; nome?: string } };
      const salvo = payload?.result || payload;
      const idSalvo = String(salvo?.id || "");
      const nomeSalvo = String(salvo?.nome || nomeInformado).trim();

      if (idSalvo && nomeSalvo) {
        setBeneficioIdByNome((prev) => ({ ...prev, [nomeSalvo]: idSalvo }));
        setBeneficiosOptions((prev) => (prev.includes(nomeSalvo) ? prev : [...prev, nomeSalvo].sort((a, b) => a.localeCompare(b, "pt-BR"))));
      } else {
        const listaAtualizada = await beneficioService.listarBeneficiosSociais();
        const beneficiosAtualizados = parseApiList<BeneficioSocial>(listaAtualizada.data);
        applyBeneficiosSociais(beneficiosAtualizados);
      }

      setNovoItemNome("");
      setBeneficioModalOpen(false);
      toast.success("Benefício cadastrado com sucesso.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível cadastrar o benefício."));
    } finally {
      setSalvandoNovoBeneficio(false);
    }
  };

  const handleSalvarGeral = async () => {
    const resolvedProntuarioId = await ensureProntuarioId();
    if (!resolvedProntuarioId) {
      toast.error("Prontuário não identificado na URL.");
      return false;
    }
    try {
      if (transferenciasRemovidasIds.length > 0) {
        await Promise.all(transferenciasRemovidasIds.map((id) => trabalhoRendimentoService.removerTransferencia(id)));
      }

      const transferenciaIds: string[] = [];
      const beneficiosAtualizados: BeneficioValor[] = [];
      for (const item of beneficiosFamilia) {
        const beneficioId = await ensureBeneficioId(item.nome, item.beneficioId);
        const salva = await salvarTransferencia({
          id: item.transferenciaId,
          payload: {
            prontuario: resolvedProntuarioId,
            beneficio: beneficioId || undefined,
            valor: toNum(item.valor),
          },
        });
        if (salva?.id) {
          transferenciaIds.push(String(salva.id));
          beneficiosAtualizados.push({
            ...item,
            beneficioId: beneficioId || undefined,
            transferenciaId: String(salva.id),
          });
        }
      }
      setBeneficiosFamilia(beneficiosAtualizados);
      setTransferenciasRemovidasIds([]);

      const consolidado = await salvarConsolidado({
        id: trabalhoRendimentoId || undefined,
        payload: {
          prontuario: resolvedProntuarioId,
          trabalho_rendimento_membro: membrosApi.map((m) => String(m.id)),
          transferencia_renda_familia: transferenciaIds,
          renda_total: toNum(rendaFamiliarTotal),
          renda_per_capita: toNum(rendaPerCapita),
          parecer: parecer || undefined,
        },
      });
      if (consolidado?.id) setTrabalhoRendimentoId(String(consolidado.id));
      toast.success("Trabalho e rendimento salvo com sucesso!");
      onSave();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar trabalho e rendimento."));
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
      {/* 1. SEÇÃO: TRABALHO E RENDA (MANTIDA) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Briefcase className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Trabalho e Renda por Membro</h3>
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
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${"bg-slate-100 text-slate-500"}`}>
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
                          <Label className="text-xs font-bold uppercase text-slate-500">Condição de Ocupação</Label>
                          <Select value={memberFormData.ocupacao} onValueChange={(v) => handleFormChange("ocupacao", v)}>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NAO_TRABALHA">0 - Não trabalha</SelectItem>
                              <SelectItem value="CONTA_PROPRIA">1 - Conta própria (bico, autônomo)</SelectItem>
                              <SelectItem value="SEM_CARTEIRA">3 - Empregado sem carteira</SelectItem>
                              <SelectItem value="COM_CARTEIRA">4 - Empregado com carteira</SelectItem>
                              <SelectItem value="MILITAR_PUBLICO">8 - Militar ou servidor público</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-6 space-y-2">
                          <Label className="text-xs font-bold uppercase text-slate-500 italic">Vínculo Empregatício</Label>
                          <Select value={memberFormData.vinculo} onValueChange={(v) => handleFormChange("vinculo", v)}>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CLT">CLT</SelectItem>
                              <SelectItem value="AUTONOMO">Autônomo</SelectItem>
                              <SelectItem value="INFORMAL">Informal</SelectItem>
                              <SelectItem value="DESEMPREGADO">Desempregado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-4 space-y-2">
                          <Label className="text-xs font-bold uppercase text-slate-500 tracking-tight">Renda Individual (sem benefícios)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">R$</span>
                            <Input
                              className="bg-white pl-9"
                              type="text"
                              inputMode="numeric"
                              maxLength={CURRENCY_MAX_LENGTH}
                              value={formatCurrencyInput(memberFormData.rendaIndividual)}
                              onKeyDown={handleNumericValueKeyDown}
                              onChange={(e) => handleFormChange("rendaIndividual", parseCurrencyInput(e.target.value, CURRENCY_MAX_DIGITS))}
                            />
                          </div>
                        </div>

                        <div className="md:col-span-4 space-y-2">
                          <Label className="text-xs font-bold uppercase text-slate-500 italic">Possui carteira de trabalho?</Label>
                          <div className="flex items-center space-x-3 h-10 px-3 bg-white border rounded-md">
                            <Switch checked={memberFormData.carteiraAssinada} onCheckedChange={(c) => handleFormChange("carteiraAssinada", c)} />
                            <span className="text-sm font-medium">{memberFormData.carteiraAssinada ? "Sim" : "Não"}</span>
                          </div>
                        </div>

                        <div className="md:col-span-4 space-y-2">
                          <Label className="text-xs font-bold uppercase text-slate-500 italic">Aposentado/Pensionista?</Label>
                          <div className="flex items-center space-x-3 h-10 px-3 bg-white border rounded-md">
                            <Switch
                              checked={memberFormData.aposentadoPensionista}
                              onCheckedChange={(c) => handleFormChange("aposentadoPensionista", c)}
                            />
                            <span className="text-sm font-medium">{memberFormData.aposentadoPensionista ? "Sim" : "Não"}</span>
                          </div>
                        </div>

                        <div className="md:col-span-12 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase text-slate-500 italic flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" /> Qualificação Profissional
                            </Label>
                          </div>
                          <Popover open={qualificacaoPopoverOpen} onOpenChange={setQualificacaoPopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-between bg-white text-left font-normal hover:bg-slate-50">
                                <span className="truncate">{qualificacaoSelecionadaTexto || "Selecione..."}</span>
                                <ChevronDown className="w-4 h-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
                              <p className="px-2 pb-2 text-xs text-slate-500">{qualificacaoSelecaoAjudaTexto}</p>
                              {qualificacaoOptions.map((opt) => (
                                <label
                                  key={opt}
                                  className="flex cursor-pointer items-center gap-3 rounded-md border border-transparent p-2 hover:border-slate-200 hover:bg-slate-50"
                                >
                                  <Checkbox
                                    checked={memberFormData.qualificacaoProfissional.includes(opt)}
                                    onCheckedChange={(checked) => handleToggleQualificacao(opt, checked)}
                                  />
                                  <span className="text-sm text-slate-700">{formatQualificacaoLabel(opt)}</span>
                                </label>
                              ))}
                            </PopoverContent>
                          </Popover>
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

      {/* 2. SEÇÃO: RENDA FAMILIAR E BENEFÍCIOS DINÂMICOS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Wallet className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Renda Familiar Total e Benefícios</h3>
        </div>

        <Card className="shadow-sm border-l-4 border-l-primary">
          <CardContent className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase ">Renda total da família (Sem Benefícios)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">R$</span>
                  <Input
                    className="pl-9"
                    type="text"
                    inputMode="numeric"
                    maxLength={CURRENCY_MAX_LENGTH}
                    value={formatCurrencyValue(rendaFamiliarTotal)}
                    onKeyDown={handleNumericValueKeyDown}
                    onChange={(e) => handleChangeRendaFamiliarTotal(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500 italic">Renda familiar per capita (Sem Benefícios)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">R$</span>
                  <Input className="pl-9 bg-slate-50" type="text" inputMode="numeric" value={formatCurrencyValue(rendaPerCapita)} readOnly />
                </div>
              </div>
            </div>

            {/* SELEÇÃO DE BENEFÍCIOS */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                  <Banknote className="w-4 h-4" />
                  Benefícios sociais recebidos pela família
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary text-xs h-7 gap-1"
                  onClick={() => {
                    setNovoItemNome("");
                    setBeneficioModalOpen(true);
                  }}
                >
                  <PlusCircle className="w-3 h-3" /> Novo Tipo
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5">
                  <Popover open={beneficioSelectOpen} onOpenChange={setBeneficioSelectOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={beneficioSelectOpen}
                        className="w-full justify-between bg-white font-normal text-slate-500"
                        type="button"
                      >
                        Adicionar benefício...
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar benefício..." />
                        <CommandList onWheel={handleWheelOnCommandList} className="max-h-[240px] overscroll-contain">
                          <CommandEmpty>Nenhum benefício encontrado.</CommandEmpty>
                          <CommandGroup>
                            {beneficiosOptions.map((opt) => {
                              const jaAdicionado = beneficiosFamilia.some((beneficio) => beneficio.nome === opt);
                              return (
                                <CommandItem
                                  key={opt}
                                  value={opt}
                                  disabled={jaAdicionado}
                                  onSelect={() => {
                                    handleAddBeneficio(opt);
                                    setBeneficioSelectOpen(false);
                                  }}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${jaAdicionado ? "opacity-100" : "opacity-0"}`} />
                                  <span className="truncate">{opt}</span>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* LISTA DE BENEFÍCIOS ADICIONADOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {beneficiosFamilia.map((beneficio) => (
                  <div key={beneficio.nome} className="flex flex-col p-3 border rounded-lg bg-white space-y-2 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-700">{beneficio.nome}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-400 hover:text-red-600"
                        onClick={() => handleRemoveBeneficio(beneficio.nome)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 text-xs">R$</span>
                      <Input
                        placeholder="0,00"
                        type="text"
                        className="pl-8 h-9 text-sm"
                        inputMode="numeric"
                        maxLength={CURRENCY_MAX_LENGTH}
                        value={formatCurrencyValue(beneficio.valor)}
                        onKeyDown={handleNumericValueKeyDown}
                        onChange={(e) => handleUpdateBeneficioValor(beneficio.nome, parseCurrencyValue(e.target.value, CURRENCY_MAX_DIGITS))}
                      />
                    </div>
                  </div>
                ))}
                {beneficiosFamilia.length === 0 && (
                  <div className="md:col-span-2 py-8 border-2 border-dashed rounded-lg text-center text-slate-400 text-sm">
                    Nenhum benefício selecionado. Use o campo acima para adicionar.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6 bg-slate-50/50 -mx-6 px-6 -mb-6 pb-6 rounded-b-lg">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-primary">Renda Total + Benefícios</Label>
                <Input
                  className="bg-white font-bold text-primary border-primary/30"
                  type="text"
                  inputMode="numeric"
                  value={formatCurrencyValue(rendaTotalIncluindoBeneficios)}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-primary italic">Renda Per Capita Final</Label>
                <Input
                  className="bg-white font-bold text-primary border-primary/30"
                  type="text"
                  inputMode="numeric"
                  value={formatCurrencyValue(rendaPerCapitaIncluindoBeneficios)}
                  readOnly
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 3. PARECER TÉCNICO (MANTIDO) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Info className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Parecer sobre Trabalho e Renda</h3>
        </div>
        <Card className="shadow-sm ">
          <CardContent className="p-6">
            <Label className="text-xs font-bold uppercase text-slate-500 block mb-3">Diagnóstico Situacional</Label>
            <Textarea
              className="min-h-[100px] bg-slate-50/30"
              placeholder={
                "Descreva a vulnerabilidade econômica da família, potencial de inserção no mercado de trabalho, etc.\n(Atenção! Toda anotação incluída neste espaço deve ser precedida de data, nome e função do profissional responsável pela mesma)"
              }
              value={parecer}
              onChange={(e) => setParecer(e.target.value)}
              maxLength={600}
            />
            <p className="text-xs text-slate-400 text-right mt-1">{parecer.length}/600</p>
          </CardContent>
        </Card>
      </section>

      {/* NAVEGAÇÃO */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button
          variant="outline"
          onClick={handleSalvarGeral}
          className="gap-2"
          disabled={carregandoApi || salvandoMembro || salvandoTransferencia || salvandoConsolidado}
        >
          <Save className="w-4 h-4" /> {salvandoMembro || salvandoTransferencia || salvandoConsolidado ? "Salvando..." : "Salvar Rascunho"}
        </Button>
        <Button
          onClick={handleSubmit}
          className="gap-2 bg-primary"
          disabled={carregandoApi || salvandoMembro || salvandoTransferencia || salvandoConsolidado}
        >
          Salvar e avançar <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* MODAL UNIFICADO PARA CADASTRO DE OPÇÕES */}
      <Dialog open={beneficioModalOpen} onOpenChange={setBeneficioModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Novo Tipo de Benefício</DialogTitle>
            <DialogDescription>Cadastre uma nova opção para a listagem do sistema.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-xs font-bold uppercase text-slate-500">Nome do Item</Label>
            <Input
              className="mt-2"
              value={novoItemNome}
              maxLength={ITEM_NOME_MAX}
              onChange={(e) => setNovoItemNome(e.target.value.slice(0, ITEM_NOME_MAX))}
              placeholder="Ex: Auxílio Municipal"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBeneficioModalOpen(false)} disabled={salvandoNovoBeneficio}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarNovoBeneficio} disabled={salvandoNovoBeneficio}>
              {salvandoNovoBeneficio ? "Cadastrando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
