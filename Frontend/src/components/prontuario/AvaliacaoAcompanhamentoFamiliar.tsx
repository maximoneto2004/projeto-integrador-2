import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/sonner";
import type { Prontuario } from "@/types/prontuario";
import { getApiErrorMessage } from "@/lib/notifications";
import {
  avaliacaoAcompanhamentoFamiliarService,
  type AvaliacaoAcompanhamentoFamiliarResponse,
} from "@/services/prontuario/avaliacaoAcompanhamentoFamiliarService";
import { useAvaliacaoAcompanhamentoFamiliarProntuario } from "@/hooks/prontuario/useAvaliacaoAcompanhamentoFamiliarProntuario";
import { CheckCircle2, ExternalLink, HeartHandshake, TrendingUp, FileEdit, Save, ArrowRight } from "lucide-react";

type OfertaAssistencia = "" | "SIM" | "PARCIALMENTE" | "NAO";
type Encaminhamentos = "" | "SIM" | "PARCIAL" | "SEM" | "NAO";
type VinculoFamilia = "" | "SIM" | "PARCIALMENTE" | "NAO";
type StatusVulnerabilidade = "" | "PIORA" | "EQUIVALENTE" | "AVANCO" | "SIGNIFICATIVO";

interface AvaliacaoResultados {
  ofertasDisponibilizadas: OfertaAssistencia;
  encaminhamentosEfetivos: Encaminhamentos;
  reconheceServico: VinculoFamilia;
  classificacaoResultado: StatusVulnerabilidade;
  resultadosDescricao: string;
}

interface Props {
  prontuario: Prontuario | null;
  onSave: () => void;
  onNext: () => void;
}

const normalizeCpf = (value?: string) => (value || "").replace(/\D/g, "");
const AVALIACAO_ANALISE_MAX = 600;

const parseApiList = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "result" in payload) {
    const result = (payload as { result?: unknown }).result;
    if (Array.isArray(result)) return result as T[];
  }
  return [];
};

