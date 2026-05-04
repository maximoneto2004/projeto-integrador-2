import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Droplets, Zap, Trash2, ShieldAlert, FileText, Save, ArrowRight } from "lucide-react";
import { toast } from "@/lib/sonner";
import { getApiErrorMessage } from "@/lib/notifications";
import { condicaoHabitacionalService, type CondicaoHabitacionalResponse } from "@/services/prontuario/condicaoHabitacionalService";
import { useCondicaoHabitacionalProntuario } from "@/hooks/prontuario/useCondicaoHabitacionalProntuario";
import type { Prontuario } from "@/types/prontuario";

interface Props {
  prontuario: Prontuario | null;
  onNext: () => void;
  onSave: () => void;
}

type HabitacaoFormData = {
  tipoMoradia: string;
  materialParedes: string;
  energia: string;
  possuiAguaCanalizada: string;
  condicoesEstruturais: string;
  abastecimento: string;
  saneamento: string;
  coleta: string;
  numeroComodos: number;
  numeroDormitorios: number;
  mediaPessoasPorDormitorio: string;
  acessibilidade: string;
  riscoDesabamento: string;
  dificilAcesso: string;
  areaConflito: string;
  observacoesDiagnostico: string;
};

const normalizeCpf = (value?: string) => (value || "").replace(/\D/g, "");

const TIPO_RESIDENCIA_OPTIONS = [
  { value: "PROPRIA", label: "Própria" },
  { value: "ALUGADA", label: "Alugada" },
  { value: "CEDIDA", label: "Cedida" },
  { value: "OCUPADA", label: "Ocupada" },
];

const MATERIAL_OPTIONS = [
  { value: "ALVENARIA", label: "Alvenaria ou madeira aparelhada" },
  { value: "MADEIRA", label: "Madeira aproveitada / taipa / materiais precários" },
];

const ENERGIA_OPTIONS = [
  { value: "MEDIDOR_PROPRIO", label: "Sim, com medidor próprio" },
  { value: "MEDIDOR_COMPARTILHADO", label: "Sim, com medidor compartilhado" },
  { value: "SEM_MEDIDOR", label: "Sim, sem medidor" },
  { value: "NAO_POSSUI", label: "Não possui energia elétrica" },
];

const SIM_NAO_OPTIONS = [
  { value: "SIM", label: "Sim" },
  { value: "NAO", label: "Não" },
];

const ABASTECIMENTO_OPTIONS = [
  { value: "REDE", label: "Rede geral de distribuição" },
  { value: "POCO", label: "Poço ou nascente" },
  { value: "CISTERNA", label: "Cisterna de captação" },
  { value: "CARRO", label: "Carro-pipa" },
  { value: "OUTRA", label: "Outra forma" },
];

const ESGOTAMENTO_OPTIONS = [
  { value: "REDE_COLETORA", label: "Rede coletora / esgoto / pluvial" },
  { value: "SEPTICA", label: "Fossa séptica" },
  { value: "RUDIMENTAR", label: "Fossa rudimentar" },
  { value: "DIRETO", label: "Direto para rio / lago / mar" },
  { value: "SEM_BANHEIRO", label: "Domicílio sem banheiro" },
];

const COLETA_OPTIONS = [
  { value: "COLETA_DIRETA", label: "Sim, coleta direta" },
  { value: "COLETA_INDIRETA", label: "Sim, coleta indireta" },
  { value: "NAO_POSSUI", label: "Não possui coleta" },
];

const ACESSIBILIDADE_VULNERABILIDADE_OPTIONS = [
  { value: "INTERNO_COM_COMUNICACAO_RUA", label: "Sim, tanto nos espaços internos como na comunicação na rua." },
  { value: "INTERNO_SEM_COMUNICACAO_RUA", label: 'Sim, apenas nos espaços internos, mas possui "barreiras" na comunicação na rua.' },
  { value: "NAO", label: "Não possui condições de acessibilidade." },
];

const toApiAcessibilidade = (value?: string) => {
  const acessibilidadeValue = (value || "").trim().toUpperCase();
  if (!acessibilidadeValue) return "";
  if (acessibilidadeValue === "NAO" || acessibilidadeValue === "NAO_POSSUI") return "NAO";
  if (acessibilidadeValue === "SIM" || acessibilidadeValue === "INTERNO_COM_COMUNICACAO_RUA" || acessibilidadeValue === "INTERNO_SEM_COMUNICACAO_RUA")
    return "SIM";
  return acessibilidadeValue;
};

