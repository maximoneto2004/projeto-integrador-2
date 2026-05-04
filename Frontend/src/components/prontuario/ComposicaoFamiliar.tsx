import { type WheelEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as Accordion from "@radix-ui/react-accordion";
import { ArrowRight, Check, ChevronDown, ChevronsUpDown, Plus, Save, Search, UserMinus, Users } from "lucide-react";
import { toast } from "@/lib/sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getApiErrorMessage } from "@/lib/notifications";
import { cidadaoService } from "@/services/sistema/cidadaoService";
import { membroComposicaoService, type MembroComposicaoResponse, type ParentescoOption } from "@/services/prontuario/membroComposicaoService";
import { pessoaReferenciaService } from "@/services/prontuario/pessoaReferenciaService";
import { exclusaoMembroComposicaoService } from "@/services/prontuario/exclusaoMembroComposicaoService";
import type { CidadaoPayload } from "@/types/api";
import type { MembroFamiliar, Prontuario } from "@/types/prontuario";

interface Props {
  prontuario: Prontuario | null;
  onNext: () => void;
  onSave: () => void;
  onDataChanged?: () => void;
}

type FieldErrors = Record<string, string>;

type CidadaoBusca = {
  id: string;
  nome: string;
  cpf: string;
  apelido?: string | null;
  email?: string | null;
  telefone?: string | null;
  sexo?: string | null;
  data_nascimento?: string | null;
};

type NovoCidadaoForm = {
  nome: string;
  cpf: string;
  apelido: string;
  sexo: string;
  dataNascimento: string;
  telefone: string;
  email: string;
};

type MembroItem = MembroFamiliar & {
  cidadaoId: string;
};

const isMembroAtivo = (item: MembroComposicaoResponse) => {
  const hasDataSaida = Boolean(item.data_saida);
  return item.ativo !== false && !hasDataSaida;
};

const getCidadaoIdFromMembro = (item: MembroComposicaoResponse) =>
  typeof item.cidadao === "object" ? String(item.cidadao?.id || "") : String(item.cidadao || "");

const DEFAULT_PARENTESCO_OPTIONS: ParentescoOption[] = [
  { value: "REFERENCIA", label: "Pessoa de Refer\u00eancia" },
  { value: "CONJUGE", label: "C\u00f4njuge/Companheiro(a)" },
  { value: "FILHO", label: "Filho(a)" },
  { value: "ENTEADO", label: "Enteado(a)" },
  { value: "BISNETO", label: "Bisneto(a)" },
  { value: "SOGRO", label: "Sogro(a)" },
  { value: "GENRO", label: "Genro" },
  { value: "NORA", label: "Nora" },
  { value: "NAO_PARENTE", label: "N\u00e3o Parente" },
  { value: "AVO", label: "AVÓ/AVÔ" },
  { value: "PAI", label: "Pai" },
  { value: "MAE", label: "M\u00e3e" },
  { value: "NETO", label: "Neto(a)" },
  { value: "IRMAO_IRMA", label: "Irm\u00e3o/Irm\u00e3" },
  { value: "OUTRO", label: "Outro" },
];

const CIDADAO_NOME_MAX = 150;
const CIDADAO_APELIDO_MAX = 150;
const CIDADAO_EMAIL_MAX = 254;
const CIDADAO_TELEFONE_MAX = 15;
const EXCLUSAO_MOTIVO_MAX = 600;
const BUSCA_TERMO_MAX = 150;

const normalizeParentesco = (value?: string) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

const parentescoToLabel = (value: string | undefined, options: ParentescoOption[]) => {
  const code = normalizeParentesco(value);
  return options.find((option) => option.value === code)?.label || value || "";
};

const parentescoToCode = (value: string | undefined, options: ParentescoOption[]) => {
  const normalized = normalizeParentesco(value);
  if (options.some((option) => option.value === normalized)) return normalized;

  const byLabel = options.find((option) => normalizeParentesco(option.label) === normalized);
  if (byLabel) return byLabel.value;

  return "OUTRO";
};

const digitsOnly = (value?: string) => (value || "").replace(/\D/g, "");
const digitsMax = (value: string, max: number) => digitsOnly(value).slice(0, max);
const normalizeCpf = (value?: string) => digitsOnly(value);
const personNameOnly = (value?: string) => (value || "").replace(/[^a-zA-ZÀ-ÿ\s'.-]/g, "");
const sanitizeEmail = (value?: string) => {
  const raw = (value || "").replace(/\s/g, "").replace(/[^a-zA-Z0-9._%+\-@]/g, "");
  const atIndex = raw.indexOf("@");
  if (atIndex === -1) return raw;
  const local = raw.slice(0, atIndex);
  const domain = raw.slice(atIndex + 1).replace(/@/g, "");
  return `${local}@${domain}`;
};
const sanitizeBuscaTermo = (value?: string) => (value || "").replace(/[^0-9a-zA-ZÀ-ÿ\s.-]/g, "");

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

const maskTelefone = (value?: string) => digitsMax(value || "", CIDADAO_TELEFONE_MAX);
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

const mapSexoToLabel = (value?: string | null) => {
  const normalized = (value || "").toUpperCase();
  if (normalized === "MASCULINO") return "Masculino";
  if (normalized === "FEMININO") return "Feminino";
  if (normalized === "OUTRO") return "Outro";
  return value || "";
};

const mapSexoToCode = (value?: string) => {
  const normalized = (value || "").toUpperCase();
  if (normalized === "MASCULINO") return "MASCULINO";
  if (normalized === "FEMININO") return "FEMININO";
  if (normalized === "OUTRO") return "OUTRO";
  if ((value || "").toLowerCase() === "masculino") return "MASCULINO";
  if ((value || "").toLowerCase() === "feminino") return "FEMININO";
  if ((value || "").toLowerCase() === "outro") return "OUTRO";
  return undefined;
};

const parseApiList = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "result" in payload) {
    const result = (payload as { result?: unknown }).result;
    if (Array.isArray(result)) return result as T[];
    if (result && typeof result === "object") return [result as T];
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

export function ComposicaoFamiliar({ prontuario, onNext, onSave, onDataChanged }: Props) {
  const [searchParams] = useSearchParams();
  const cpfFromQuery = useMemo(() => normalizeCpf(searchParams.get("cpf") || ""), [searchParams]);
  const cpfRef = useMemo(() => normalizeCpf(prontuario?.membros.find((m) => m.id === prontuario?.pessoaReferenciaId)?.cpf || ""), [prontuario]);
  const cpfLookup = cpfFromQuery || cpfRef;
  const prontuarioId = useMemo(
    () => searchParams.get("prontuarioId") || (cpfLookup ? localStorage.getItem(`prontuarioIdByCpf:${cpfLookup}`) || "" : ""),
    [searchParams, cpfLookup],
  );

  const [activeMembroId, setActiveMembroId] = useState("");
  const [adicionando, setAdicionando] = useState(false);
  const [membroExclusaoId, setMembroExclusaoId] = useState("");
  const [observacaoExclusao, setObservacaoExclusao] = useState("");
  const [salvandoMembro, setSalvandoMembro] = useState(false);
  const [salvandoExclusao, setSalvandoExclusao] = useState(false);
  const [buscaTermo, setBuscaTermo] = useState("");
  const [buscandoCidadao, setBuscandoCidadao] = useState(false);
  const [parentescoOpen, setParentescoOpen] = useState(false);
  const [membroExclusaoOpen, setMembroExclusaoOpen] = useState(false);
  const [parentescoOptions, setParentescoOptions] = useState<ParentescoOption[]>(DEFAULT_PARENTESCO_OPTIONS);
  const [resultadosBusca, setResultadosBusca] = useState<CidadaoBusca[]>([]);
  const [cidadaoSelecionado, setCidadaoSelecionado] = useState<CidadaoBusca | null>(null);
  const [membros, setMembros] = useState<MembroItem[]>([]);
  const [carregandoMembros, setCarregandoMembros] = useState(false);
  const [modalNovoCidadaoOpen, setModalNovoCidadaoOpen] = useState(false);
  const [salvandoNovoCidadao, setSalvandoNovoCidadao] = useState(false);
  const [bairroPessoaReferenciaId, setBairroPessoaReferenciaId] = useState<string>("");
  const [novoCidadao, setNovoCidadao] = useState<NovoCidadaoForm>({
    nome: "",
    cpf: "",
    apelido: "",
    sexo: "",
    dataNascimento: "",
    telefone: "",
    email: "",
  });
  const [form, setForm] = useState<{ id: string; parentesco: string }>({
    id: "",

    parentesco: "",
  });
  const [formCidadaoExistente, setFormCidadaoExistente] = useState<NovoCidadaoForm>({
    nome: "",
    cpf: "",
    apelido: "",
    sexo: "",
    dataNascimento: "",
    telefone: "",
    email: "",
  });
  const [membroFieldErrors, setMembroFieldErrors] = useState<FieldErrors>({});
  const [novoCidadaoFieldErrors, setNovoCidadaoFieldErrors] = useState<FieldErrors>({});
  const [exclusaoFieldErrors, setExclusaoFieldErrors] = useState<FieldErrors>({});

  const parentescoOptionsVisiveis = useMemo(
    () => parentescoOptions.filter((option) => (form.id ? true : option.value !== "REFERENCIA")),
    [parentescoOptions, form.id],
  );

  const parentescoSelecionadoLabel = useMemo(
    () => parentescoOptionsVisiveis.find((option) => option.value === form.parentesco)?.label || "",
    [parentescoOptionsVisiveis, form.parentesco],
  );

  const membroExclusaoSelecionadoLabel = useMemo(() => {
    const membro = membros.find((item) => item.id === membroExclusaoId);
    if (!membro) return "";
    return `${membro.nome} (${membro.parentesco})`;
  }, [membros, membroExclusaoId]);

  const handleWheelOnCommandList = (event: WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    container.scrollTop += event.deltaY;
    event.preventDefault();
    event.stopPropagation();
  };

  const clearMembroFieldError = (...fields: string[]) => {
    setMembroFieldErrors((prev) => {
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

  const clearNovoCidadaoFieldError = (...fields: string[]) => {
    setNovoCidadaoFieldErrors((prev) => {
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

  const clearExclusaoFieldError = (...fields: string[]) => {
    setExclusaoFieldErrors((prev) => {
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

  const resetFormMembro = () => {
    setForm({ id: "", parentesco: "" });
    setParentescoOpen(false);
    setBuscaTermo("");
    setResultadosBusca([]);
    setCidadaoSelecionado(null);
    setFormCidadaoExistente({
      nome: "",
      cpf: "",
      apelido: "",
      sexo: "",
      dataNascimento: "",
      telefone: "",
      email: "",
    });
    setMembroFieldErrors({});
  };

  const resetNovoCidadao = () => {
    setNovoCidadao({
      nome: "",
      cpf: "",
      apelido: "",
      sexo: "",
      dataNascimento: "",
      telefone: "",
      email: "",
    });
    setNovoCidadaoFieldErrors({});
  };

  const handleNovoMembroModalChange = (open: boolean) => {
    setAdicionando(open);
    if (!open) {
      resetFormMembro();
      setActiveMembroId("");
    }
  };

  useEffect(() => {
    const carregarOpcoesParentesco = async () => {
      try {
        const { data } = await membroComposicaoService.listarParentescos();
        const opcoes = parseApiList<ParentescoOption>(data).filter((item) => item && item.value && item.label);
        if (opcoes.length > 0) {
          setParentescoOptions(opcoes);
        }
      } catch {
        // fallback: mantém opções padrão locais
      }
    };

    carregarOpcoesParentesco();
  }, []);

  const carregarMembrosApi = async () => {
    if (!prontuarioId) return;
    setCarregandoMembros(true);
    try {
      const { data } = await membroComposicaoService.listar({ prontuario: prontuarioId });
      const membrosRaw = parseApiList<MembroComposicaoResponse>(data);
      const membrosAtivosRaw = membrosRaw.filter(isMembroAtivo);
      const membrosConvertidos = await Promise.all(
        membrosAtivosRaw.map(async (membroRaw, index) => {
          const cidadaoId = getCidadaoIdFromMembro(membroRaw);

          let cidadaoCompleto: Partial<CidadaoBusca> = {};
          if (cidadaoId) {
            try {
              const responseCidadao = await cidadaoService.obter(cidadaoId);
              cidadaoCompleto = parseApiObject<Partial<CidadaoBusca>>(responseCidadao.data) || {};
            } catch {
              cidadaoCompleto = {};
            }
          }

          const nomeFallback = typeof membroRaw.cidadao === "object" ? membroRaw.cidadao?.nome_completo || "" : "";

          return {
            id: String(membroRaw.id),
            cidadaoId: String(cidadaoId || ""),
            cpf: maskCpf(String(cidadaoCompleto.cpf || "")),
            nome: String(cidadaoCompleto.nome || nomeFallback || "Sem nome"),
            apelido: String(cidadaoCompleto.apelido || ""),
            email: String(cidadaoCompleto.email || ""),
            telefone: maskTelefone(String(cidadaoCompleto.telefone || "")),
            sexo: mapSexoToLabel(String(cidadaoCompleto.sexo || "")),
            dataNascimento: String(cidadaoCompleto.data_nascimento || ""),
            parentesco: parentescoToLabel(membroRaw.parentesco || "", parentescoOptions),
            ordem: index + 1,
          } as MembroItem;
        }),
      );
      setMembros(membrosConvertidos);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível carregar os membros da composição familiar."));
    } finally {
      setCarregandoMembros(false);
    }
  };

  useEffect(() => {
    if (!prontuarioId) return;
    carregarMembrosApi();
  }, [prontuarioId, parentescoOptions]);

  useEffect(() => {
    if (!prontuarioId) return;

    const carregarBairroPessoaReferencia = async () => {
      try {
        const { data } = await pessoaReferenciaService.listar({ prontuario: prontuarioId });
        const lista = parseApiList<any>(data);
        const item = lista[0];
        if (!item) return;

        const bairroRaw = item?.bairro;
        const bairroId = bairroRaw && typeof bairroRaw === "object" ? String(bairroRaw?.id || "") : String(bairroRaw || "");

        setBairroPessoaReferenciaId(bairroId);
      } catch {
        setBairroPessoaReferenciaId("");
      }
    };

    carregarBairroPessoaReferencia();
  }, [prontuarioId]);

  useEffect(() => {
    if (!activeMembroId) return;
    const membro = membros.find((m) => String(m.id) === String(activeMembroId));
    if (!membro) return;
    setForm({ id: membro.id, parentesco: parentescoToCode(membro.parentesco, parentescoOptions) });
    setCidadaoSelecionado({
      id: membro.cidadaoId,
      nome: membro.nome,
      cpf: membro.cpf,
      apelido: membro.apelido,
      email: membro.email,
      telefone: membro.telefone,
      sexo: membro.sexo,
      data_nascimento: membro.dataNascimento,
    });
    setFormCidadaoExistente({
      nome: membro.nome || "",
      cpf: maskCpf(membro.cpf || ""),
      apelido: membro.apelido || "",
      sexo: membro.sexo || "",
      dataNascimento: membro.dataNascimento || "",
      telefone: maskTelefone(membro.telefone || ""),
      email: membro.email || "",
    });

    setResultadosBusca([]);
  }, [activeMembroId, membros, parentescoOptions]);

  useEffect(() => {
    if (!form.id) return;
    if (!cidadaoSelecionado?.id) return;

    const carregarDetalhesCidadao = async () => {
      try {
        const response = await cidadaoService.obter(cidadaoSelecionado.id);
        const data = parseApiObject<any>(response.data) || {};
        setFormCidadaoExistente({
          nome: String(data?.nome || ""),
          cpf: maskCpf(String(data?.cpf || "")),
          apelido: String(data?.apelido || ""),
          sexo: mapSexoToLabel(String(data?.sexo || "")),
          dataNascimento: String(data?.data_nascimento || ""),
          telefone: maskTelefone(String(data?.telefone || "")),
          email: String(data?.email || ""),
        });
      } catch {
        // fallback silencioso: mantém os valores já carregados na lista
      }
    };

    carregarDetalhesCidadao();
  }, [form.id, cidadaoSelecionado?.id]);

  const handleBuscarCidadao = async () => {
    const termo = buscaTermo.trim();
    if (!termo) {
      toast.error("Informe CPF para pesquisar.");
      return;
    }

    setBuscandoCidadao(true);
    setResultadosBusca([]);
    setCidadaoSelecionado(null);

    try {
      const cpf = normalizeCpf(termo);
      const params = cpf.length >= 11 ? { cpf, limit: 10 } : { search: termo, limit: 10 };
      const { data } = await cidadaoService.listar(params);
      const lista = Array.isArray(data) ? data : data?.results || [];
      const resultado = (lista || []).map((item: any) => ({
        id: String(item?.id || ""),
        nome: String(item?.nome || ""),
        cpf: maskCpf(String(item?.cpf || "")),
        apelido: item?.apelido || "",
        email: item?.email || "",
        telefone: maskTelefone(item?.telefone || ""),
        sexo: item?.sexo || "",
        data_nascimento: item?.data_nascimento || "",
      }));
      setResultadosBusca(resultado);
      if (!resultado.length) {
        toast.warning("Nenhum cidadão encontrado. Use o botão Cadastrar um cidadão.");
      }
    } catch (err) {
      console.log(err);
      toast.error(getApiErrorMessage(err, "Não foi possível pesquisar o cidadão."));
    } finally {
      setBuscandoCidadao(false);
    }
  };

  const handleSalvarNovoCidadao = async () => {
    setNovoCidadaoFieldErrors({});
    const cpf = normalizeCpf(novoCidadao.cpf);
    if (!novoCidadao.nome.trim() || !cpf) {
      setNovoCidadaoFieldErrors({
        ...(novoCidadao.nome.trim() ? {} : { nome: "Nome é obrigatório." }),
        ...(cpf ? {} : { cpf: "CPF é obrigatório." }),
      });
      toast.error("Nome e CPF são obrigatórios para cadastrar cidadão.");
      return;
    }

    setSalvandoNovoCidadao(true);
    try {
      const payload: CidadaoPayload = {
        nome: personNameOnly(novoCidadao.nome).trim(),
        cpf,
        telefone: digitsMax(novoCidadao.telefone || "", CIDADAO_TELEFONE_MAX),
        email: sanitizeEmail(novoCidadao.email).trim() || undefined,
        data_nascimento: novoCidadao.dataNascimento || undefined,
        sexo: mapSexoToCode(novoCidadao.sexo),
        apelido: personNameOnly(novoCidadao.apelido).trim() || null,
        bairro: bairroPessoaReferenciaId || undefined,
      };

      const response = await cidadaoService.criar(payload);
      const data = parseApiObject<any>(response.data) || {};
      const cidadaoCriado: CidadaoBusca = {
        id: String(data?.id || ""),
        nome: String(data?.nome || personNameOnly(novoCidadao.nome)),
        cpf: maskCpf(String(data?.cpf || cpf)),
        apelido: data?.apelido || personNameOnly(novoCidadao.apelido),
        email: data?.email || sanitizeEmail(novoCidadao.email),
        telefone: maskTelefone(data?.telefone || novoCidadao.telefone),
        sexo: data?.sexo || novoCidadao.sexo,
        data_nascimento: data?.data_nascimento || novoCidadao.dataNascimento,
      };

      setCidadaoSelecionado(cidadaoCriado);
      setResultadosBusca([]);
      setModalNovoCidadaoOpen(false);
      resetNovoCidadao();
      toast.success("Cidadão cadastrado com sucesso.");
    } catch (err) {
      const apiErrors = extractFieldErrors(err, new Set(["nome", "cpf", "apelido", "sexo", "data_nascimento", "telefone", "email", "bairro"]));
      if (Object.keys(apiErrors).length) {
        setNovoCidadaoFieldErrors(apiErrors);
        toast.error("Encontramos erros no cadastro. Revise os campos destacados e tente novamente.");
        return;
      }
      toast.error(getApiErrorMessage(err, "Não foi possível cadastrar o cidadão."));
    } finally {
      setSalvandoNovoCidadao(false);
    }
  };

  const handleSalvarMembro = async () => {
    setMembroFieldErrors({});
    if (!form.parentesco) {
      setMembroFieldErrors({ parentesco: "Selecione o parentesco do membro." });
      toast.error("Selecione o parentesco do membro.");
      return;
    }
    const parentescoCode = parentescoToCode(form.parentesco, parentescoOptions);
    if (!form.id && parentescoCode === "REFERENCIA") {
      setMembroFieldErrors({ parentesco: "Pessoa de Referência não pode ser selecionada ao adicionar membro." });
      toast.error("Pessoa de Referência não pode ser selecionada ao adicionar membro.");
      return;
    }
    if (!form.id && !cidadaoSelecionado?.id) {
      setMembroFieldErrors({ cidadao: "Selecione ou cadastre um cidadão para continuar." });
      toast.error("Selecione um cidadão existente ou cadastre um novo no modal.");
      return;
    }
    if (!form.id && !prontuarioId) {
      toast.error("Prontuário não identificado na URL. Abra esta tela com um prontuário válido.");
      return;
    }

    setSalvandoMembro(true);
    try {
      if (form.id) {
        if (cidadaoSelecionado?.id) {
          await cidadaoService.atualizar(cidadaoSelecionado.id, {
            nome: personNameOnly(formCidadaoExistente.nome).trim(),
            cpf: normalizeCpf(formCidadaoExistente.cpf),
            apelido: personNameOnly(formCidadaoExistente.apelido).trim() || null,
            telefone: digitsMax(formCidadaoExistente.telefone || "", CIDADAO_TELEFONE_MAX),
            email: sanitizeEmail(formCidadaoExistente.email).trim() || undefined,
            data_nascimento: formCidadaoExistente.dataNascimento || undefined,
            sexo: mapSexoToCode(formCidadaoExistente.sexo),
          });
        }

        await membroComposicaoService.atualizar(form.id, {
          parentesco: parentescoCode,
          responsavel: parentescoCode === "REFERENCIA",
        });
        toast.success("Membro atualizado.");
      } else {
        const cidadaoId = String(cidadaoSelecionado?.id || "");
        const { data } = await membroComposicaoService.listar({ prontuario: prontuarioId });
        const membrosRaw = parseApiList<MembroComposicaoResponse>(data);
        const membroExistenteMesmoCidadao = membrosRaw.find((item) => getCidadaoIdFromMembro(item) === cidadaoId);

        if (membroExistenteMesmoCidadao) {
          const membroInativo = membroExistenteMesmoCidadao.ativo === false || Boolean(membroExistenteMesmoCidadao.data_saida);
          if (!membroInativo) {
            setMembroFieldErrors({ cidadao: "Este cidadão já está na composição familiar." });
            toast.error("Este cidadão já está na composição familiar.");
            return;
          }

          await membroComposicaoService.atualizar(String(membroExistenteMesmoCidadao.id), {
            parentesco: parentescoCode,
            responsavel: parentescoCode === "REFERENCIA",
            ativo: true,
            data_saida: null,
          });
          toast.success("Membro reativado e adicionado novamente.");
        } else {
          await membroComposicaoService.criar({
            prontuario: prontuarioId,
            cidadao: cidadaoId,
            parentesco: parentescoCode,
            responsavel: parentescoCode === "REFERENCIA",
            ativo: true,
            data_entrada: new Date().toISOString().split("T")[0],
          });
          toast.success("Membro adicionado.");
        }
      }

      if (prontuarioId) {
        await carregarMembrosApi();
      } else {
        setMembros((prev) =>
          prev.map((item) =>
            String(item.id) === String(form.id)
              ? {
                  ...item,
                  nome: personNameOnly(formCidadaoExistente.nome) || item.nome,
                  cpf: maskCpf(formCidadaoExistente.cpf) || item.cpf,
                  apelido: personNameOnly(formCidadaoExistente.apelido) || "",
                  telefone: maskTelefone(formCidadaoExistente.telefone || ""),
                  email: sanitizeEmail(formCidadaoExistente.email) || "",
                  sexo: formCidadaoExistente.sexo || "",
                  dataNascimento: formCidadaoExistente.dataNascimento || "",
                  parentesco: parentescoToLabel(form.parentesco, parentescoOptions),
                }
              : item,
          ),
        );
      }
      onSave();
      onDataChanged?.();
      setAdicionando(false);
      setActiveMembroId("");
      resetFormMembro();
    } catch (err) {
      const apiErrors = extractFieldErrors(
        err,
        new Set(["nome", "cpf", "apelido", "sexo", "data_nascimento", "telefone", "email", "parentesco", "cidadao", "prontuario"]),
      );
      if (Object.keys(apiErrors).length) {
        setMembroFieldErrors(apiErrors);
        toast.error("Encontramos erros no formulário. Revise os campos destacados e tente novamente.");
        return;
      }
      toast.error(getApiErrorMessage(err, "Não foi possível salvar o membro."));
    } finally {
      setSalvandoMembro(false);
    }
  };

  const handleRegistrarExclusao = async () => {
    setExclusaoFieldErrors({});
    if (!membroExclusaoId) {
      setExclusaoFieldErrors({ membro: "Selecione o membro que será removido." });
      toast.error("Selecione o membro que será removido.");
      return;
    }

    const motivo = observacaoExclusao.trim();
    if (!motivo) {
      setExclusaoFieldErrors({ motivo: "Informe o motivo da exclusão." });
      toast.error("Informe o motivo da exclusão.");
      return;
    }

    setSalvandoExclusao(true);
    try {
      await exclusaoMembroComposicaoService.criar({ membro_id: membroExclusaoId, motivo });
      // await membroComposicaoService.atualizar(membroExclusaoId, {
      //   ativo: false,
      //   data_saida: new Date().toISOString().split("T")[0],
      // });

      await carregarMembrosApi();
      setMembroExclusaoId("");
      setMembroExclusaoOpen(false);
      setObservacaoExclusao("");
      if (activeMembroId === membroExclusaoId) {
        setActiveMembroId("");
        setAdicionando(false);
        resetFormMembro();
      }
      onSave();
      onDataChanged?.();
      toast.success("Exclusão registrada com sucesso.");
    } catch (err) {
      console.log(err);
      const apiErrors = extractFieldErrors(err, new Set(["membro", "motivo"]));
      if (Object.keys(apiErrors).length) {
        setExclusaoFieldErrors(apiErrors);
        toast.error("Encontramos erros na exclusão. Revise os campos destacados e tente novamente.");
        return;
      }
      toast.error(getApiErrorMessage(err, "Não foi possível registrar a exclusão."));
    } finally {
      setSalvandoExclusao(false);
    }
  };

  if (!prontuario) {
    return <div className="text-center p-8 text-muted-foreground">Carregando prontuário...</div>;
  }

  const renderFormularioMembro = () => (
    <div className="space-y-6 p-6 border rounded-xl bg-slate-50/50">
      {!form.id && (
        <div className="space-y-3 p-4 bg-white rounded-lg border border-slate-200">
          <Label className="text-xs font-bold uppercase text-slate-500">Pesquisar cidadão por CPF</Label>
          <div className="flex flex-col md:flex-row gap-2">
            <Input
              className="bg-white"
              value={buscaTermo}
              maxLength={BUSCA_TERMO_MAX}
              onChange={(e) => setBuscaTermo(e.target.value.replace(/\D/g, "").slice(0, BUSCA_TERMO_MAX))}
              placeholder="Digite CPF "
            />
            <Button type="button" variant="outline" className="gap-2" onClick={handleBuscarCidadao} disabled={buscandoCidadao}>
              <Search className="w-4 h-4" />
              {buscandoCidadao ? "Pesquisando..." : "Pesquisar"}
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={() => setModalNovoCidadaoOpen(true)}>
              <Plus className="w-4 h-4" />
              Cadastrar um cidadão
            </Button>
          </div>

          {resultadosBusca.length > 0 && (
            <div className="space-y-2 pt-2">
              {resultadosBusca.map((cidadao) => (
                <button
                  type="button"
                  key={cidadao.id}
                  className="w-full text-left p-3 rounded-md border hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    setCidadaoSelecionado(cidadao);
                    setResultadosBusca([]);
                    clearMembroFieldError("cidadao");
                  }}
                >
                  <p className="font-medium text-sm text-slate-700">{cidadao.nome}</p>
                  <p className="text-xs text-slate-500">CPF {cidadao.cpf}</p>
                </button>
              ))}
            </div>
          )}

          {cidadaoSelecionado && (
            <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-sm font-medium text-emerald-900">{cidadaoSelecionado.nome}</p>
              <p className="text-xs text-emerald-700">CPF {cidadaoSelecionado.cpf}</p>
            </div>
          )}
        </div>
      )}

      {form.id && cidadaoSelecionado && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">Nome Completo *</Label>
            <Input
              className="bg-white"
              value={formCidadaoExistente.nome}
              maxLength={CIDADAO_NOME_MAX}
              onChange={(e) => {
                setFormCidadaoExistente((prev) => ({ ...prev, nome: textMax(personNameOnly(e.target.value), CIDADAO_NOME_MAX) }));
                clearMembroFieldError("nome");
              }}
              placeholder="Nome do familiar"
            />
            {!!membroFieldErrors.nome && <p className="text-xs text-red-600">{membroFieldErrors.nome}</p>}
          </div>

          <div className="md:col-span-4 space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">Apelido</Label>
            <Input
              className="bg-white"
              value={formCidadaoExistente.apelido}
              maxLength={CIDADAO_APELIDO_MAX}
              onChange={(e) => {
                setFormCidadaoExistente((prev) => ({ ...prev, apelido: textMax(personNameOnly(e.target.value), CIDADAO_APELIDO_MAX) }));
                clearMembroFieldError("apelido");
              }}
            />
            {!!membroFieldErrors.apelido && <p className="text-xs text-red-600">{membroFieldErrors.apelido}</p>}
          </div>

          <div className="md:col-span-4 space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">CPF *</Label>
            <Input
              className="bg-white"
              value={formCidadaoExistente.cpf}
              inputMode="numeric"
              maxLength={14}
              onChange={(e) => {
                setFormCidadaoExistente((prev) => ({ ...prev, cpf: maskCpf(e.target.value) }));
                clearMembroFieldError("cpf");
              }}
              placeholder="000.000.000-00"
            />
            {!!membroFieldErrors.cpf && <p className="text-xs text-red-600">{membroFieldErrors.cpf}</p>}
          </div>

          <div className="md:col-span-4 space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">Sexo</Label>
            <Select
              value={formCidadaoExistente.sexo}
              onValueChange={(v) => {
                setFormCidadaoExistente((prev) => ({ ...prev, sexo: v }));
                clearMembroFieldError("sexo");
              }}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Masculino">Masculino</SelectItem>
                <SelectItem value="Feminino">Feminino</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
            {!!membroFieldErrors.sexo && <p className="text-xs text-red-600">{membroFieldErrors.sexo}</p>}
          </div>

          <div className="md:col-span-4 space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">Data de Nascimento</Label>
            <Input
              className="bg-white"
              type="date"
              value={formCidadaoExistente.dataNascimento}
              onChange={(e) => {
                setFormCidadaoExistente((prev) => ({ ...prev, dataNascimento: e.target.value }));
                clearMembroFieldError("data_nascimento");
              }}
            />
            {!!membroFieldErrors.data_nascimento && <p className="text-xs text-red-600">{membroFieldErrors.data_nascimento}</p>}
          </div>

          <div className="md:col-span-4 space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">Telefone</Label>
            <Input
              className="bg-white"
              value={formCidadaoExistente.telefone}
              inputMode="numeric"
              maxLength={CIDADAO_TELEFONE_MAX}
              onChange={(e) => {
                setFormCidadaoExistente((prev) => ({ ...prev, telefone: maskTelefone(e.target.value) }));
                clearMembroFieldError("telefone");
              }}
              placeholder="Somente números"
            />
            {!!membroFieldErrors.telefone && <p className="text-xs text-red-600">{membroFieldErrors.telefone}</p>}
          </div>

          <div className="md:col-span-4 space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">E-mail</Label>
            <Input
              className="bg-white"
              type="email"
              value={formCidadaoExistente.email}
              maxLength={CIDADAO_EMAIL_MAX}
              onChange={(e) => {
                setFormCidadaoExistente((prev) => ({ ...prev, email: textMax(sanitizeEmail(e.target.value), CIDADAO_EMAIL_MAX) }));
                clearMembroFieldError("email");
              }}
              placeholder="email@exemplo.com"
            />
            {!!membroFieldErrors.email && <p className="text-xs text-red-600">{membroFieldErrors.email}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-6 space-y-2">
          <Label className="text-xs font-bold uppercase text-slate-500">Parentesco *</Label>
          <Popover open={parentescoOpen} onOpenChange={setParentescoOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={parentescoOpen}
                className="w-full justify-between bg-white border-primary/20 font-medium"
              >
                <span className="truncate">{parentescoSelecionadoLabel || "Selecione"}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar parentesco..." />
                <CommandList onWheel={handleWheelOnCommandList} className="overscroll-contain">
                  <CommandEmpty>Nenhum parentesco encontrado.</CommandEmpty>
                  <CommandGroup>
                    {parentescoOptionsVisiveis.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.label}
                        onSelect={() => {
                          setForm((prev) => ({ ...prev, parentesco: option.value }));
                          clearMembroFieldError("parentesco");
                          setParentescoOpen(false);
                        }}
                      >
                        <Check className={`mr-2 h-4 w-4 ${form.parentesco === option.value ? "opacity-100" : "opacity-0"}`} />
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {!!membroFieldErrors.parentesco && <p className="text-xs text-red-600">{membroFieldErrors.parentesco}</p>}
          {!!membroFieldErrors.cidadao && <p className="text-xs text-red-600">{membroFieldErrors.cidadao}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          variant="ghost"
          className="text-slate-500"
          onClick={() => {
            resetFormMembro();
            setAdicionando(false);
            setActiveMembroId("");
          }}
        >
          Cancelar
        </Button>
        <Button onClick={handleSalvarMembro} className="gap-2" disabled={salvandoMembro}>
          <Save className="w-4 h-4" />
          {salvandoMembro ? "Salvando..." : form.id ? "Atualizar" : "Confirmar Adição"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg text-slate-800">Composição Familiar</h3>
          </div>
          {!adicionando && (
            <Button
              size="sm"
              onClick={() => {
                setActiveMembroId("");
                setAdicionando(true);
                resetFormMembro();
              }}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> Novo Membro
            </Button>
          )}
        </div>

        {!prontuarioId && membros.length === 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 text-sm text-amber-900">
              Prontuário sem ID na URL. Para operar sem mock, abra a tela com `prontuarioId` na query string.
            </CardContent>
          </Card>
        )}

        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Accordion.Root
              type="single"
              collapsible
              value={activeMembroId}
              onValueChange={(value) => {
                setActiveMembroId(value);
                if (value) setAdicionando(false);
              }}
              className="w-full"
            >
              {membros.map((m, index) => (
                <Accordion.Item key={m.id} value={m.id} className="border-b last:border-0">
                  <Accordion.Header>
                    <Accordion.Trigger className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                          {m.ordem}o
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-slate-700 group-data-[state=open]:text-primary transition-colors">{m.nome}</p>
                          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                            {m.parentesco} • CPF {m.cpf}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400 group-data-[state=open]:rotate-180 transition-transform" />
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className="p-6 bg-slate-50/50 border-t">{renderFormularioMembro()}</Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion.Root>

            {carregandoMembros && <div className="p-6 text-sm text-slate-500 border-t bg-slate-50">Carregando membros...</div>}

            {membros.length === 0 && !adicionando && !carregandoMembros && (
              <div className="p-12 text-center space-y-2">
                <Users className="w-12 h-12 text-slate-200 mx-auto" />
                <p className="text-slate-400">Nenhum membro cadastrado.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1 ">
          <UserMinus className="w-5 h-5 text-red-600" />
          <h3 className="font-semibold text-lg">Histórico de Exclusão</h3>
        </div>
        <Card className="border-red-100 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <p className="text-sm text-slate-500 leading-relaxed">
              Utilize este campo apenas para registrar a saída definitiva de um membro do núcleo familiar.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Membro a ser removido</Label>
                <Popover open={membroExclusaoOpen} onOpenChange={setMembroExclusaoOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={membroExclusaoOpen} className="w-full justify-between bg-white">
                      <span className="truncate">{membroExclusaoSelecionadoLabel || "Selecione o membro"}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar membro..." />
                      <CommandList onWheel={handleWheelOnCommandList} className="overscroll-contain">
                        <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                        <CommandGroup>
                          {membros.map((m) => (
                            <CommandItem
                              value={`${m.nome} ${m.parentesco}`.trim()}
                              key={m.id}
                              onSelect={() => {
                                setMembroExclusaoId(m.id);
                                clearExclusaoFieldError("membro");
                                setMembroExclusaoOpen(false);
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 ${membroExclusaoId === m.id ? "opacity-100" : "opacity-0"}`} />
                              {m.nome} ({m.parentesco})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {!!exclusaoFieldErrors.membro && <p className="text-xs text-red-600">{exclusaoFieldErrors.membro}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Motivo da Exclusão</Label>
                <Textarea
                  placeholder="Ex: Mudança para outro município."
                  value={observacaoExclusao}
                  maxLength={EXCLUSAO_MOTIVO_MAX}
                  onChange={(e) => {
                    setObservacaoExclusao(textMax(e.target.value, EXCLUSAO_MOTIVO_MAX));
                    clearExclusaoFieldError("motivo");
                  }}
                  className="h-20 bg-white"
                />
                {!!exclusaoFieldErrors.motivo && <p className="text-xs text-red-600">{exclusaoFieldErrors.motivo}</p>}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={handleRegistrarExclusao}
                disabled={salvandoExclusao || membros.length === 0}
              >
                {salvandoExclusao ? "Registrando..." : "Registrar Exclusão"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button variant="outline" onClick={onSave} className="gap-2">
          Apenas Salvar
        </Button>
        <Button
          onClick={() => {
            toast.success("Etapa salva com sucesso!");
            onNext();
          }}
          className="gap-2"
        >
          Salvar e avançar <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <Dialog open={adicionando} onOpenChange={handleNovoMembroModalChange}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Novo membro da composição familiar</DialogTitle>
            <DialogDescription>Pesquise ou cadastre um cidadão e informe o parentesco para adicionar.</DialogDescription>
          </DialogHeader>
          {renderFormularioMembro()}
        </DialogContent>
      </Dialog>

      <Dialog open={modalNovoCidadaoOpen} onOpenChange={setModalNovoCidadaoOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cadastrar um cidadão"</DialogTitle>
            <DialogDescription>Preencha os dados e conclua o cadastro para adicionar na composição familiar.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8 space-y-2">
              <Label>Nome completo *</Label>
              <Input
                value={novoCidadao.nome}
                maxLength={CIDADAO_NOME_MAX}
                onChange={(e) => {
                  setNovoCidadao((prev) => ({ ...prev, nome: textMax(personNameOnly(e.target.value), CIDADAO_NOME_MAX) }));
                  clearNovoCidadaoFieldError("nome");
                }}
              />
              {!!novoCidadaoFieldErrors.nome && <p className="text-xs text-red-600">{novoCidadaoFieldErrors.nome}</p>}
            </div>
            <div className="md:col-span-4 space-y-2">
              <Label>Apelido</Label>
              <Input
                value={novoCidadao.apelido}
                maxLength={CIDADAO_APELIDO_MAX}
                onChange={(e) => {
                  setNovoCidadao((prev) => ({ ...prev, apelido: textMax(personNameOnly(e.target.value), CIDADAO_APELIDO_MAX) }));
                  clearNovoCidadaoFieldError("apelido");
                }}
              />
              {!!novoCidadaoFieldErrors.apelido && <p className="text-xs text-red-600">{novoCidadaoFieldErrors.apelido}</p>}
            </div>
            <div className="md:col-span-4 space-y-2">
              <Label>CPF *</Label>
              <Input
                value={novoCidadao.cpf}
                inputMode="numeric"
                maxLength={14}
                onChange={(e) => {
                  setNovoCidadao((prev) => ({ ...prev, cpf: maskCpf(e.target.value) }));
                  clearNovoCidadaoFieldError("cpf");
                }}
              />
              {!!novoCidadaoFieldErrors.cpf && <p className="text-xs text-red-600">{novoCidadaoFieldErrors.cpf}</p>}
            </div>
            <div className="md:col-span-4 space-y-2">
              <Label>Sexo</Label>
              <Select
                value={novoCidadao.sexo}
                onValueChange={(v) => {
                  setNovoCidadao((prev) => ({ ...prev, sexo: v }));
                  clearNovoCidadaoFieldError("sexo");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Feminino">Feminino</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
              {!!novoCidadaoFieldErrors.sexo && <p className="text-xs text-red-600">{novoCidadaoFieldErrors.sexo}</p>}
            </div>
            <div className="md:col-span-4 space-y-2">
              <Label>Data de nascimento</Label>
              <Input
                type="date"
                value={novoCidadao.dataNascimento}
                onChange={(e) => {
                  setNovoCidadao((prev) => ({ ...prev, dataNascimento: e.target.value }));
                  clearNovoCidadaoFieldError("data_nascimento");
                }}
              />
              {!!novoCidadaoFieldErrors.data_nascimento && <p className="text-xs text-red-600">{novoCidadaoFieldErrors.data_nascimento}</p>}
            </div>
            <div className="md:col-span-6 space-y-2">
              <Label>Telefone</Label>
              <Input
                value={novoCidadao.telefone}
                inputMode="numeric"
                maxLength={CIDADAO_TELEFONE_MAX}
                onChange={(e) => {
                  setNovoCidadao((prev) => ({ ...prev, telefone: maskTelefone(e.target.value) }));
                  clearNovoCidadaoFieldError("telefone");
                }}
              />
              {!!novoCidadaoFieldErrors.telefone && <p className="text-xs text-red-600">{novoCidadaoFieldErrors.telefone}</p>}
            </div>
            <div className="md:col-span-6 space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={novoCidadao.email}
                maxLength={CIDADAO_EMAIL_MAX}
                onChange={(e) => {
                  setNovoCidadao((prev) => ({ ...prev, email: textMax(sanitizeEmail(e.target.value), CIDADAO_EMAIL_MAX) }));
                  clearNovoCidadaoFieldError("email");
                }}
              />
              {!!novoCidadaoFieldErrors.email && <p className="text-xs text-red-600">{novoCidadaoFieldErrors.email}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNovoCidadaoOpen(false)} disabled={salvandoNovoCidadao}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarNovoCidadao} disabled={salvandoNovoCidadao}>
              {salvandoNovoCidadao ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
