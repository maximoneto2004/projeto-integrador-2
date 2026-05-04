import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { User, MapPin, LogIn, Gift, Info, PlusCircle, Check, ChevronsUpDown } from "lucide-react";
import type { Prontuario } from "@/types/prontuario";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/lib/sonner";
import { getApiErrorMessage } from "@/lib/notifications";
import { beneficioService, type BeneficioSocial } from "@/services/prontuario/beneficioService";
import { usePessoaReferenciaProntuario } from "@/hooks/prontuario/usePessoaReferenciaProntuario";
import { unidadeProntuarioService, type UnidadeProntuario } from "@/services/prontuario/unidadeProntuarioService";
import { pessoaReferenciaService, type PessoaReferenciaPayload } from "@/services/prontuario/pessoaReferenciaService";
import { cidadaoService } from "@/services/sistema/cidadaoService";
import type { CidadaoPayload } from "@/types/api";
import { useBairros } from "@/hooks/sistema/useBairros";
import { cn } from "@/lib/utils";

interface Props {
  prontuario: Prontuario | null;
  onNext: () => void;
  onSave: () => void;
}

type OptionItem = {
  id: string;
  nome: string;
};

type FieldErrors = Record<string, string>;
const MOTIVO_ATENDIMENTO_MAX = 600;
const getTodayIsoLocal = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const FORMA_INGRESSO_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "ESPONTANEA", label: "Demanda espontânea" },
  { value: "ATIVA", label: "Busca ativa da equipe" },
  { value: "PROTECAO_BASICA", label: "Encaminhamento – Proteção Social Básica" },
  { value: "PROTECAO_ESPECIAL", label: "Encaminhamento – Proteção Social Especial" },
  { value: "SAUDE", label: "Encaminhamento pela Saúde" },
  { value: "EDUCACAO", label: "Encaminhamento pela Educação" },
  { value: "SETORIAIS", label: "Encaminhamento por outras políticas setoriais" },
  { value: "CONSELHO", label: "Conselho Tutelar" },
  { value: "JUDICIARIO", label: "Poder Judiciário" },
  { value: "DIREITOS", label: "Sistema de Garantia de Direitos" },
  { value: "OUTROS", label: "Outros encaminhamentos" },
];

const ESPECIFICIDADE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "SITUACAO_RUA", label: "Família/pessoa em situação de rua" },
  { value: "QUILOMBOLA", label: "Família quilombola" },
  { value: "RIBEIRINHA", label: "Família ribeirinha" },
  { value: "CIGANA", label: "Família cigana" },
  { value: "INDIGINA_NAO_RESIDENTE", label: "Família indígena não residente em aldeia/reserva" },
  { value: "ALDEIA", label: "Família indígena residente em aldeia/reserva" },
];

