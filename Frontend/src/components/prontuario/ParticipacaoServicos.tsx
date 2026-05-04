import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Home, Users2, HeartHandshake, MessageSquare, Save, ArrowRight, ShieldAlert, MapPin, Baby, UserRound, Hammer, Zap } from "lucide-react";
import { getApiErrorMessage } from "@/lib/notifications";
import type { Prontuario } from "@/types/prontuario";
import { convivenciaFamiliarService, type ConvivenciaFamiliarResponse } from "@/services/prontuario/convivenciaFamiliarService";
import { useConvivenciaFamiliarProntuario } from "@/hooks/prontuario/useConvivenciaFamiliarProntuario";
import { toast } from "@/lib/sonner";

interface Props {
  prontuario: Prontuario | null;
  onNext: () => void;
  onSave: () => void;
}

const normalizeCpf = (value?: string) => (value || "").replace(/\D/g, "");

const parseApiList = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "result" in payload) {
    const result = (payload as { result?: unknown }).result;
    if (Array.isArray(result)) return result as T[];
  }
  return [];
};

const toNumberOrUndefined = (value: string) => {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const asStringNumber = (value: unknown) => (value === null || value === undefined ? "" : String(value));

const toApiSimNao = (value: string) => {
  if (value === "sim") return "SIM";
  if (value === "nao") return "NAO";
  return undefined;
};

const fromApiSimNao = (value?: string) => {
  if (value === "SIM") return "sim";
  if (value === "NAO") return "nao";
  return "";
};

const toApiConflito = (value: string) => {
  if (value === "comViolencia") return "COM_VIOLENCIA";
  if (value === "semViolencia") return "SEM_VIOLENCIA";
  if (value === "semConflitos") return "SEM_CONFLICO";
  return undefined;
};

const fromApiConflito = (value?: string) => {
  if (value === "COM_VIOLENCIA") return "comViolencia";
  if (value === "SEM_VIOLENCIA") return "semViolencia";
  if (value === "SEM_CONFLICO") return "semConflitos";
  return "";
};

const ANOS_RESIDENCIA_MAX_DIGITOS = 3;
const normalizeAnosResidencia = (value: string) => value.replace(/\D/g, "").slice(0, ANOS_RESIDENCIA_MAX_DIGITOS);
const handleNumericKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (event.key === "e" || event.key === "E" || event.key === "+" || event.key === "-") {
    event.preventDefault();
  }
};

type ParticipacaoForm = {
  anosEstado: string;
  sempreEstado: boolean;
  anosMunicipio: string;
  sempreMunicipio: boolean;
  anosBairro: string;
  sempreBairro: boolean;
  discriminacao: string;
  apoioRede: string;
  vizinhos: string;
  religiao: string;
  movimentos: string;
  criancasSemAcesso: string;
  idososSemAcesso: string;
  sozinhosCasa: string;
  relConjugais: string;
  relPaisFilhos: string;
  relIrmaos: string;
  relOutros: string;
  outrasObservacoesDiagnostico: string;
};

const HISTORICO_RESIDENCIA_ITEMS = [
  { label: "No Estado", field: "anosEstado", check: "sempreEstado" },
  { label: "No Município", field: "anosMunicipio", check: "sempreMunicipio" },
  { label: "Neste Bairro", field: "anosBairro", check: "sempreBairro" },
] as const;

const VINCULOS_APOIO_ITEMS = [
  { field: "discriminacao", label: "Vítima de ameaça ou discriminação na comunidade?", icon: ShieldAlert },
  { field: "apoioRede", label: "Possui parentes próximos que integram rede de apoio?", icon: Users2 },
  { field: "vizinhos", label: "Possui vizinhos que constituam rede de solidariedade?", icon: Home },
  { field: "religiao", label: "Participa de grupos religiosos ou comunitários?", icon: HeartHandshake },
  { field: "movimentos", label: "Participa de movimentos sociais, sindicatos ou defesa de interesses coletivos?", icon: Hammer },
  { field: "criancasSemAcesso", label: "Criança ou adolescente sem acesso a lazer, recreação e convívio social?", icon: Baby },
  { field: "idososSemAcesso", label: "Idoso sem acesso a lazer, recreação e convívio social?", icon: UserRound },
  { field: "sozinhosCasa", label: "Dependentes (crianças, idosos ou PcD) permanecem sozinhos sem acompanhante adulto?", icon: ShieldAlert },
] as const;

const CONVIVENCIA_CONFLITOS_ITEMS = [
  { label: "Relações Conjugais", field: "relConjugais" },
  { label: "Relações entre Pais e Filhos", field: "relPaisFilhos" },
  { label: "Relações entre Irmãos", field: "relIrmaos" },
  {
    label: "Relações conflituosas envolvendo outros indivíduos que residam no domicílio?",
    field: "relOutros",
  },
] as const;