const fromApiAcessibilidade = (value?: string) => {
  const acessibilidadeValue = (value || "").trim().toUpperCase();
  if (!acessibilidadeValue) return "";
  if (acessibilidadeValue === "NAO" || acessibilidadeValue === "NAO_POSSUI") return "NAO";
  if (acessibilidadeValue === "INTERNO_COM_COMUNICACAO_RUA" || acessibilidadeValue === "INTERNO_SEM_COMUNICACAO_RUA") return acessibilidadeValue;
  if (acessibilidadeValue === "SIM") return "INTERNO_COM_COMUNICACAO_RUA";
  return "";
};

const CONTAGEM_COMODOS_MAX_DIGITOS = 3;
const MEDIA_DORMITORIOS_MAX_DIGITOS = 3;

const toLimitedInteger = (value: string, maxDigits: number) => {
  const digits = value.replace(/\D/g, "").slice(0, maxDigits);
  return digits ? Number(digits) : 0;
};

const toLimitedIntegerString = (value: string, maxDigits: number) => {
  const [integerPart = ""] = value.split(/[.,]/, 1);
  return integerPart.replace(/\D/g, "").slice(0, maxDigits);
};
const handleNumericKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (event.key === "e" || event.key === "E" || event.key === "+" || event.key === "-") {
    event.preventDefault();
  }
};

const toCode = (value: string | undefined, options: Array<{ value: string; label: string }>) => {
  const raw = (value || "").trim();
  if (!raw) return "";
  const up = raw.toUpperCase();
  if (options.some((o) => o.value === up)) return up;
  const byLabel = options.find((o) => o.label.toUpperCase() === up);
  return byLabel?.value || "";
};

const parseApiList = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "result" in payload) {
    const result = (payload as { result?: unknown }).result;
    if (Array.isArray(result)) return result as T[];
  }
  return [];
};

const formFromProntuario = (prontuario: Prontuario | null): HabitacaoFormData => {
  const ultimaCondicao = prontuario?.condicoesHabitacionais[prontuario.condicoesHabitacionais.length - 1];
  return {
    tipoMoradia: toCode(ultimaCondicao?.tipoMoradia, TIPO_RESIDENCIA_OPTIONS),
    materialParedes: toCode(ultimaCondicao?.materialParedes, MATERIAL_OPTIONS),
    energia: toCode(ultimaCondicao?.energia, ENERGIA_OPTIONS),
    possuiAguaCanalizada: toCode(ultimaCondicao?.possuiAguaCanalizada, SIM_NAO_OPTIONS),
    condicoesEstruturais: ultimaCondicao?.condicoesEstruturais || "",
    abastecimento: toCode(ultimaCondicao?.abastecimento, ABASTECIMENTO_OPTIONS),
    saneamento: toCode(ultimaCondicao?.saneamento, ESGOTAMENTO_OPTIONS),
    coleta: toCode(ultimaCondicao?.coleta, COLETA_OPTIONS),
    numeroComodos: ultimaCondicao?.numeroComodos || 0,
    numeroDormitorios: ultimaCondicao?.numeroDormitorios || 0,
    mediaPessoasPorDormitorio: ultimaCondicao?.mediaPessoasPorDormitorio || "",
    acessibilidade: fromApiAcessibilidade(ultimaCondicao?.acessibilidade),
    riscoDesabamento: toCode(ultimaCondicao?.riscoDesabamento, SIM_NAO_OPTIONS),
    dificilAcesso: toCode(ultimaCondicao?.dificilAcesso, SIM_NAO_OPTIONS),
    areaConflito: toCode(ultimaCondicao?.areaConflito, SIM_NAO_OPTIONS),
    observacoesDiagnostico: ultimaCondicao?.observacoesDiagnostico || "",
  };
};

const formFromApi = (item: CondicaoHabitacionalResponse): HabitacaoFormData => ({
  tipoMoradia: item.tipo_residencia || "",
  materialParedes: item.material || "",
  energia: item.acesso_eletrico || "",
  possuiAguaCanalizada: item.agua_canalizada || "",
  condicoesEstruturais: "",
  abastecimento: item.abastecimento_agua || "",
  saneamento: item.esgotamento || "",
  coleta: item.coleta || "",
  numeroComodos: Number(item.total_comodos || 0),
  numeroDormitorios: Number(item.total_dormitorios || 0),
  mediaPessoasPorDormitorio: item.media_dormitorios === null || item.media_dormitorios === undefined ? "" : String(item.media_dormitorios),
  acessibilidade: fromApiAcessibilidade(item.locomocao),
  riscoDesabamento: item.area_risco || "",
  dificilAcesso: item.dificil_acesso || "",
  areaConflito: item.area_conflito || "",
  observacoesDiagnostico: item.outras_observacoes || "",
});