export function Identificacao({ prontuario, onNext, onSave }: Props) {
  const [searchParams] = useSearchParams();
  const cpfParam = searchParams.get("cpf") || "";
  const prontuarioId =
    searchParams.get("prontuarioId") || (cpfParam ? localStorage.getItem(`prontuarioIdByCpf:${cpfParam.replace(/\D/g, "")}`) || "" : "");
  const pessoaReferencia = prontuario?.membros.find((m) => m.id === prontuario.pessoaReferenciaId);
  const { mutateAsync: salvarPessoaReferencia, isPending: salvandoPessoaReferencia } = usePessoaReferenciaProntuario();
  const { bairros, loading: carregandoBairros, error: erroBairros, fetchBairros } = useBairros();

  const normalizeSexo = (value?: string) => {
    const v = (value ?? "").toString().toUpperCase();
    if (v === "MASCULINO") return "Masculino";
    if (v === "FEMININO") return "Feminino";
    if (v === "OUTRO") return "Outro";
    return value ?? "";
  };

  const digitsOnly = (value?: string) => (value || "").replace(/\D/g, "");
  const digitsMax = (value: string, max: number) => digitsOnly(value).slice(0, max);

  const lettersOnly = (value?: string) => (value || "").replace(/[^a-zA-ZÀ-ÿ\s]/g, "");
  const lettersUpper = (value?: string) => lettersOnly(value).toUpperCase();
  const personNameOnly = (value?: string) => (value || "").replace(/[^a-zA-ZÀ-ÿ\s'.-]/g, "");
  const sanitizeEmail = (value?: string) => {
    const raw = (value || "").replace(/\s/g, "").replace(/[^a-zA-Z0-9._%+\-@]/g, "");
    const atIndex = raw.indexOf("@");
    if (atIndex === -1) return raw;
    const local = raw.slice(0, atIndex);
    const domain = raw.slice(atIndex + 1).replace(/@/g, "");
    return `${local}@${domain}`;
  };

  const ufUpper2 = (value?: string) => lettersUpper(value).replace(/\s/g, "").slice(0, 2);

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

  const maskNis = (value?: string) => {
    const v = digitsMax(value || "", 11);
    const a = v.slice(0, 3);
    const b = v.slice(3, 8);
    const c = v.slice(8, 10);
    const d = v.slice(10, 11);
    if (v.length <= 3) return a;
    if (v.length <= 8) return `${a}.${b}`;
    if (v.length <= 10) return `${a}.${b}.${c}`;
    return `${a}.${b}.${c}-${d}`;
  };
  const maskCep = (value?: string) => {
    const v = digitsMax(value || "", 8);
    if (v.length <= 5) return v;
    return `${v.slice(0, 5)}-${v.slice(5, 8)}`;
  };

  const maskTelefone = (value?: string) => digitsMax(value || "", 15);
  const textMax = (value: string, max: number) => value.slice(0, max);

  const orgaoBaseOptions: OptionItem[] = [];
  const beneficiosBaseOptions: OptionItem[] = [];

  const [formData, setFormData] = useState({
    nome: "",
    apelido: "",
    cpf: "",
    sexo: "",
    dataNascimento: "",
    email: "",
    telefone: "",
    nomeMae: "",
    nis: "",
    rg: "",
    rgOrgao: "",
    rgUf: "",
    rgDataEmissao: "",
    enderecoRua: "",
    enderecoNumero: "",
    enderecoComplemento: "",
    enderecoBairro: "",
    enderecoMunicipio: "",
    enderecoUf: "",
    enderecoCep: "",
    enderecoPontoReferencia: "",
    enderecoLocalizacao: "URBANO" as "URBANO" | "RURAL",
    enderecoAbrigo: false,
    formaAcesso: [] as string[],
    orgaoEncaminhou: "",
    motivoPrimeiroAtendimento: "",
    beneficios: [] as string[],
    outrosBeneficios: "",
    especificidades: "" as string,
    povoEtniaResidente: "",
    povoEtniaNaoResidente: "",
    formaIngresso: "",
    contatoOrgao: "",
  });
  const [orgaoOptions, setOrgaoOptions] = useState<OptionItem[]>(orgaoBaseOptions);
  const [orgaoModalOpen, setOrgaoModalOpen] = useState(false);
  const [novoOrgao, setNovoOrgao] = useState("");
  const [novaUnidade, setNovaUnidade] = useState("");
  const [novoContatoOrgao, setNovoContatoOrgao] = useState("");
  const [unidadesLoading, setUnidadesLoading] = useState(false);
  const [unidadeSaving, setUnidadeSaving] = useState(false);
  const [beneficiosOptions, setBeneficiosOptions] = useState<OptionItem[]>(beneficiosBaseOptions);
  const [beneficioModalOpen, setBeneficioModalOpen] = useState(false);
  const [beneficioSelectOpen, setBeneficioSelectOpen] = useState(false);
  const [bairroPopoverOpen, setBairroPopoverOpen] = useState(false);
  const [novoBeneficio, setNovoBeneficio] = useState("");
  const [beneficiosLoading, setBeneficiosLoading] = useState(false);
  const [beneficioSaving, setBeneficioSaving] = useState(false);
  const [carregouApi, setCarregouApi] = useState(false);
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [pessoaReferenciaRecordId, setPessoaReferenciaRecordId] = useState("");
  const [pessoaReferenciaCidadaoId, setPessoaReferenciaCidadaoId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const todayIso = useMemo(() => getTodayIsoLocal(), []);
  const bairrosOptions = useMemo(
    () => bairros.map((bairro) => ({ value: String(bairro.id), label: bairro.nome || "" })).filter((bairro) => bairro.label),
    [bairros],
  );
  const bairroSelecionado = useMemo(
    () => bairrosOptions.find((bairro) => bairro.value === formData.enderecoBairro),
    [bairrosOptions, formData.enderecoBairro],
  );
  const dataNascimentoErro = useMemo(() => {
    if (fieldErrors.data_nascimento) return fieldErrors.data_nascimento;
    if (formData.dataNascimento && formData.dataNascimento > todayIso) {
      return "Data de nascimento não pode ser futura.";
    }
    return "";
  }, [fieldErrors.data_nascimento, formData.dataNascimento, todayIso]);
  const rgDataEmissaoErro = useMemo(() => {
    if (fieldErrors.data_emissao_rg) return fieldErrors.data_emissao_rg;
    if (formData.rgDataEmissao && formData.rgDataEmissao > todayIso) {
      return "Data de emissão do RG não pode ser futura.";
    }
    return "";
  }, [fieldErrors.data_emissao_rg, formData.rgDataEmissao, todayIso]);

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
    if (bairros.length) return;
    fetchBairros();
  }, [bairros.length, fetchBairros]);

  useEffect(() => {
    if (prontuarioId) return;
    if (!prontuario || !pessoaReferencia) return;

    const formularioVazio = Object.values(formData).every((v) => (Array.isArray(v) ? v.length === 0 : v === "" || v === false));

    if (!formularioVazio) return;

    setFormData({
      nome: pessoaReferencia.nome ?? "",
      apelido: pessoaReferencia.apelido ?? "",
      cpf: maskCpf(pessoaReferencia.cpf ?? ""),
      sexo: pessoaReferencia.sexo ?? "",
      dataNascimento: pessoaReferencia.dataNascimento ?? "",
      email: pessoaReferencia.email ?? "",
      telefone: maskTelefone(pessoaReferencia.telefone ?? ""),
      nomeMae: pessoaReferencia.nomeMae ?? "",
      nis: maskNis(pessoaReferencia.nis ?? ""),
      rg: digitsOnly(pessoaReferencia.rg ?? ""),
      rgOrgao: lettersUpper(pessoaReferencia.rgOrgao ?? ""),
      rgUf: ufUpper2(pessoaReferencia.rgUf ?? ""),
      rgDataEmissao: pessoaReferencia.rgDataEmissao ?? "",
      enderecoRua: pessoaReferencia.enderecoRua ?? "",
      enderecoNumero: pessoaReferencia.enderecoNumero ?? "",
      enderecoComplemento: pessoaReferencia.enderecoComplemento ?? "",
      enderecoBairro: pessoaReferencia.enderecoBairro ?? "",
      enderecoMunicipio: pessoaReferencia.enderecoMunicipio ?? "",
      enderecoUf: ufUpper2(pessoaReferencia.enderecoUf ?? ""),
      enderecoCep: maskCep(pessoaReferencia.enderecoCep ?? ""),
      enderecoPontoReferencia: pessoaReferencia.enderecoPontoReferencia ?? "",
      enderecoLocalizacao: mapLocalizacaoToCode(String(pessoaReferencia.enderecoLocalizacao ?? "")) ?? "URBANO",
      enderecoAbrigo: pessoaReferencia.enderecoAbrigo ?? false,
      formaAcesso: [],
      orgaoEncaminhou: "",
      motivoPrimeiroAtendimento: "",
      beneficios: [],
      outrosBeneficios: "",
      especificidades: "",
      povoEtniaResidente: "",
      povoEtniaNaoResidente: "",
      formaIngresso: mapFormaIngressoToCode((pessoaReferencia as { formaIngresso?: string })?.formaIngresso) ?? "",
      contatoOrgao: "",
    });
  }, [prontuario, pessoaReferencia, prontuarioId]);

  useEffect(() => {
    if (!prontuarioId || carregouApi) return;

    pessoaReferenciaService
      .listar({ prontuario: prontuarioId })
      .then((res) => {
        const data = res.data as { result?: unknown } | { results?: unknown } | unknown | null;

        const result = data && typeof data === "object" && "result" in data ? (data as { result?: unknown }).result : data;

        const lista = Array.isArray(result)
          ? (result as any[])
          : result && typeof result === "object"
            ? [result as any]
            : Array.isArray((data as { results?: unknown })?.results)
              ? ((data as { results?: unknown }).results as any[])
              : [];

        const item = lista.find((entry) => String(entry?.prontuario?.id ?? entry?.prontuario ?? "") === String(prontuarioId)) ?? lista[0] ?? null;

        if (!item) return;
        setPessoaReferenciaRecordId(String(item?.id ?? ""));

        const pessoaReferenciaRaw = item?.pessoa_referencia ?? item?.pessoaReferencia;
        const cidadaoPorLista = pessoaReferenciaRaw && typeof pessoaReferenciaRaw === "object" ? pessoaReferenciaRaw : null;
        const cidadaoPorMembro =
          typeof pessoaReferenciaRaw === "string" || typeof pessoaReferenciaRaw === "number"
            ? prontuario?.membros.find((m) => String(m.id) === String(pessoaReferenciaRaw))
            : null;
        const cidadao = cidadaoPorLista ?? cidadaoPorMembro ?? {};
        const pessoaReferenciaId = String(cidadao?.id ?? item?.pessoa_referencia?.id ?? item?.pessoaReferencia?.id ?? item?.pessoa_referencia ?? "");
        setPessoaReferenciaCidadaoId(pessoaReferenciaId);

        setFormData({
          nome: cidadao?.nome ?? "",
          apelido: cidadao?.apelido ?? "",
          cpf: maskCpf(cidadao?.cpf ?? ""),
          sexo: normalizeSexo(cidadao?.sexo),
          dataNascimento: cidadao?.data_nascimento ?? cidadao?.dataNascimento ?? "",
          email: cidadao?.email ?? "",
          telefone: maskTelefone(cidadao?.telefone ?? ""),
          nomeMae: cidadao?.nome_mae ?? cidadao?.mae ?? "",
          nis: maskNis(cidadao?.nis ?? ""),
          rg: digitsOnly(cidadao?.rg ?? ""),
          rgOrgao: lettersUpper(cidadao?.orgao_emissor ?? ""),
          rgUf: ufUpper2(cidadao?.rg_uf ?? ""),
          rgDataEmissao: cidadao?.data_emissao_rg ?? "",
          enderecoRua: item?.logradouro ?? "",
          enderecoNumero: item?.numero ?? "",
          enderecoComplemento: item?.complemento ?? "",
          enderecoBairro: typeof item?.bairro === "object" ? String(item?.bairro?.id ?? "") : String(item?.bairro ?? ""),
          enderecoMunicipio: item?.cidade ?? "",
          enderecoUf: ufUpper2(item?.estado ?? ""),
          enderecoCep: maskCep(item?.cep ?? ""),
          enderecoPontoReferencia: item?.ponto_referencia ?? "",
          enderecoLocalizacao: mapLocalizacaoToCode(item?.localizacao) ?? "URBANO",
          enderecoAbrigo: item?.abrigo ?? false,
          formaAcesso: item?.forma_acesso ?? [],
          orgaoEncaminhou: typeof item?.unidade === "object" ? String(item?.unidade?.id ?? "") : String(item?.unidade ?? ""),
          motivoPrimeiroAtendimento: item?.razoes ?? "",
          beneficios: Array.isArray(item?.beneficio)
            ? item.beneficio.map((beneficio: any) => String(typeof beneficio === "object" ? (beneficio?.id ?? "") : beneficio)).filter(Boolean)
            : [],
          outrosBeneficios: item?.outros_beneficios ?? "",
          especificidades: item?.especifidade_familia ? item?.especifidade_familia : "",
          povoEtniaResidente: item?.povo_etinia ?? "",
          povoEtniaNaoResidente: "",
          formaIngresso: mapFormaIngressoToCode(item?.forma_ingresso) ?? "",
          contatoOrgao: item?.contato_encaminhamento ?? "",
        });
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Não foi possível carregar a pessoa de referência."));
      })
      .finally(() => {
        setCarregouApi(true);
      });
  }, [prontuarioId, carregouApi, prontuario]);
  const especificidadesOptions = ESPECIFICIDADE_OPTIONS;

  const normalizeText = (value?: string) =>
    (value ?? "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const mapLocalizacaoToCode = (value?: string): PessoaReferenciaPayload["localizacao"] => {
    const normalized = normalizeText(value);
    if (normalized === "URBANO") return "URBANO";
    if (normalized === "RURAL") return "RURAL";
    return undefined;
  };

  const mapFormaIngressoToCode = (value?: string) => {
    const normalized = normalizeText(value);
    if (FORMA_INGRESSO_OPTIONS.some((item) => item.value === normalized)) return normalized;
    if (normalized === "DEMANDA ESPONTANEA") return "ESPONTANEA";
    if (normalized === "BUSCA ATIVA DA EQUIPE") return "ATIVA";
    if (normalized === "ENCAMINHAMENTO") return "OUTROS";
    return undefined;
  };

  const mapEspecificidadeToCode = (value?: string) => {
    const normalized = normalizeText(value);
    if (ESPECIFICIDADE_OPTIONS.some((item) => item.value === normalized)) return normalized;
    if (normalized === "FAMILIA/PESSOA EM SITUACAO DE RUA") return "SITUACAO_RUA";
    if (normalized === "FAMILIA QUILOMBOLA") return "QUILOMBOLA";
    if (normalized === "FAMILIA RIBEIRINHA") return "RIBEIRINHA";
    if (normalized === "FAMILIA CIGANA") return "CIGANA";
    if (normalized === "FAMILIA INDIGENA RESIDENTE EM ALDEIA/RESERVA") return "ALDEIA";
    if (normalized === "FAMILIA INDIGENA NAO RESIDENTE EM ALDEIA/RESERVA") return "INDIGINA_NAO_RESIDENTE";
    return undefined;
  };

  const mapSexoToCode = (value?: string) => {
    const normalized = normalizeText(value);
    if (normalized === "MASCULINO") return "MASCULINO";
    if (normalized === "FEMININO") return "FEMININO";
    if (normalized === "OUTRO") return "OUTRO";
    return undefined;
  };

  const normalizeFieldErrorMessage = (value: unknown): string | undefined => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      const firstText = value.find((item) => typeof item === "string");
      return typeof firstText === "string" ? firstText : undefined;
    }
    return undefined;
  };

  const extractFieldErrors = (err: unknown): FieldErrors => {
    const data = (err as { response?: { data?: unknown } })?.response?.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};

    const direct = data as Record<string, unknown>;
    const nested =
      (direct.errors && typeof direct.errors === "object" && !Array.isArray(direct.errors) ? (direct.errors as Record<string, unknown>) : null) ||
      (direct.result && typeof direct.result === "object" && !Array.isArray(direct.result) ? (direct.result as Record<string, unknown>) : null);
    const source = nested ?? direct;
    const knownFields = new Set([
      "nome",
      "apelido",
      "cpf",
      "telefone",
      "email",
      "nis",
      "mae",
      "data_nascimento",
      "rg",
      "orgao_emissor",
      "rg_uf",
      "uf_rg",
      "data_emissao_rg",
      "logradouro",
      "numero",
      "complemento",
      "estado",
      "cidade",
      "cep",
      "ponto_referencia",
      "contato_encaminhamento",
      "razoes",
      "povo_etinia",
    ]);

    const mapped: FieldErrors = {};
    Object.entries(source).forEach(([key, value]) => {
      if (!knownFields.has(key)) return;
      const message = normalizeFieldErrorMessage(value);
      if (!message) return;
      const normalizedKey = key === "uf_rg" ? "rg_uf" : key;
      mapped[normalizedKey] = message;
    });

    return mapped;
  };

  const buildCidadaoPayload = (): Partial<CidadaoPayload> => ({
    nome: personNameOnly(formData.nome) || "",
    cpf: digitsMax(formData.cpf || "", 11),
    telefone: digitsMax(formData.telefone || "", 15),
    email: sanitizeEmail(formData.email) || undefined,
    data_nascimento: formData.dataNascimento || undefined,
    sexo: mapSexoToCode(formData.sexo),
    apelido: personNameOnly(formData.apelido) || undefined,
    nis: digitsMax(formData.nis || "", 11) || undefined,
    mae: personNameOnly(formData.nomeMae) || undefined,
    rg: digitsOnly(formData.rg) || undefined,
    orgao_emissor: lettersUpper(formData.rgOrgao) || undefined,
    rg_uf: ufUpper2(formData.rgUf) || undefined,
    data_emissao_rg: formData.rgDataEmissao || undefined,
  });

  const buildPessoaReferenciaPayload = (): PessoaReferenciaPayload => {
    const especificidadeCode = mapEspecificidadeToCode(formData.especificidades);
    const pessoaReferenciaId = pessoaReferenciaCidadaoId || pessoaReferencia?.id || "";

    return {
      is_active: true,
      logradouro: formData.enderecoRua || undefined,
      numero: formData.enderecoNumero || undefined,
      cep: digitsMax(formData.enderecoCep || "", 8) || undefined,
      complemento: formData.enderecoComplemento || undefined,
      estado: ufUpper2(formData.enderecoUf) || undefined,
      cidade: formData.enderecoMunicipio || undefined,
      ponto_referencia: formData.enderecoPontoReferencia || undefined,
      localizacao: mapLocalizacaoToCode(formData.enderecoLocalizacao),
      abrigo: formData.enderecoAbrigo,
      forma_ingresso: mapFormaIngressoToCode(formData.formaIngresso),
      contato_encaminhamento: formData.contatoOrgao || undefined,
      razoes: formData.motivoPrimeiroAtendimento || undefined,
      especifidade_familia: especificidadeCode,
      povo_etinia: formData.povoEtniaResidente || formData.povoEtniaNaoResidente || undefined,
      pessoa_referencia: pessoaReferenciaId || undefined,
      prontuario: prontuarioId || undefined,
      bairro: formData.enderecoBairro || undefined,
      unidade: formData.orgaoEncaminhou || undefined,
      beneficio: (formData.beneficios || []).filter(Boolean),
    };
  };

  const persistPessoaReferencia = async () => {
    try {
      await salvarPessoaReferencia({
        id: pessoaReferenciaRecordId || undefined,
        payload: buildPessoaReferenciaPayload(),
      });
      return true;
    } catch (err) {
      const apiErrors = extractFieldErrors(err);
      if (Object.keys(apiErrors).length) {
        setFieldErrors((prev) => ({ ...prev, ...apiErrors }));
        toast.error("Encontramos erros no formulário. Revise os campos destacados e tente novamente.");
        return false;
      }
      toast.error(getApiErrorMessage(err, "Não foi possível salvar a pessoa de referência."));
      return false;
    }
  };

  const persistCidadao = async () => {
    const cidadaoId = pessoaReferenciaCidadaoId || pessoaReferencia?.id || "";
    if (!cidadaoId) return true;

    try {
      await cidadaoService.atualizar(cidadaoId, buildCidadaoPayload());
      return true;
    } catch (err) {
      const apiErrors = extractFieldErrors(err);
      if (Object.keys(apiErrors).length) {
        setFieldErrors((prev) => ({ ...prev, ...apiErrors }));
        toast.error("Encontramos erros no formulário. Revise os campos destacados e tente novamente.");
        return false;
      }
      toast.error(getApiErrorMessage(err, "Não foi possível salvar os dados do cidadão."));
      return false;
    }
  };

  const persistDadosPessoaReferencia = async () => {
    if (formData.dataNascimento && formData.dataNascimento > todayIso) {
      setFieldErrors((prev) => ({
        ...prev,
        data_nascimento: "Data de nascimento não pode ser futura.",
      }));
      toast.error("Revise a data de nascimento antes de salvar.");
      return false;
    }
    if (formData.rgDataEmissao && formData.rgDataEmissao > todayIso) {
      setFieldErrors((prev) => ({
        ...prev,
        data_emissao_rg: "Data de emissão do RG não pode ser futura.",
      }));
      toast.error("Revise a data de emissão do RG antes de salvar.");
      return false;
    }

    setSalvandoDados(true);
    try {
      const cidadaoOk = await persistCidadao();
      if (!cidadaoOk) return false;
      return await persistPessoaReferencia();
    } finally {
      setSalvandoDados(false);
    }
  };

  const handleSubmit = async () => {
    const ok = await persistDadosPessoaReferencia();
    if (!ok) return;
    onSave();
    onNext();
  };

  const handleSalvarEtapa = async () => {
    const ok = await persistDadosPessoaReferencia();
    if (!ok) return;
    onSave();
  };

  const handleSalvarNovoOrgao = async () => {
    const orgao = novoOrgao.trim();
    const unidade = novaUnidade.trim();

    if (!unidade) return;

    setUnidadeSaving(true);
    try {
      const payload = {
        unidade,
        nome: `${orgao} - ${unidade}`,
        contato: novoContatoOrgao.trim() || undefined,
      };
      const res = await unidadeProntuarioService.criar(payload);
      const data = res.data as { result?: UnidadeProntuario | string; nome?: string; id?: string } | UnidadeProntuario | string | null;
      const unidadeCriada =
        data && typeof data === "object" && "result" in data && typeof data.result === "object"
          ? (data.result as UnidadeProntuario)
          : data && typeof data === "object"
            ? (data as UnidadeProntuario)
            : null;
      const idCriado = String(unidadeCriada?.id ?? "");
      const nomeCriado =
        unidadeCriada?.nome ||
        (unidadeCriada?.orgao || unidadeCriada?.unidade
          ? `${unidadeCriada?.orgao || ""}${unidadeCriada?.orgao ? " - " : ""}${unidadeCriada?.unidade || ""}`.trim()
          : "") ||
        (typeof data === "string" ? data : payload.nome);

      if (idCriado) {
        setOrgaoOptions((prev) => (prev.some((item) => item.id === idCriado) ? prev : [...prev, { id: idCriado, nome: nomeCriado }]));
      }
      setFormData((prev) => ({
        ...prev,
        orgaoEncaminhou: idCriado || prev.orgaoEncaminhou,
        contatoOrgao: novoContatoOrgao.trim() || prev.contatoOrgao,
      }));

      setOrgaoModalOpen(false);
      setNovoOrgao("");
      setNovaUnidade("");
      setNovoContatoOrgao("");
      toast.success("Unidade cadastrada.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível cadastrar a unidade."));
    } finally {
      setUnidadeSaving(false);
    }
  };

  const handleToggleBeneficio = (beneficio: string, checked: boolean) => {
    setFormData((prev) => {
      const atual = prev.beneficios ?? [];
      return {
        ...prev,
        beneficios: checked ? [...atual, beneficio] : atual.filter((i) => i !== beneficio),
      };
    });
  };

  const handleSalvarNovoBeneficio = () => {
    const beneficio = novoBeneficio.trim();

    if (!beneficio) return;

    setBeneficioSaving(true);
    beneficioService
      .criarBeneficioSocial({ nome: beneficio })
      .then((res) => {
        const payload = res.data as { result?: BeneficioSocial | string; nome?: string; id?: string } | BeneficioSocial | string | null;
        const beneficioCriado =
          payload && typeof payload === "object" && "result" in payload && typeof payload.result === "object"
            ? (payload.result as BeneficioSocial)
            : payload && typeof payload === "object"
              ? (payload as BeneficioSocial)
              : null;
        const idCriado = String(beneficioCriado?.id ?? "");
        const nomeCriado = beneficioCriado?.nome || (typeof payload === "string" ? payload : beneficio);
        if (idCriado) {
          setBeneficiosOptions((prev) => (prev.some((item) => item.id === idCriado) ? prev : [...prev, { id: idCriado, nome: nomeCriado }]));
        }
        setFormData((prev) => ({
          ...prev,
          beneficios: idCriado && !prev.beneficios.includes(idCriado) ? [...prev.beneficios, idCriado] : prev.beneficios,
        }));
        setBeneficioModalOpen(false);
        setNovoBeneficio("");
        toast.success("Benefício cadastrado.");
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Não foi possível cadastrar o benefício."));
      })
      .finally(() => setBeneficioSaving(false));
  };

  const beneficiosDedupe = useMemo(() => {
    const map = new Map<string, OptionItem>();
    beneficiosOptions.forEach((item) => {
      if (item?.id) map.set(item.id, item);
    });
    return Array.from(map.values());
  }, [beneficiosOptions]);

  useEffect(() => {
    setBeneficiosLoading(true);
    beneficioService
      .listarBeneficiosSociais()
      .then((res) => {
        const data = res.data as { result?: BeneficioSocial[] | string[] } | BeneficioSocial[] | string[] | null;
        const rawList = Array.isArray(data)
          ? data
          : Array.isArray((data as { result?: unknown })?.result)
            ? (data as { result?: unknown }).result
            : Array.isArray((data as { results?: unknown })?.results)
              ? (data as { results?: unknown }).results
              : Array.isArray((data as { data?: unknown })?.data)
                ? (data as { data?: unknown }).data
                : [];
        const itens = (rawList as Array<BeneficioSocial | string>)
          .map((item) => {
            if (typeof item === "string") return null;
            const id = String(item?.id ?? "");
            const nome = item?.nome || item?.descricao || "";
            return id && nome ? { id, nome } : null;
          })
          .filter((item): item is OptionItem => Boolean(item));
        if (itens.length) {
          setBeneficiosOptions((prev) => {
            const merged = new Map(prev.map((item) => [item.id, item]));
            itens.forEach((item) => merged.set(item.id, item));
            return Array.from(merged.values());
          });
        }
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Não foi possível carregar benefícios sociais."));
      })
      .finally(() => setBeneficiosLoading(false));
  }, []);

  useEffect(() => {
    setUnidadesLoading(true);
    unidadeProntuarioService
      .listar()
      .then((res) => {
        const data = res.data as { result?: UnidadeProntuario[] | string[] } | UnidadeProntuario[] | string[] | null;
        const rawList = Array.isArray(data)
          ? data
          : Array.isArray((data as { result?: unknown })?.result)
            ? (data as { result?: unknown }).result
            : Array.isArray((data as { results?: unknown })?.results)
              ? (data as { results?: unknown }).results
              : Array.isArray((data as { data?: unknown })?.data)
                ? (data as { data?: unknown }).data
                : [];
        const itens = (rawList as Array<UnidadeProntuario | string>)
          .map((item) => {
            if (typeof item === "string") return null;
            const id = String(item?.id ?? "");
            const nome =
              item?.nome || (item?.orgao || item?.unidade ? `${item?.orgao || ""}${item?.orgao ? " - " : ""}${item?.unidade || ""}`.trim() : "");
            return id && nome ? { id, nome } : null;
          })
          .filter((item): item is OptionItem => Boolean(item));
        if (itens.length) {
          setOrgaoOptions((prev) => {
            const merged = new Map(prev.map((item) => [item.id, item]));
            itens.forEach((item) => merged.set(item.id, item));
            return Array.from(merged.values());
          });
        }
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Não foi possível carregar as unidades."));
      })
      .finally(() => setUnidadesLoading(false));
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg text-slate-800">Dados da Pessoa de Referência</h3>
          </div>
          <span className="hidden md:block text-xs text-slate-500">
            Campos com <span className="font-bold">*</span> são obrigatórios
          </span>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 space-y-2">
              <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Nome completo *</Label>
              <Input
                value={formData.nome}
                className="bg-slate-50/50"
                placeholder="Ex.: Maria da Silva"
                maxLength={150}
                onChange={(e) => {
                  setFormData({ ...formData, nome: textMax(personNameOnly(e.target.value), 150) });
                  clearFieldError("nome");
                }}
              />
              {!!fieldErrors.nome && <p className="text-xs text-red-600">{fieldErrors.nome}</p>}
            </div>

            <div className="md:col-span-4 space-y-2">
              <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Apelido</Label>
              <Input
                value={formData.apelido}
                placeholder="Ex.: Maria"
                maxLength={150}
                onChange={(e) => {
                  setFormData({ ...formData, apelido: textMax(personNameOnly(e.target.value), 150) });
                  clearFieldError("apelido");
                }}
              />
              {!!fieldErrors.apelido && <p className="text-xs text-red-600">{fieldErrors.apelido}</p>}
            </div>

            <div className="md:col-span-6 space-y-2">
              <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Nome da mãe</Label>
              <Input
                value={formData.nomeMae}
                placeholder="Ex.: Ana da Silva"
                maxLength={250}
                onChange={(e) => {
                  setFormData({ ...formData, nomeMae: textMax(personNameOnly(e.target.value), 250) });
                  clearFieldError("mae");
                }}
              />
              {!!fieldErrors.mae && <p className="text-xs text-red-600">{fieldErrors.mae}</p>}
            </div>

            <div className="md:col-span-3 space-y-2">
              <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Sexo *</Label>
              <Select value={formData.sexo} onValueChange={(v) => setFormData({ ...formData, sexo: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Feminino">Feminino</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3 space-y-2">
              <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Data de nascimento *</Label>
              <Input
                type="date"
                value={formData.dataNascimento}
                max={todayIso}
                onChange={(e) => {
                  setFormData({ ...formData, dataNascimento: e.target.value });
                  clearFieldError("data_nascimento");
                }}
              />
              {!!dataNascimentoErro && <p className="text-xs text-red-600">{dataNascimentoErro}</p>}
            </div>

            <Separator className="md:col-span-12 my-2" />

            <div className="md:col-span-3 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">CPF *</Label>
              <Input
                value={formData.cpf}
                inputMode="numeric"
                maxLength={14}
                onChange={(e) => {
                  setFormData({ ...formData, cpf: maskCpf(e.target.value) });
                  clearFieldError("cpf");
                }}
                placeholder="000.000.000-00"
              />
              {!!fieldErrors.cpf && <p className="text-xs text-red-600">{fieldErrors.cpf}</p>}
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">NIS</Label>
              <Input
                value={formData.nis}
                inputMode="numeric"
                maxLength={14}
                onChange={(e) => {
                  setFormData({ ...formData, nis: maskNis(e.target.value) });
                  clearFieldError("nis");
                }}
                placeholder="000.00000.00-0"
              />
              {!!fieldErrors.nis && <p className="text-xs text-red-600">{fieldErrors.nis}</p>}
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Telefone</Label>
              <Input
                value={formData.telefone}
                inputMode="numeric"
                maxLength={15}
                onChange={(e) => {
                  setFormData({ ...formData, telefone: maskTelefone(e.target.value) });
                  clearFieldError("telefone");
                }}
                placeholder="Somente números"
              />
              {!!fieldErrors.telefone && <p className="text-xs text-red-600">{fieldErrors.telefone}</p>}
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">E-mail</Label>
              <Input
                type="email"
                value={formData.email}
                maxLength={254}
                onChange={(e) => {
                  setFormData({ ...formData, email: textMax(sanitizeEmail(e.target.value), 254) });
                  clearFieldError("email");
                }}
                placeholder="email@exemplo.com"
              />
              {!!fieldErrors.email && <p className="text-xs text-red-600">{fieldErrors.email}</p>}
            </div>

            <div className="md:col-span-4 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">RG / Órgão emissor</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.rg}
                  inputMode="numeric"
                  maxLength={150}
                  onChange={(e) => {
                    setFormData({ ...formData, rg: digitsMax(e.target.value, 150) });
                    clearFieldError("rg");
                  }}
                  placeholder="Número"
                />
                <Input
                  className="w-24"
                  value={formData.rgOrgao}
                  maxLength={10}
                  onChange={(e) => {
                    setFormData({ ...formData, rgOrgao: textMax(lettersUpper(e.target.value), 10) });
                    clearFieldError("orgao_emissor");
                  }}
                  placeholder="SSP"
                />
              </div>
              {!!fieldErrors.rg && <p className="text-xs text-red-600">{fieldErrors.rg}</p>}
              {!!fieldErrors.orgao_emissor && <p className="text-xs text-red-600">{fieldErrors.orgao_emissor}</p>}
            </div>
            <div className="md:col-span-4 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">UF do RG</Label>
              <Input
                value={formData.rgUf}
                onChange={(e) => {
                  setFormData({ ...formData, rgUf: ufUpper2(e.target.value) });
                  clearFieldError("rg_uf", "uf_rg");
                }}
                placeholder="CE"
                maxLength={2}
              />
              {!!fieldErrors.rg_uf && <p className="text-xs text-red-600">{fieldErrors.rg_uf}</p>}
            </div>
            <div className="md:col-span-4 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Data de emissão do RG</Label>
              <Input
                type="date"
                value={formData.rgDataEmissao}
                max={todayIso}
                onChange={(e) => {
                  setFormData({ ...formData, rgDataEmissao: e.target.value });
                  clearFieldError("data_emissao_rg");
                }}
              />
              {!!rgDataEmissaoErro && <p className="text-xs text-red-600">{rgDataEmissaoErro}</p>}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Endereço da Família</h3>
        </div>
        <Card className="shadow-sm">
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-12 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Endereço (Rua, Av.)</Label>
              <Input
                value={formData.enderecoRua}
                maxLength={200}
                onChange={(e) => {
                  setFormData({ ...formData, enderecoRua: textMax(e.target.value, 200) });
                  clearFieldError("logradouro");
                }}
                placeholder="Ex.: Rua 2 / Av. A"
              />
              {!!fieldErrors.logradouro && <p className="text-xs text-red-600">{fieldErrors.logradouro}</p>}
            </div>
            <div className="md:col-span-4 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Número</Label>
              <Input
                value={formData.enderecoNumero}
                maxLength={10}
                onChange={(e) => {
                  setFormData({ ...formData, enderecoNumero: textMax(e.target.value, 10) });
                  clearFieldError("numero");
                }}
                placeholder="Nº"
              />
              {!!fieldErrors.numero && <p className="text-xs text-red-600">{fieldErrors.numero}</p>}
            </div>
            <div className="md:col-span-8 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Complemento</Label>
              <Input
                value={formData.enderecoComplemento}
                maxLength={150}
                onChange={(e) => {
                  setFormData({ ...formData, enderecoComplemento: textMax(e.target.value, 150) });
                  clearFieldError("complemento");
                }}
                placeholder="Casa, Apto, bloco, etc."
              />
              {!!fieldErrors.complemento && <p className="text-xs text-red-600">{fieldErrors.complemento}</p>}
            </div>
            <div className="md:col-span-4 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Bairro</Label>
              <Popover open={bairroPopoverOpen} onOpenChange={setBairroPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal bg-slate-50/50" type="button">
                    <span className="truncate">
                      {bairroSelecionado?.label || formData.enderecoBairro || (carregandoBairros ? "Carregando bairros..." : "Selecione o bairro")}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-40" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[320px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar bairro..." className="h-11" />
                    <CommandList className="max-h-[220px]">
                      <CommandEmpty>Bairro não encontrado.</CommandEmpty>
                      <CommandGroup>
                        {bairrosOptions.map((bairro) => (
                          <CommandItem
                            key={bairro.value}
                            value={bairro.label}
                            onSelect={() => {
                              setFormData((prev) => ({ ...prev, enderecoBairro: bairro.value }));
                              setBairroPopoverOpen(false);
                            }}
                          >
                            <span
                              className={cn(
                                "mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-200",
                                formData.enderecoBairro === bairro.value ? "bg-primary border-primary text-primary-foreground" : "text-transparent",
                              )}
                            >
                              <Check className="h-3 w-3" />
                            </span>
                            {bairro.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {erroBairros && <p className="text-xs text-destructive">Não foi possível carregar os bairros.</p>}
            </div>
            <div className="md:col-span-6 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Município</Label>
              <Input
                value={formData.enderecoMunicipio}
                maxLength={50}
                onChange={(e) => {
                  setFormData({ ...formData, enderecoMunicipio: textMax(e.target.value, 50) });
                  clearFieldError("cidade");
                }}
                placeholder="Ex.: Fortaleza"
              />
              {!!fieldErrors.cidade && <p className="text-xs text-red-600">{fieldErrors.cidade}</p>}
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">UF</Label>
              <Input
                value={formData.enderecoUf}
                onChange={(e) => {
                  setFormData({ ...formData, enderecoUf: ufUpper2(e.target.value) });
                  clearFieldError("estado");
                }}
                placeholder="CE"
                maxLength={2}
              />
              {!!fieldErrors.estado && <p className="text-xs text-red-600">{fieldErrors.estado}</p>}
            </div>
            <div className="md:col-span-12 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">CEP</Label>
              <Input
                value={formData.enderecoCep}
                inputMode="numeric"
                maxLength={9}
                onChange={(e) => {
                  setFormData({ ...formData, enderecoCep: maskCep(e.target.value) });
                  clearFieldError("cep");
                }}
                placeholder="00000-000"
              />
              {!!fieldErrors.cep && <p className="text-xs text-red-600">{fieldErrors.cep}</p>}
            </div>
            <div className="md:col-span-12 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Ponto de referência</Label>
              <Input
                value={formData.enderecoPontoReferencia}
                maxLength={150}
                onChange={(e) => {
                  setFormData({ ...formData, enderecoPontoReferencia: textMax(e.target.value, 150) });
                  clearFieldError("ponto_referencia");
                }}
                placeholder="Ex.: Próximo ao posto de saúde / escola"
              />
              {!!fieldErrors.ponto_referencia && <p className="text-xs text-red-600">{fieldErrors.ponto_referencia}</p>}
            </div>
            <div className="md:col-span-6 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Localização do domicílio</Label>
              <Select
                value={formData.enderecoLocalizacao}
                onValueChange={(v: "URBANO" | "RURAL") => setFormData({ ...formData, enderecoLocalizacao: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="URBANO">Urbano</SelectItem>
                  <SelectItem value="RURAL">Rural</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-6 flex items-end pb-2">
              <div className="flex items-center gap-2">
                <Checkbox id="abrigo" checked={formData.enderecoAbrigo} onCheckedChange={(c) => setFormData({ ...formData, enderecoAbrigo: !!c })} />
                <Label htmlFor="abrigo" className="cursor-pointer font-medium text-slate-700 text-sm">
                  Endereço é de um abrigo
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Gift className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold text-lg text-slate-800">Benefícios Sociais</h3>
        </div>
        <Card className="h-full">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <Label className="font-bold text-slate-600">Benefícios recebidos</Label>
              <Button variant="link" size="sm" onClick={() => setBeneficioModalOpen(true)} className="h-auto p-0">
                Cadastrar outro
              </Button>
            </div>
            <Popover open={beneficioSelectOpen} onOpenChange={setBeneficioSelectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn("w-full justify-between font-normal bg-slate-50/50", !formData.beneficios?.length && "text-slate-500")}
                  disabled={beneficiosLoading}
                  type="button"
                >
                  <span className="truncate">
                    {beneficiosLoading
                      ? "Carregando benefícios..."
                      : formData.beneficios?.length
                        ? formData.beneficios.map((id) => beneficiosDedupe.find((item) => item.id === id)?.nome || id).join(", ")
                        : "Selecione um ou mais benefícios"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar benefício..." className="h-11" />
                  <CommandList className="max-h-[260px]">
                    <CommandEmpty>Nenhum benefício encontrado.</CommandEmpty>
                    <CommandGroup>
                      {beneficiosDedupe.map((beneficio) => {
                        const selecionado = formData.beneficios.includes(beneficio.id);
                        return (
                          <CommandItem key={beneficio.id} value={beneficio.nome} onSelect={() => handleToggleBeneficio(beneficio.id, !selecionado)}>
                            <span
                              className={cn(
                                "mr-2 inline-flex h-4 w-4 items-center justify-center rounded-sm border",
                                selecionado ? "bg-primary border-primary text-primary-foreground" : "opacity-50",
                              )}
                            >
                              {selecionado ? <Check className="h-3 w-3" /> : null}
                            </span>
                            <span className="truncate">{beneficio.nome}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-[11px] text-slate-400 italic">Selecione todos os benefícios que a família recebe atualmente.</p>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <LogIn className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg text-slate-800">Forma de Ingresso</h3>
          </div>
          <Card className="h-full shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="font-bold">Como chegou à unidade? *</Label>
                <Select value={formData.formaIngresso} onValueChange={(v) => setFormData({ ...formData, formaIngresso: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMA_INGRESSO_OPTIONS.map((opcao) => (
                      <SelectItem key={opcao.value} value={opcao.value}>
                        {opcao.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="font-bold">Unidade que encaminhou</Label>
                  <Button variant="link" size="sm" onClick={() => setOrgaoModalOpen(true)} className="h-auto p-0 flex gap-1">
                    <PlusCircle className="w-3 h-3" /> Nova
                  </Button>
                </div>
                <Select value={formData.orgaoEncaminhou} onValueChange={(v) => setFormData({ ...formData, orgaoEncaminhou: v })}>
                  <SelectTrigger disabled={unidadesLoading}>
                    <SelectValue placeholder={unidadesLoading ? "Carregando..." : "Selecione o órgão"} />
                  </SelectTrigger>
                  <SelectContent>
                    {orgaoOptions.map((orgao) => (
                      <SelectItem key={orgao.id} value={orgao.id}>
                        {orgao.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* <div className="space-y-2">
                <Label className="font-bold">Contato do órgão/unidade</Label>
                <Input
                  value={formData.contatoOrgao}
                  maxLength={150}
                  onChange={(e) => {
                    setFormData({ ...formData, contatoOrgao: textMax(e.target.value, 150) });
                    clearFieldError("contato_encaminhamento");
                  }}
                  placeholder="Telefone ou e-mail do órgão"
                />
                {!!fieldErrors.contato_encaminhamento && <p className="text-xs text-red-600">{fieldErrors.contato_encaminhamento}</p>}
              </div> */}

              <div className="space-y-2">
                <Label className="font-bold">Motivo do atendimento</Label>
                <Textarea
                  placeholder="Descreva brevemente a demanda inicial..."
                  className="min-h-[100px]"
                  maxLength={MOTIVO_ATENDIMENTO_MAX}
                  value={formData.motivoPrimeiroAtendimento}
                  onChange={(e) => {
                    setFormData({ ...formData, motivoPrimeiroAtendimento: textMax(e.target.value, MOTIVO_ATENDIMENTO_MAX) });
                    clearFieldError("razoes");
                  }}
                />
                <p className="text-[11px] text-slate-400 text-right">
                  {formData.motivoPrimeiroAtendimento.length}/{MOTIVO_ATENDIMENTO_MAX}
                </p>
                {!!fieldErrors.razoes && <p className="text-xs text-red-600">{fieldErrors.razoes}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Info className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-lg text-slate-800">Especificidades Étnico-Culturais</h3>
          </div>
          <Card className="h-full">
            <CardContent className="p-6 space-y-4">
              <div className="grid gap-3">
                {especificidadesOptions.map((item) => (
                  <div key={item.value} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <Checkbox
                      id={item.value}
                      checked={formData.especificidades?.includes(item.value)}
                      onCheckedChange={(c) => {
                        setFormData({
                          ...formData,
                          especificidades: c ? item.value : "",
                        });
                      }}
                    />
                    <Label htmlFor={item.value} className="text-sm leading-tight cursor-pointer font-medium text-slate-700">
                      {item.label}
                    </Label>
                  </div>
                ))}
              </div>

              {(formData.especificidades.includes("ALDEIA") ||
                formData.especificidades.includes("CIGANA") ||
                formData.especificidades.includes("INDIGINA_NAO_RESIDENTE")) && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg space-y-3 animate-in slide-in-from-top-2">
                  <Label className="text-blue-700 font-bold text-xs uppercase">Especifique o Povo / Etnia</Label>
                  <Input
                    placeholder="Nome da etnia..."
                    className="bg-white border-blue-200"
                    maxLength={250}
                    value={formData.povoEtniaResidente || formData.povoEtniaNaoResidente}
                    onChange={(e) => {
                      setFormData({ ...formData, povoEtniaResidente: textMax(e.target.value, 250) });
                      clearFieldError("povo_etinia");
                    }}
                  />
                  {!!fieldErrors.povo_etinia && <p className="text-xs text-red-600">{fieldErrors.povo_etinia}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button
          variant="outline"
          onClick={handleSalvarEtapa}
          className="w-full sm:w-auto font-bold text-slate-500 hover:text-slate-800"
          disabled={salvandoPessoaReferencia || salvandoDados}
        >
          Apenas Salvar
        </Button>
        <Button
          onClick={handleSubmit}
          className="w-full sm:w-auto px-8 shadow-lg shadow-primary/20"
          disabled={salvandoPessoaReferencia || salvandoDados}
        >
          {salvandoPessoaReferencia || salvandoDados ? "Salvando..." : "Salvar e avançar"}
        </Button>
      </div>

      <Dialog open={orgaoModalOpen} onOpenChange={setOrgaoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova unidade</DialogTitle>
            <DialogDescription>Cadastre a unidade que encaminhou.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Unidade</Label>
              <Input
                value={novaUnidade}
                maxLength={150}
                onChange={(e) => setNovaUnidade(textMax(e.target.value, 150))}
                placeholder="Ex.: CRAS Messejana"
              />
            </div>
            {/* <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Contato (opcional)</Label>
              <Input
                value={novoContatoOrgao}
                maxLength={150}
                onChange={(e) => setNovoContatoOrgao(textMax(e.target.value, 150))}
                placeholder="Telefone ou e-mail"
              />
            </div> */}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOrgaoModalOpen(false)} disabled={unidadeSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarNovoOrgao} disabled={unidadeSaving}>
              {unidadeSaving ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={beneficioModalOpen} onOpenChange={setBeneficioModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo benefício</DialogTitle>
            <DialogDescription>Cadastre um novo benefício social para selecionar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">Nome do benefício</Label>
            <Input
              value={novoBeneficio}
              maxLength={40}
              onChange={(e) => setNovoBeneficio(textMax(e.target.value, 30))}
              placeholder="Ex.: Auxílio Brasil"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBeneficioModalOpen(false)} disabled={beneficioSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarNovoBeneficio} disabled={beneficioSaving}>
              {beneficioSaving ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
