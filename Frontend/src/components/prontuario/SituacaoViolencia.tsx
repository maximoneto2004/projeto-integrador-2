import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShieldAlert, Baby, UserRound, History, Save, ArrowRight, AlertTriangle, HeartPulse, Scale, Plus, Trash2 } from "lucide-react";
import type { Prontuario } from "@/types/prontuario";
import { toast } from "@/lib/sonner";
import { getApiErrorMessage } from "@/lib/notifications";
import {
  situacaoViolenciaService,
  type AcompanhamentoCreasResponse,
  type SituacaoViolenciaResponse,
} from "@/services/prontuario/situacaoViolenciaService";
import {
  useAcompanhamentoCreasProntuario,
  useRemoverAcompanhamentoCreasProntuario,
  useSituacaoViolenciaProntuario,
} from "@/hooks/prontuario/useSituacaoViolenciaProntuario";
import { HoverText } from "@/utils/tooltips";

interface Props {
  prontuario: Prontuario | null;
  onNext: () => void;
  onSave: () => void;
}

type CreasHistoricoItem = {
  id: string;
  dataInicio: string;
  dataFim: string;
  creas: string;
};

const normalizeCpf = (value?: string) => (value || "").replace(/\D/g, "");

const parseApiList = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "result" in payload) {
    const result = (payload as { result?: unknown }).result;
    if (Array.isArray(result)) return result as T[];
  }
  return [];
};

const formatMonth = (value: string) => {
  if (!value) return "-";
  const [year, month] = value.slice(0, 7).split("-");
  if (!year || !month) return value;
  return `${month}/${year}`;
};

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
const CREAS_IDENTIFICACAO_MAX = 250;