export function ParticipacaoServicos({ prontuario, onNext, onSave }: Props) {
  const [searchParams] = useSearchParams();
  const cpfRef = useMemo(() => normalizeCpf(prontuario?.membros.find((m) => m.id === prontuario?.pessoaReferenciaId)?.cpf || ""), [prontuario]);
  const prontuarioId = useMemo(
    () => searchParams.get("prontuarioId") || (cpfRef ? localStorage.getItem(`prontuarioIdByCpf:${cpfRef}`) || "" : ""),
    [searchParams, cpfRef],
  );

  const { mutateAsync: salvarConvivenciaFamiliar, isPending: salvandoConvivenciaFamiliar } = useConvivenciaFamiliarProntuario();

  const [convivenciaFamiliarId, setConvivenciaFamiliarId] = useState("");
  const [carregandoApi, setCarregandoApi] = useState(false);
  const [form, setForm] = useState<ParticipacaoForm>({
    anosEstado: "",
    sempreEstado: false,
    anosMunicipio: "",
    sempreMunicipio: false,
    anosBairro: "",
    sempreBairro: false,
    discriminacao: "",
    apoioRede: "",
    vizinhos: "",
    religiao: "",
    movimentos: "",
    criancasSemAcesso: "",
    idososSemAcesso: "",
    sozinhosCasa: "",
    relConjugais: "",
    relPaisFilhos: "",
    relIrmaos: "",
    relOutros: "",
    outrasObservacoesDiagnostico: "",
  });

  useEffect(() => {
    if (!prontuarioId) return;

    const load = async () => {
      setCarregandoApi(true);
      try {
        const response = await convivenciaFamiliarService.listar({ prontuario: prontuarioId });
        const registros = parseApiList<ConvivenciaFamiliarResponse>(response.data).filter((item) => String(item.prontuario) === String(prontuarioId));
        const atual = registros[registros.length - 1];
        if (!atual) return;

        setConvivenciaFamiliarId(String(atual.id || ""));
        setForm({
          anosEstado: asStringNumber(atual.tempo_estado),
          sempreEstado: Boolean(atual.estado),
          anosMunicipio: asStringNumber(atual.tempo_municipio),
          sempreMunicipio: Boolean(atual.municipio),
          anosBairro: asStringNumber(atual.tempo_bairro),
          sempreBairro: Boolean(atual.bairro),
          discriminacao: fromApiSimNao(atual.vitima_ameaca),
          apoioRede: fromApiSimNao(atual.parente_proximo),
          vizinhos: fromApiSimNao(atual.vizinhos_apoio),
          religiao: fromApiSimNao(atual.grupo_religioso),
          movimentos: fromApiSimNao(atual.movimento_social),
          criancasSemAcesso: fromApiSimNao(atual.atividade_lazer_crianca),
          idososSemAcesso: fromApiSimNao(atual.atividade_lazer_idoso),
          sozinhosCasa: fromApiSimNao(atual.companhia_adulto),
          relConjugais: fromApiConflito(atual.conflitos_conjugais),
          relPaisFilhos: fromApiConflito(atual.conflitos_responsaveis),
          relIrmaos: fromApiConflito(atual.conflitos_irmaos),
          relOutros: fromApiConflito(atual.conflitos_outros),
          outrasObservacoesDiagnostico: String(atual.outras_observacoes || ""),
        });
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Não foi possível carregar convivência familiar e comunitária."));
      } finally {
        setCarregandoApi(false);
      }
    };

    load();
  }, [prontuarioId]);

  const update = <K extends keyof ParticipacaoForm>(field: K, value: ParticipacaoForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSalvar = async (): Promise<boolean> => {
    if (!prontuarioId) {
      toast.error("Prontuário não identificado na URL.");
      return false;
    }

    try {
      const salvo = await salvarConvivenciaFamiliar({
        id: convivenciaFamiliarId || undefined,
        payload: {
          prontuario: prontuarioId,
          tempo_estado: toNumberOrUndefined(form.anosEstado),
          estado: Boolean(form.sempreEstado),
          tempo_municipio: toNumberOrUndefined(form.anosMunicipio),
          municipio: Boolean(form.sempreMunicipio),
          tempo_bairro: toNumberOrUndefined(form.anosBairro),
          bairro: Boolean(form.sempreBairro),
          vitima_ameaca: toApiSimNao(form.discriminacao),
          parente_proximo: toApiSimNao(form.apoioRede),
          vizinhos_apoio: toApiSimNao(form.vizinhos),
          grupo_religioso: toApiSimNao(form.religiao),
          movimento_social: toApiSimNao(form.movimentos),
          atividade_lazer_crianca: toApiSimNao(form.criancasSemAcesso),
          atividade_lazer_idoso: toApiSimNao(form.idososSemAcesso),
          companhia_adulto: toApiSimNao(form.sozinhosCasa),
          conflitos_conjugais: toApiConflito(form.relConjugais),
          conflitos_responsaveis: toApiConflito(form.relPaisFilhos),
          conflitos_irmaos: toApiConflito(form.relIrmaos),
          conflitos_outros: toApiConflito(form.relOutros),
          outras_observacoes: form.outrasObservacoesDiagnostico || undefined,
        },
      });

      if (salvo?.id) setConvivenciaFamiliarId(String(salvo.id));
      toast.success("Diagnóstico de convivência salvo com sucesso!");
      onSave();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar convivência familiar e comunitária."));
      return false;
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1 text-slate-800">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Histórico de Residência</h3>
        </div>

        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {HISTORICO_RESIDENCIA_ITEMS.map((item) => (
              <div key={item.field} className="space-y-3 bg-white p-4 rounded-xl border">
                <Label className="text-xs font-bold uppercase text-slate-500">{item.label}</Label>
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Anos"
                      className="pl-8"
                      maxLength={ANOS_RESIDENCIA_MAX_DIGITOS}
                      value={form[item.field]}
                      onKeyDown={handleNumericKeyDown}
                      onChange={(e) => update(item.field, normalizeAnosResidencia(e.target.value))}
                      disabled={form[item.check]}
                    />
                    <Home className="w-4 h-4 absolute left-2.5 top-3 text-slate-400" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id={item.check} checked={form[item.check]} onCheckedChange={(checked) => update(item.check, checked === true)} />
                    <label htmlFor={item.check} className="text-sm text-slate-600 leading-none cursor-pointer">
                      Sempre morou
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1 text-slate-800">
          <HeartHandshake className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Vínculos, Apoio e Acesso a Direitos</h3>
        </div>

        <div className="grid gap-4">
          {VINCULOS_APOIO_ITEMS.map((p) => (
            <Card key={p.field} className="overflow-hidden border-slate-200">
              <div className="p-4 flex-1 space-y-3">
                <div className="flex gap-2 items-start">
                  <p className="text-sm font-medium text-slate-700 leading-tight">{p.label}</p>
                </div>
                <RadioGroup className="flex gap-4" value={form[p.field]} onValueChange={(v) => update(p.field, v)}>
                  <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
                    <RadioGroupItem value="sim" id={`${p.field}-sim`} />
                    <Label htmlFor={`${p.field}-sim`} className="cursor-pointer">
                      Sim
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
                    <RadioGroupItem value="nao" id={`${p.field}-nao`} />
                    <Label htmlFor={`${p.field}-nao`} className="cursor-pointer">
                      Não
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1 text-slate-800">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Convivência e Conflitos</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONVIVENCIA_CONFLITOS_ITEMS.map((item) => (
            <Card key={item.field} className="p-4 border-purple-100 shadow-sm">
              <Label className="text-sm font-semibold block mb-3 leading-snug">{item.label}</Label>
              <RadioGroup value={form[item.field]} onValueChange={(v) => update(item.field, v)} className="grid gap-2">
                {[
                  { v: "comViolencia", l: "Conflituoso, com violência" },
                  { v: "semViolencia", l: "Conflituoso, sem violência" },
                  { v: "semConflitos", l: "Não há conflitos relevantes" },
                ].map((opt) => (
                  <div
                    key={opt.v}
                    className="flex items-center space-x-2 p-2 rounded-lg border border-slate-100 hover:bg-purple-50/50 transition-all"
                  >
                    <RadioGroupItem id={item.field + opt.v} value={opt.v} />
                    <Label htmlFor={item.field + opt.v} className="text-xs cursor-pointer font-medium">
                      {opt.l}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <Label className="font-semibold">Parecer Técnico Consolidado</Label>
          </div>
          <Textarea
            placeholder="Outras observações referentes ao diagnóstico das condições de convivência familiar e comunitária..."
            className="text-black min-h-[140px] placeholder:text-slate-500"
            value={form.outrasObservacoesDiagnostico}
            onChange={(e) => update("outrasObservacoesDiagnostico", e.target.value)}
            maxLength={600}
          />
          <p className="text-xs text-slate-400 text-right mt-1">{form.outrasObservacoesDiagnostico.length}/600</p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
        <Button variant="outline" onClick={handleSalvar} className="gap-2" disabled={salvandoConvivenciaFamiliar || carregandoApi}>
          <Save className="w-4 h-4" />
          {salvandoConvivenciaFamiliar ? "Salvando..." : "Salvar Alterações"}
        </Button>
        <Button
          onClick={async () => {
            const salvou = await handleSalvar();
            if (salvou) onNext();
          }}
          className="gap-2 bg-primary"
          disabled={salvandoConvivenciaFamiliar || carregandoApi}
        >
          Salvar e avançar <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