export function AvaliacaoAcompanhamentoFamiliar({ prontuario, onSave, onNext }: Props) {
  const [searchParams] = useSearchParams();
  const cpfRef = useMemo(() => normalizeCpf(prontuario?.membros.find((m) => m.id === prontuario?.pessoaReferenciaId)?.cpf || ""), [prontuario]);
  const prontuarioId = useMemo(
    () => searchParams.get("prontuarioId") || (cpfRef ? localStorage.getItem(`prontuarioIdByCpf:${cpfRef}`) || "" : ""),
    [searchParams, cpfRef],
  );

  const { mutateAsync: salvarAvaliacao, isPending: salvandoAvaliacao } = useAvaliacaoAcompanhamentoFamiliarProntuario();

  const [carregandoApi, setCarregandoApi] = useState(false);
  const [avaliacaoId, setAvaliacaoId] = useState("");
  const [form, setForm] = useState<AvaliacaoResultados>({
    ofertasDisponibilizadas: "",
    encaminhamentosEfetivos: "",
    reconheceServico: "",
    classificacaoResultado: "",
    resultadosDescricao: "",
  });

  useEffect(() => {
    if (!prontuarioId) return;

    const load = async () => {
      setCarregandoApi(true);
      try {
        const res = await avaliacaoAcompanhamentoFamiliarService.listar({ prontuario: prontuarioId });
        const registro = parseApiList<AvaliacaoAcompanhamentoFamiliarResponse>(res.data).find(
          (item) => String(item.prontuario) === String(prontuarioId),
        );
        if (!registro) return;

        setAvaliacaoId(String(registro.id || ""));
        setForm({
          ofertasDisponibilizadas: (String(registro.ofertas_assistencia || "") as OfertaAssistencia) || "",
          encaminhamentosEfetivos: (String(registro.encaminhamentos || "") as Encaminhamentos) || "",
          reconheceServico: (String(registro.vinculo_familia || "") as VinculoFamilia) || "",
          classificacaoResultado: (String(registro.status || "") as StatusVulnerabilidade) || "",
          resultadosDescricao: String(registro.analise || ""),
        });
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Não foi possível carregar a avaliação do acompanhamento familiar."));
      } finally {
        setCarregandoApi(false);
      }
    };

    load();
  }, [prontuarioId]);

  const handleSalvar = async (): Promise<boolean> => {
    if (!prontuarioId) {
      toast.error("Prontuário não identificado na URL.");
      return;
    }

    try {
      const salvo = await salvarAvaliacao({
        id: avaliacaoId || undefined,
        payload: {
          prontuario: prontuarioId,
          ofertas_assistencia: form.ofertasDisponibilizadas || undefined,
          encaminhamentos: form.encaminhamentosEfetivos || undefined,
          vinculo_familia: form.reconheceServico || undefined,
          status: form.classificacaoResultado || undefined,
          analise: form.resultadosDescricao || undefined,
        },
      });

      if (salvo?.id) setAvaliacaoId(String(salvo.id));
      toast.success("Avaliação de resultados salva com sucesso.");
      onSave();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar a avaliação do acompanhamento familiar."));
      return false;
    }
  };

  const bloqueado = carregandoApi || salvandoAvaliacao;

  return (
    <div className="space-y-10 pb-20">
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Avaliação Sintética de Resultados</h3>
        </div>

        <Card className="border-indigo-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-indigo-50/50 border-b py-4">
            <div className="flex items-start gap-3">
              <p className="text-sm leading-relaxed">
                Este registro consolida a percepção técnica sobre a efetividade das proteções sociais e o protagonismo da família no processo de
                acompanhamento.
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-white-100 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <Label className="text-sm font-bold text-slate-700">Ofertas da Assistência Social</Label>
                </div>
                <p className="text-sm font-medium leading-relaxed">
                  Foram efetivamente disponibilizadas para a família/indivíduo todas as ofertas da Assistência Social cuja necessidade havia sido
                  identificada pelo profissional?
                </p>
                <Select
                  value={form.ofertasDisponibilizadas}
                  onValueChange={(v) => setForm({ ...form, ofertasDisponibilizadas: v as OfertaAssistencia })}
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SIM">Sim, integralmente</SelectItem>
                    <SelectItem value="PARCIALMENTE">Parcialmente</SelectItem>
                    <SelectItem value="NAO">Não foram disponibilizadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-white-100 rounded-lg">
                    <ExternalLink className="w-4 h-4 text-primary" />
                  </div>
                  <Label className="text-sm font-bold text-slate-700">Encaminhamentos para Rede</Label>
                </div>
                <p className="text-sm font-medium leading-relaxed">
                  Em relação aos encaminhamentos da família/indivíduo para demais políticas, houve atendimento efetivo e resolutivo por parte da área
                  que recebeu o encaminhamento?
                </p>
                <Select
                  value={form.encaminhamentosEfetivos}
                  onValueChange={(v) => setForm({ ...form, encaminhamentosEfetivos: v as Encaminhamentos })}
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SIM">Sim, houve resolutividade</SelectItem>
                    <SelectItem value="PARCIAL">Resolutividade parcial</SelectItem>
                    <SelectItem value="SEM">Sem resolutividade</SelectItem>
                    <SelectItem value="NAO">Não houve necessidade de rede</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-white-100 rounded-lg">
                    <HeartHandshake className="w-4 h-4 text-primary" />
                  </div>
                  <Label className="text-sm font-bold text-slate-700">Vínculo Família-Serviço</Label>
                </div>
                <p className="text-sm font-medium leading-relaxed">
                  A família reconhece o Serviço de Acompanhamento como algo que contribui para o enfrentamento de seus problemas e dificuldades e
                  deseja continuar recebendo atenções deste serviço?
                </p>
                <Select value={form.reconheceServico} onValueChange={(v) => setForm({ ...form, reconheceServico: v as VinculoFamilia })}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SIM">Sim, reconhece e deseja continuar</SelectItem>
                    <SelectItem value="PARCIALMENTE">Reconhece parcialmente</SelectItem>
                    <SelectItem value="NAO">Não reconhece a contribuição</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-white-100 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <Label className="text-sm font-bold text-slate-700">Status de Vulnerabilidade</Label>
                </div>
                <p className="text-sm font-medium leading-relaxed">
                  Como você classifica os resultados obtidos quanto a ampliação da capacidade de enfrentamento ou superação das condições de
                  vulnerabilidade e risco social e pessoal?
                </p>
                <Select
                  value={form.classificacaoResultado}
                  onValueChange={(v) => setForm({ ...form, classificacaoResultado: v as StatusVulnerabilidade })}
                >
                  <SelectTrigger
                    className={`border-slate-200 ${form.classificacaoResultado === "SIGNIFICATIVO" ? "bg-emerald-50 border-emerald-200" : "bg-slate-50"}`}
                  >
                    <SelectValue placeholder="Selecione a evolução..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIORA" className="text-red-600">
                      Houve agravamento/piora
                    </SelectItem>
                    <SelectItem value="EQUIVALENTE">Situação equivalente (sem avanços)</SelectItem>
                    <SelectItem value="AVANCO">Houve avanço/melhoria</SelectItem>
                    <SelectItem value="SIGNIFICATIVO" className="text-emerald-700 font-semibold">
                      Avanço significativo (Sugere desligamento)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-6 ">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <FileEdit className="w-5 h-5 text-primary" />
                    <Label className="font-semibold">Análise Descritiva dos Resultados</Label>
                  </div>
                  <p className="text-sm font-medium leading-relaxed">
                    Descreva os principais ganhos, potencialidades desenvolvidas e fatores que dificultaram o processo.
                  </p>
                  <Textarea
                    rows={6}
                    placeholder="Inicie aqui a redação técnica da avaliação final..."
                    className="focus:ring-indigo-500 placeholder:text-slate-500 resize-none"
                    value={form.resultadosDescricao}
                    maxLength={AVALIACAO_ANALISE_MAX}
                    onChange={(e) => setForm({ ...form, resultadosDescricao: e.target.value.slice(0, AVALIACAO_ANALISE_MAX) })}
                  />
                  <p className="text-xs text-slate-400 text-right mt-1">
                    {form.resultadosDescricao.length}/{AVALIACAO_ANALISE_MAX}
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
        <Button variant="outline" onClick={handleSalvar} className="gap-2 border-slate-300" disabled={bloqueado}>
          <Save className="w-4 h-4" /> {salvandoAvaliacao ? "Salvando..." : "Salvar Avaliação"}
        </Button>
        <Button
          onClick={async () => {
            const salvou = await handleSalvar();
            if (salvou) onNext();
          }}
          className="gap-2 bg-primary px-8 shadow-md"
          disabled={bloqueado}
        >
          Concluir Diagnóstico <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