export function CondicoesHabitacionais({ prontuario, onNext, onSave }: Props) {
  const [searchParams] = useSearchParams();
  const cpfRef = useMemo(() => normalizeCpf(prontuario?.membros.find((m) => m.id === prontuario?.pessoaReferenciaId)?.cpf || ""), [prontuario]);
  const prontuarioId = useMemo(
    () => searchParams.get("prontuarioId") || (cpfRef ? localStorage.getItem(`prontuarioIdByCpf:${cpfRef}`) || "" : ""),
    [searchParams, cpfRef],
  );

  const [formData, setFormData] = useState<HabitacaoFormData>(() => formFromProntuario(prontuario));
  const [registroId, setRegistroId] = useState("");
  const [carregandoApi, setCarregandoApi] = useState(false);
  const { mutateAsync: salvarCondicaoHabitacional, isPending: salvandoCondicaoHabitacional } = useCondicaoHabitacionalProntuario();

  useEffect(() => {
    setFormData(formFromProntuario(prontuario));
    setRegistroId("");
  }, [prontuario]);

  useEffect(() => {
    if (!prontuarioId) return;

    const carregarCondicaoApi = async () => {
      setCarregandoApi(true);
      try {
        const { data } = await condicaoHabitacionalService.listar({ prontuario: prontuarioId });
        const lista = parseApiList<CondicaoHabitacionalResponse>(data);
        const ultimo = lista.length ? lista[lista.length - 1] : null;
        if (!ultimo) {
          setRegistroId("");
          return;
        }
        setRegistroId(String(ultimo.id || ""));
        setFormData(formFromApi(ultimo));
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Não foi possível carregar as condições habitacionais."));
      } finally {
        setCarregandoApi(false);
      }
    };

    carregarCondicaoApi();
  }, [prontuarioId]);

  const handleSalvarCondicao = async () => {
    if (!prontuarioId) {
      toast.error("Prontuário não identificado na URL. Abra esta tela com um prontuário válido.");
      return false;
    }
    if (!formData.tipoMoradia) {
      toast.error("Selecione o tipo de residência.");
      return false;
    }

    const mediaDormitorios =
      formData.mediaPessoasPorDormitorio === ""
        ? null
        : Number.isFinite(Number(formData.mediaPessoasPorDormitorio))
          ? Number(formData.mediaPessoasPorDormitorio)
          : null;

    try {
      const salvo = await salvarCondicaoHabitacional({
        id: registroId || undefined,
        payload: {
          prontuario: prontuarioId,
          tipo_residencia: formData.tipoMoradia,
          material: formData.materialParedes || undefined,
          acesso_eletrico: formData.energia || undefined,
          agua_canalizada: formData.possuiAguaCanalizada || undefined,
          abastecimento_agua: formData.abastecimento || undefined,
          esgotamento: formData.saneamento || undefined,
          coleta: formData.coleta || undefined,
          total_comodos: Number.isFinite(Number(formData.numeroComodos)) ? Number(formData.numeroComodos) : 0,
          total_dormitorios: Number.isFinite(Number(formData.numeroDormitorios)) ? Number(formData.numeroDormitorios) : 0,
          media_dormitorios: mediaDormitorios,
          locomocao: toApiAcessibilidade(formData.acessibilidade) || undefined,
          area_risco: formData.riscoDesabamento || undefined,
          dificil_acesso: formData.dificilAcesso || undefined,
          area_conflito: formData.areaConflito || undefined,
          outras_observacoes: formData.observacoesDiagnostico || undefined,
        },
      });
      if (salvo?.id) setRegistroId(String(salvo.id));
      toast.success("Condições habitacionais registradas!");
      onSave();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar as condições habitacionais."));
      return false;
    }
  };

  const handleSubmit = async () => {
    const ok = await handleSalvarCondicao();

    if (!ok) return;

    toast.success("Etapa salva com sucesso!");
    onNext();
  };

  return (
    <div className="space-y-8 pb-20">
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Home className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Estrutura e Tipo de Moradia</h3>
        </div>
        <Card className="shadow-sm">
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Tipo de residência *</Label>
              <Select value={formData.tipoMoradia} onValueChange={(v) => setFormData({ ...formData, tipoMoradia: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_RESIDENCIA_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-8 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Material das paredes externas</Label>
              <Select value={formData.materialParedes} onValueChange={(v) => setFormData({ ...formData, materialParedes: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-4 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Qual o número total de cômodos do domicílio?</Label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={CONTAGEM_COMODOS_MAX_DIGITOS}
                value={formData.numeroComodos}
                onKeyDown={handleNumericKeyDown}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    numeroComodos: toLimitedInteger(e.target.value, CONTAGEM_COMODOS_MAX_DIGITOS),
                  })
                }
              />
            </div>

            <div className="md:col-span-4 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Qual o número de cômodos utilizados como dormitório?</Label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={CONTAGEM_COMODOS_MAX_DIGITOS}
                value={formData.numeroDormitorios}
                onKeyDown={handleNumericKeyDown}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    numeroDormitorios: toLimitedInteger(e.target.value, CONTAGEM_COMODOS_MAX_DIGITOS),
                  })
                }
              />
            </div>

            <div className="md:col-span-4 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">
                Qual é o nº de pessoas do domicílio dividido pelo nº de dormitórios?
              </Label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={MEDIA_DORMITORIOS_MAX_DIGITOS}
                value={formData.mediaPessoasPorDormitorio}
                onKeyDown={handleNumericKeyDown}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    mediaPessoasPorDormitorio: toLimitedIntegerString(e.target.value, MEDIA_DORMITORIOS_MAX_DIGITOS),
                  })
                }
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Droplets className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Infraestrutura e Saneamento</h3>
        </div>
        <Card className="shadow-sm">
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-4 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500 italic flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Acesso à energia elétrica
              </Label>
              <Select value={formData.energia} onValueChange={(v) => setFormData({ ...formData, energia: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ENERGIA_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-4 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Água canalizada?</Label>
              <Select value={formData.possuiAguaCanalizada} onValueChange={(v) => setFormData({ ...formData, possuiAguaCanalizada: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {SIM_NAO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-4 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Forma de abastecimento de água</Label>
              <Select value={formData.abastecimento} onValueChange={(v) => setFormData({ ...formData, abastecimento: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ABASTECIMENTO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-6 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500 italic flex items-center gap-1">Escoamento sanitário</Label>
              <Select value={formData.saneamento} onValueChange={(v) => setFormData({ ...formData, saneamento: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ESGOTAMENTO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-6 space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500 italic flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Coleta de lixo
              </Label>
              <Select value={formData.coleta} onValueChange={(v) => setFormData({ ...formData, coleta: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {COLETA_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <ShieldAlert className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold text-lg text-slate-800">Acessibilidade e vulnerabilidades do território/domicílio</h3>
        </div>
        <Card className="shadow-sm">
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="block min-h-10 text-xs font-bold uppercase leading-4 text-slate-500">
                O domicílio está localizado em área de risco (desabamento/alagamento)?
              </Label>
              <Select value={formData.acessibilidade} onValueChange={(v) => setFormData({ ...formData, acessibilidade: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ACESSIBILIDADE_VULNERABILIDADE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex h-full flex-col gap-2">
              <Label className="block min-h-10 text-xs font-bold uppercase leading-4 text-slate-500">
                O domicílio está localizado em área de risco (desabamento/alagamento)?
              </Label>
              <div className="mt-auto">
                <Select value={formData.riscoDesabamento} onValueChange={(v) => setFormData({ ...formData, riscoDesabamento: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIM_NAO_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex h-full flex-col gap-2">
              <Label className="block min-h-10 text-xs font-bold uppercase leading-4 text-slate-500">
                O domicílio está localizado em área de risco (desabamento/alagamento)?
              </Label>
              <div className="mt-auto">
                <Select value={formData.dificilAcesso} onValueChange={(v) => setFormData({ ...formData, dificilAcesso: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIM_NAO_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="block min-h-10 text-xs font-bold uppercase leading-4 text-slate-500">
                O domicílio está localizado em área de risco (desabamento/alagamento)?
              </Label>
              <Select value={formData.areaConflito} onValueChange={(v) => setFormData({ ...formData, areaConflito: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {SIM_NAO_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Diagnóstico Adicional</h3>
        </div>
        <Card className="shadow-sm ">
          <CardContent className="p-6">
            <Label className="text-xs font-bold uppercase text-slate-500 block mb-3">
              Observações referentes às condições habitacionais da família
            </Label>
            <Textarea
              className="min-h-[120px] bg-slate-50/30"
              value={formData.observacoesDiagnostico}
              onChange={(e) => setFormData({ ...formData, observacoesDiagnostico: e.target.value })}
              placeholder={
                "Descreva detalhes sobre precariedade, necessidade de reformas ou situações específicas não contempladas acima.\n(Atenção! Toda anotação incluída neste espaço deve ser precedida de data, nome e função do profissional responsável.)"
              }
              maxLength={600}
            />
            <p className="text-xs text-slate-400 text-right mt-1">{formData.observacoesDiagnostico.length}/600</p>
          </CardContent>
        </Card>
      </section>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button variant="outline" onClick={handleSalvarCondicao} className="gap-2" disabled={salvandoCondicaoHabitacional || carregandoApi}>
          <Save className="w-4 h-4" /> {salvandoCondicaoHabitacional ? "Salvando..." : "Apenas Salvar"}
        </Button>
        <Button onClick={handleSubmit} className="gap-2" disabled={salvandoCondicaoHabitacional || carregandoApi}>
          {salvandoCondicaoHabitacional ? "Salvando..." : "Salvar e avançar"} <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