export function SituacaoViolencia({ prontuario, onNext, onSave }: Props) {
  const [searchParams] = useSearchParams();
  const cpfRef = useMemo(() => normalizeCpf(prontuario?.membros.find((m) => m.id === prontuario?.pessoaReferenciaId)?.cpf || ""), [prontuario]);
  const prontuarioId = useMemo(
    () => searchParams.get("prontuarioId") || (cpfRef ? localStorage.getItem(`prontuarioIdByCpf:${cpfRef}`) || "" : ""),
    [searchParams, cpfRef],
  );

  const { mutateAsync: salvarSituacaoViolencia, isPending: salvandoSituacaoViolencia } = useSituacaoViolenciaProntuario();
  const { mutateAsync: criarAcompanhamentoCreas, isPending: salvandoCreas } = useAcompanhamentoCreasProntuario();
  const { mutateAsync: removerAcompanhamentoCreas, isPending: removendoCreas } = useRemoverAcompanhamentoCreasProntuario();

  const [carregandoApi, setCarregandoApi] = useState(false);
  const [situacaoViolenciaId, setSituacaoViolenciaId] = useState("");
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [creasForm, setCreasForm] = useState({
    dataInicio: "",
    dataFim: "",
    creas: "",
  });
  const [historicoCreas, setHistoricoCreas] = useState<CreasHistoricoItem[]>([]);
  const [outrasObservacoesDiagnostico, setOutrasObservacoesDiagnostico] = useState("");

  const [paginaAtual, setPaginaAtual] = useState(1);
  const pageSize = 5;
  const totalItens = historicoCreas.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / pageSize));

  const secoesPerguntas = useMemo(
    () => [
      {
        titulo: "Infância e Juventude",
        icon: <Baby className="w-5 h-5 text-primary" />,
        perguntas: [
          { key: "trabalhoInfantil", label: "Membro da família em situação de trabalho infantil?" },
          { key: "negligenciaCrianca", label: "Alguma criança da família sofreu negligência?" },
          { key: "trabalhoRua", label: "Membro da família em situação de trabalho na rua?" },
        ],
      },
      {
        titulo: "Violência e Abuso",
        icon: <ShieldAlert className="w-5 h-5 text-primary" />,
        perguntas: [
          { key: "exploracaoSexual", label: "Vítima de exploração sexual?" },
          { key: "abusoSexual", label: "Vítima de abuso ou violência sexual?" },
          { key: "violenciaFisica", label: "Vítima de violência física?" },
          { key: "violenciaPsicologica", label: "Vítima de violência psicológica?" },
          { key: "traficoPessoas", label: "Vítima de tráfico de pessoas?" },
        ],
      },
      {
        titulo: "Idosos e PcD",
        icon: <UserRound className="w-5 h-5 text-primary" />,
        perguntas: [
          { key: "negligenciaIdoso", label: "Idoso da família sofreu negligência?" },
          { key: "negligenciaPCD", label: "Pessoa com deficiência sofreu negligência?" },
          { key: "violenciaPatrimonial", label: "Vítima de violência patrimonial (Idoso ou PcD)?" },
          { key: "outros", label: "Outra forma de violência vivenciada?" },
        ],
      },
    ],
    [],
  );

  useEffect(() => {
    if (!prontuarioId) return;

    const load = async () => {
      setCarregandoApi(true);
      try {
        const [situacaoRes, creasRes] = await Promise.all([
          situacaoViolenciaService.listar({ prontuario: prontuarioId }),
          situacaoViolenciaService.listarAcompanhamentoCreas({ prontuario: prontuarioId }),
        ]);

        const listaCreas = parseApiList<AcompanhamentoCreasResponse>(creasRes.data)
          .filter((item) => String(item.prontuario) === String(prontuarioId))
          .map((item) => ({
            id: String(item.id),
            dataInicio: String(item.data_inicio || ""),
            dataFim: String(item.data_final || ""),
            creas: String(item.identificao_creas || ""),
          }));
        setHistoricoCreas(listaCreas);

        const situacao = parseApiList<SituacaoViolenciaResponse>(situacaoRes.data).find((item) => String(item.prontuario) === String(prontuarioId));

        if (!situacao) return;

        setSituacaoViolenciaId(String(situacao.id || ""));
        setRespostas({
          trabalhoInfantil: fromApiSimNao(situacao.trabalho_infantil),
          negligenciaCrianca: fromApiSimNao(situacao.negligencia),
          trabalhoRua: fromApiSimNao(situacao.situacao_trabalho_rua),
          exploracaoSexual: fromApiSimNao(situacao.exploracao_sexual),
          abusoSexual: fromApiSimNao(situacao.violencia_sexual),
          violenciaFisica: fromApiSimNao(situacao.violencia_fisica),
          violenciaPsicologica: fromApiSimNao(situacao.violencia_psicologica),
          traficoPessoas: fromApiSimNao(situacao.trafico_pessoa),
          negligenciaIdoso: fromApiSimNao(situacao.idoso_negligencia),
          negligenciaPCD: fromApiSimNao(situacao.deficiente_negligencia),
          violenciaPatrimonial: fromApiSimNao(situacao.violencia_patrimonial),
          outros: fromApiSimNao(situacao.violencia_vivenciada),
        });
        setOutrasObservacoesDiagnostico(String(situacao.observacao || ""));
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Não foi possível carregar situação de violência."));
      } finally {
        setCarregandoApi(false);
      }
    };

    load();
  }, [prontuarioId]);

  const registrarCreas = async () => {
    if (!prontuarioId) {
      toast.error("Prontuário não identificado na URL.");
      return;
    }

    if (!creasForm.dataInicio || !creasForm.creas.trim()) {
      toast.error("Preencha data início e identificação do CREAS.");
      return;
    }

    try {
      const salvo = await criarAcompanhamentoCreas({
        payload: {
          prontuario: prontuarioId,
          data_inicio: `${creasForm.dataInicio}-01`,
          data_final: creasForm.dataFim ? `${creasForm.dataFim}-01` : undefined,
          identificao_creas: creasForm.creas.trim(),
        },
      });

      if (salvo?.id) {
        setHistoricoCreas((prev) => [
          ...prev,
          {
            id: String(salvo.id),
            dataInicio: String(salvo.data_inicio || "").slice(0, 7),
            dataFim: String(salvo.data_final || "").slice(0, 7),
            creas: String(salvo.identificao_creas || ""),
          },
        ]);
      }

      setCreasForm({ dataInicio: "", dataFim: "", creas: "" });
      toast.success("Histórico CREAS registrado.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível registrar acompanhamento CREAS."));
    }
  };

  const removerCreas = async (id: string) => {
    try {
      await removerAcompanhamentoCreas(id);
      setHistoricoCreas((prev) => prev.filter((item) => item.id !== id));
      toast.success("Histórico CREAS removido.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível remover acompanhamento CREAS."));
    }
  };

  const salvar = async (): Promise<boolean> => {
    if (!prontuarioId) {
      toast.error("Prontuário não identificado na URL.");
      return false;
    }

    try {
      const salvo = await salvarSituacaoViolencia({
        id: situacaoViolenciaId || undefined,
        payload: {
          prontuario: prontuarioId,
          trabalho_infantil: toApiSimNao(respostas.trabalhoInfantil),
          negligencia: toApiSimNao(respostas.negligenciaCrianca),
          situacao_trabalho_rua: toApiSimNao(respostas.trabalhoRua),
          exploracao_sexual: toApiSimNao(respostas.exploracaoSexual),
          violencia_sexual: toApiSimNao(respostas.abusoSexual),
          violencia_fisica: toApiSimNao(respostas.violenciaFisica),
          violencia_psicologica: toApiSimNao(respostas.violenciaPsicologica),
          trafico_pessoa: toApiSimNao(respostas.traficoPessoas),
          idoso_negligencia: toApiSimNao(respostas.negligenciaIdoso),
          deficiente_negligencia: toApiSimNao(respostas.negligenciaPCD),
          violencia_patrimonial: toApiSimNao(respostas.violenciaPatrimonial),
          violencia_vivenciada: toApiSimNao(respostas.outros),
          acompanhamento_creas: historicoCreas.map((item) => item.id),
          observacao: outrasObservacoesDiagnostico || undefined,
        },
      });

      if (salvo?.id) setSituacaoViolenciaId(String(salvo.id));
      toast.success("Situação de violência salva com sucesso!");
      onSave();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar situação de violência."));
      return false;
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <section className="space-y-6">
        <div className="flex items-center gap-2 px-1">
          <Scale className="w-6 h-6 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Situações de Violência e Violações</h3>
        </div>

        {secoesPerguntas.map((secao, idx) => (
          <Card key={idx} className="border-slate-200 shadow-sm overflow-hidden border-l-4 border-l-primary">
            <CardHeader className="bg-slate-50/50 py-4 border-b">
              <div className="flex items-center gap-2">
                {secao.icon}
                <CardTitle className="text-base font-semibold">{secao.titulo}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {secao.perguntas.map((p) => (
                  <div key={p.key} className="flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <Label className="text-sm font-medium text-slate-700 mb-3 md:mb-0 max-w-md">{p.label}</Label>
                    <RadioGroup
                      className="flex gap-3"
                      value={respostas[p.key]}
                      onValueChange={(v) => setRespostas((prev) => ({ ...prev, [p.key]: v }))}
                    >
                      <div
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all ${respostas[p.key] === "sim" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-200"}`}
                      >
                        <RadioGroupItem id={p.key + "-sim"} value="sim" />
                        <Label htmlFor={p.key + "-sim"} className="cursor-pointer font-bold uppercase text-[10px]">
                          Sim
                        </Label>
                      </div>
                      <div
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all ${respostas[p.key] === "nao" ? "bg-red-50 border-emerald-200red-200 text-red-700" : "bg-white border-slate-200"}`}
                      >
                        <RadioGroupItem id={p.key + "-nao"} value="nao" />
                        <Label htmlFor={p.key + "-nao"} className="cursor-pointer font-bold uppercase text-[10px]">
                          Não
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <History className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">Histórico de Acompanhamento CREAS</h3>
        </div>

        <Card className="border-amber-200 bg-amber-50/30 border-l-4 border-l-primary shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3 bg-amber-100/50 p-4 rounded-lg border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm text-amber-800 leading-relaxed">
                <strong>Uso exclusivo do CRAS:</strong> Registre abaixo se a família possui histórico de acompanhamento especializado por violação de
                direitos.
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Data Início</Label>
                <Input
                  type="month"
                  className="bg-white"
                  value={creasForm.dataInicio}
                  onChange={(e) => setCreasForm((prev) => ({ ...prev, dataInicio: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Data Final</Label>
                <Input
                  type="month"
                  className="bg-white"
                  value={creasForm.dataFim}
                  onChange={(e) => setCreasForm((prev) => ({ ...prev, dataFim: e.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Identificação do CREAS</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome da unidade"
                    className="bg-white"
                    value={creasForm.creas}
                    maxLength={CREAS_IDENTIFICACAO_MAX}
                    onChange={(e) => setCreasForm((prev) => ({ ...prev, creas: e.target.value.slice(0, CREAS_IDENTIFICACAO_MAX) }))}
                  />
                  <Button onClick={registrarCreas} className="bg-primary" disabled={carregandoApi || salvandoCreas || removendoCreas}>
                    <Plus className="w-4 h-4" /> {salvandoCreas ? "Registrando..." : "Registrar"}
                  </Button>
                </div>
              </div>
            </div>

            {historicoCreas.length > 0 && (
              <div className="mt-4 border rounded-lg overflow-hidden border-amber-200">
                <table className="w-full text-sm">
                  <thead className="bg-amber-50/50 border-b border-amber-100 text-amber-900">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Início</th>
                      <th className="px-4 py-2 text-left font-semibold">Final</th>
                      <th className="px-4 py-2 text-left font-semibold">Identificação do CREAS</th>
                      <th className="px-4 py-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50">
                    {historicoCreas.slice((paginaAtual - 1) * pageSize, paginaAtual * pageSize).map((item) => (
                      <tr key={item.id} className="bg-white hover:bg-amber-50/20">
                        <td className="px-4 py-2 text-slate-600 text-xs">{formatMonth(item.dataInicio)}</td>
                        <td className="px-4 py-2 text-slate-600 text-xs">{formatMonth(item.dataFim)}</td>
                        <td className="max-w-0 px-4 py-2 font-medium">
                          {" "}
                          <HoverText text={item.creas || "-"} cellClassName="font-medium" />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removerCreas(item.id)}
                            disabled={carregandoApi || salvandoCreas || removendoCreas}
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
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
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-primary" />
            <Label className="font-semibold">Observações do Diagnóstico de Violência</Label>
          </div>
          <Textarea
            placeholder="Detalhe situações de risco, encaminhamentos realizados ou impressões técnicas..."
            className="text-black placeholder:text-slate-500 min-h-[120px] focus:ring-blue-500"
            value={outrasObservacoesDiagnostico}
            onChange={(e) => setOutrasObservacoesDiagnostico(e.target.value)}
            maxLength={600}
          />
          <p className="text-xs text-slate-400 text-right mt-1">{outrasObservacoesDiagnostico.length}/600</p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button
          variant="outline"
          onClick={salvar}
          className="gap-2 border-slate-300"
          disabled={carregandoApi || salvandoSituacaoViolencia || salvandoCreas || removendoCreas}
        >
          <Save className="w-4 h-4" /> {salvandoSituacaoViolencia ? "Salvando..." : "Salvar Registros"}
        </Button>
        <Button
          onClick={async () => {
            const salvou = await salvar();
            if (salvou) onNext();
          }}
          className="gap-2 bg-primary px-8"
          disabled={carregandoApi || salvandoSituacaoViolencia || salvandoCreas || removendoCreas}
        >
          Salvar e avançar <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
