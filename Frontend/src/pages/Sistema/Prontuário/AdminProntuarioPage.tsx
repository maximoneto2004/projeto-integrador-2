import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Check, History, FileText, BookOpen } from "lucide-react";
import { toast } from "@/lib/sonner";
import { getApiErrorMessage } from "@/lib/notifications";
import type { Prontuario } from "@/types/prontuario";
import { appointmentStore } from "@/lib/appointmentStore";
import { cn } from "@/lib/utils";
import { cidadaoService } from "@/services/sistema/cidadaoService";
import { pessoaReferenciaService } from "@/services/prontuario/pessoaReferenciaService";
import { membroComposicaoService } from "@/services/prontuario/membroComposicaoService";
import { Identificacao } from "@/components/prontuario/Identificacao";
import { ComposicaoFamiliar } from "@/components/prontuario/ComposicaoFamiliar";
import { CondicoesHabitacionais } from "@/components/prontuario/CondicoesHabitacionais";
import { CondicoesEducacionais } from "@/components/prontuario/CondicoesEducacionais";
import { CondicoesTrabalho } from "@/components/prontuario/CondicoesTrabalho";
import { CondicoesSaude } from "@/components/prontuario/CondicoesSaude";
import { BeneficiosEventuais } from "@/components/prontuario/BeneficiosEventuais";
import { ParticipacaoServicos } from "@/components/prontuario/ParticipacaoServicos";
import { SituacaoViolencia } from "@/components/prontuario/SituacaoViolencia";
import { AcolhimentoInstitucional } from "@/components/prontuario/AcolhimentoInstitucional";
import { EvolucaoFamiliar } from "@/components/prontuario/EvolucaoFamiliar";
import { RegistrarServicos } from "@/components/prontuario/RegistrarServicos";
import { MedidasSocioeducativas } from "@/components/prontuario/MedidasSocioeducativas";
import { AvaliacaoAcompanhamentoFamiliar } from "@/components/prontuario/AvaliacaoAcompanhamentoFamiliar";
import { prontuarioService } from "@/services/prontuario/prontuarioService";

interface StepProps {
  prontuario: Prontuario | null;
  onNext: () => void;
  onSave: () => void;
  appointmentId?: string;
  onDataChanged?: () => void;
}

interface StepConfig {
  id: number;
  title: string;
  component: React.ComponentType<StepProps>;
}

const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, "");

const asRecord = (value: unknown): Record<string, unknown> | null => (value && typeof value === "object" ? (value as Record<string, unknown>) : null);

const asString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const unwrapResult = (data: unknown): unknown => {
  const envelope = asRecord(data);
  if (!envelope) return data;
  if ("result" in envelope) return envelope.result;
  if ("data" in envelope) return envelope.data;
  return data;
};

const parseApiList = (data: unknown): Record<string, unknown>[] => {
  const unwrapped = unwrapResult(data);
  if (Array.isArray(unwrapped)) {
    return unwrapped.map((item) => asRecord(item)).filter(Boolean) as Record<string, unknown>[];
  }
  const maybeObject = asRecord(unwrapped);
  if (maybeObject && Array.isArray(maybeObject.results)) {
    return maybeObject.results.map((item) => asRecord(item)).filter(Boolean) as Record<string, unknown>[];
  }
  if (maybeObject) return [maybeObject];
  return [];
};

const mapSexo = (sexo?: string | null) => {
  const value = (sexo ?? "").toString().toUpperCase();
  if (value === "MASCULINO") return "Masculino";
  if (value === "FEMININO") return "Feminino";
  if (value === "OUTRO") return "Outro";
  return sexo ?? "";
};

const parentescoLabel = (value?: string) => {
  const v = (value || "").toUpperCase();
  if (v === "REFERENCIA") return "Pessoa de Referência";
  if (v === "CONJUGE") return "Cônjuge/Companheiro(a)";
  if (v === "FILHO") return "Filho(a)";
  if (v === "ENTEADO") return "Enteado(a)";
  if (v === "BISNETO") return "Bisneto(a)";
  if (v === "SOGRO") return "Sogro(a)";
  if (v === "GENRO") return "Genro";
  if (v === "NORA") return "Nora";
  if (v === "NAO_PARENTE") return "Não Parente";
  if (v === "AVO") return "AVÓ/AVÔ";
  if (v === "PAI") return "Pai";
  if (v === "MAE") return "Mãe";
  if (v === "NETO") return "Neto(a)";
  if (v === "IRMAO_IRMA") return "Irmão/Irmã";
  if (v === "OUTRO") return "Outro";
  return value || "Outro";
};

const mapCidadaoToMembro = (
  cidadao: Record<string, unknown>,
  fallback: { id: string; cpf: string; nome: string; parentesco?: string },
  ordem: number,
) => {
  const bairro =
    cidadao?.bairro && typeof cidadao.bairro === "object"
      ? asString((cidadao.bairro as Record<string, unknown>).nome) || asString((cidadao.bairro as Record<string, unknown>).id)
      : asString(cidadao?.bairro);

  return {
    id: asString(cidadao?.id) || fallback.id,
    cpf: normalizeCpf(asString(cidadao?.cpf) || fallback.cpf),
    nome: asString(cidadao?.nome) || fallback.nome || "Cidadão não identificado",
    apelido: asString(cidadao?.apelido) || "",
    email: asString(cidadao?.email) || undefined,
    telefone: asString(cidadao?.telefone) || undefined,
    sexo: mapSexo(asString(cidadao?.sexo)),
    dataNascimento: asString(cidadao?.data_nascimento) || asString(cidadao?.dataNascimento) || undefined,
    nomeMae: asString(cidadao?.nome_mae) || asString(cidadao?.mae) || undefined,
    nis: asString(cidadao?.nis) || undefined,
    rg: asString(cidadao?.rg) || undefined,
    rgOrgao: asString(cidadao?.orgao_emissor) || undefined,
    rgUf: asString(cidadao?.rg_uf) || undefined,
    rgDataEmissao: asString(cidadao?.data_emissao_rg) || undefined,
    enderecoRua: asString(cidadao?.logradouro) || undefined,
    enderecoNumero: asString(cidadao?.numero) || undefined,
    enderecoComplemento: asString(cidadao?.complemento) || undefined,
    enderecoBairro: bairro || undefined,
    enderecoMunicipio: asString(cidadao?.cidade) || undefined,
    enderecoUf: asString(cidadao?.estado) || undefined,
    enderecoCep: asString(cidadao?.cep) || undefined,
    enderecoPontoReferencia: undefined,
    enderecoLocalizacao: undefined,
    enderecoAbrigo: undefined,
    parentesco: parentescoLabel(fallback.parentesco),
    ordem,
  };
};

const steps: StepConfig[] = [
  { id: 1, title: "Pessoa de referência", component: Identificacao },
  { id: 2, title: "Composição familiar", component: ComposicaoFamiliar },
  { id: 3, title: "Condições habitacionais", component: CondicoesHabitacionais },
  { id: 4, title: "Condições educacionais", component: CondicoesEducacionais },
  { id: 5, title: "Trabalho e rendimento", component: CondicoesTrabalho },
  { id: 6, title: "Condições de saúde", component: CondicoesSaude },
  { id: 7, title: "Benefícios e serviços", component: BeneficiosEventuais },
  { id: 8, title: "Convivência familiar e comunitária", component: ParticipacaoServicos },
  { id: 9, title: "Situação de violência", component: SituacaoViolencia },
  { id: 10, title: "Acolhimento institucional", component: AcolhimentoInstitucional },
  { id: 11, title: "Medidas socioeducativas", component:MedidasSocioeducativas },
  { id: 12, title: "Evolução do acompanhamento", component: EvolucaoFamiliar },

  { id: 13, title: "Avaliação do Acompanhamento Familiar", component: AvaliacaoAcompanhamentoFamiliar },

  // { id: 13, title: "Registrar servicos do atendimento", component: RegistrarServicos },
];

const STEP_STORAGE_PREFIX = "prontuarioStep:";
const COMPLETED_STEPS_STORAGE_PREFIX = "prontuarioCompletedSteps:";

const isValidStep = (value: number) => Number.isInteger(value) && value >= 1 && value <= steps.length;

const readStoredStep = (prontuarioId: string): number | null => {
  if (!prontuarioId) return null;
  const raw = localStorage.getItem(`${STEP_STORAGE_PREFIX}${prontuarioId}`);
  const parsed = Number(raw);
  return isValidStep(parsed) ? parsed : null;
};

const writeStoredStep = (prontuarioId: string, step: number) => {
  if (!prontuarioId || !isValidStep(step)) return;
  localStorage.setItem(`${STEP_STORAGE_PREFIX}${prontuarioId}`, String(step));
};

const readStoredCompletedSteps = (prontuarioId: string): number[] => {
  if (!prontuarioId) return [];
  const raw = localStorage.getItem(`${COMPLETED_STEPS_STORAGE_PREFIX}${prontuarioId}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((item) => Number(item)).filter((item) => isValidStep(item)))].sort((a, b) => a - b);
  } catch {
    return [];
  }
};

const writeStoredCompletedSteps = (prontuarioId: string, stepIds: number[]) => {
  if (!prontuarioId) return;
  const normalized = [...new Set(stepIds.filter((step) => isValidStep(step)))].sort((a, b) => a - b);
  localStorage.setItem(`${COMPLETED_STEPS_STORAGE_PREFIX}${prontuarioId}`, JSON.stringify(normalized));
};

export default function AdminProntuarioPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const cpfParam = searchParams.get("cpf") || "";
  const prontuarioIdParam = searchParams.get("prontuarioId") || "";
  const idParam = searchParams.get("id") || "";
  const stepParam = searchParams.get("step") || "";

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [prontuario, setProntuario] = useState<Prontuario | null>(null);
  const [cpfAtual, setCpfAtual] = useState<string>("");
  const [prontuarioIdAtual, setProntuarioIdAtual] = useState<string>("");
  const [carregando, setCarregando] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let active = true;

    const carregar = async () => {
      try {
        setCarregando(true);

        const normalizedFromQuery = normalizeCpf(cpfParam);
        const appointmentFromId = idParam ? appointmentStore.getAppointmentById(idParam) : undefined;
        const cpfFromAppointment = appointmentFromId?.cpfCidadao ? normalizeCpf(appointmentFromId.cpfCidadao) : "";
        const targetCpf = normalizedFromQuery || cpfFromAppointment;

        let prontuarioId = prontuarioIdParam || (targetCpf ? localStorage.getItem(`prontuarioIdByCpf:${targetCpf}`) || "" : "");

        if (!prontuarioId && targetCpf) {
          const busca = await prontuarioService.listar({ search: targetCpf, limit: 1, offset: 0 });
          const primeiro = parseApiList(busca.data)[0];
          prontuarioId = asString(primeiro?.id) || asString(primeiro?.prontuario_id);
        }

        if (!prontuarioId) {
          toast.error("Não foi possível identificar o prontuário para carregar os dados da API.");
          return;
        }

        const requestedStep = Number(stepParam);
        const storedStep = readStoredStep(prontuarioId);
        const resolvedStep = isValidStep(requestedStep) ? requestedStep : storedStep || 1;

        if (!prontuarioIdParam || !stepParam) {
          const nextSearch = new URLSearchParams();
          nextSearch.set("prontuarioId", prontuarioId);
          nextSearch.set("step", String(resolvedStep));
          if (targetCpf) {
            nextSearch.set("cpf", targetCpf);
          }
          if (idParam) {
            nextSearch.set("id", idParam);
          }
          setSearchParams(nextSearch, { replace: true });
        }

        const [prontuarioRes, pessoaRefRes, membrosRes] = await Promise.all([
          prontuarioService.obter(prontuarioId),
          pessoaReferenciaService.listar({ prontuario: prontuarioId }),
          membroComposicaoService.listar({ prontuario: prontuarioId }),
        ]);

        const prontuarioRaw = parseApiList(prontuarioRes.data)[0];
        if (!prontuarioRaw) {
          toast.error("Prontuário não encontrado na API.");
          return;
        }

        const pessoaRefItem = parseApiList(pessoaRefRes.data)[0] || null;
        const pessoaRefCidadaoRaw = asRecord(pessoaRefItem?.pessoa_referencia);
        const pessoaRefCidadaoId =
          asString(pessoaRefCidadaoRaw?.id) || asString(pessoaRefItem?.pessoa_referencia) || asString(prontuarioRaw?.pessoa_referencia);

        const membrosApi = parseApiList(membrosRes.data);
        const membros = await Promise.all(
          membrosApi.map(async (membroApi, index) => {
            const cidadaoRaw = asRecord(membroApi?.cidadao);
            const cidadaoId = asString(cidadaoRaw?.id) || asString(membroApi?.cidadao) || asString(membroApi?.id);
            let cidadaoDetalhe = cidadaoRaw || {};

            if (cidadaoId && !cidadaoRaw?.cpf) {
              try {
                const response = await cidadaoService.obter(cidadaoId);
                cidadaoDetalhe = asRecord(response.data) || cidadaoDetalhe;
              } catch {
                // fallback silencioso para nao bloquear carregamento da tela
              }
            }

            return mapCidadaoToMembro(
              cidadaoDetalhe,
              {
                id: cidadaoId || asString(membroApi?.id),
                cpf: asString(cidadaoDetalhe?.cpf),
                nome: asString(cidadaoDetalhe?.nome) || asString(cidadaoRaw?.nome_completo),
                parentesco: asString(membroApi?.parentesco),
              },
              index + 1,
            );
          }),
        );

        const membroRef = membros.find((m) => String(m.id) === String(pessoaRefCidadaoId)) || membros[0] || null;
        const cpfResolvido = normalizeCpf(membroRef?.cpf || targetCpf || "");

        if (cpfResolvido) {
          setCpfAtual(cpfResolvido);
          localStorage.setItem(`prontuarioIdByCpf:${cpfResolvido}`, prontuarioId);
        }
        setProntuarioIdAtual(prontuarioId);
        setCurrentStep(resolvedStep);
        setCompletedSteps(readStoredCompletedSteps(prontuarioId));

        const unidadeInicial = asRecord(prontuarioRaw.unidade_inicial);
        const prontuarioMapeado: Prontuario = {
          numero: asString(prontuarioRaw.numero) || "-",
          acompanhado: Boolean(prontuarioRaw.acompanhado),
          unidade: asString(unidadeInicial?.nome) || asString(unidadeInicial?.unidade) || asString(prontuarioRaw.unidade_inicial) || "Unidade não informada",
          pessoaReferenciaId: membroRef?.id || "",
          dataAbertura: asString(prontuarioRaw.data_criacao) || asString(prontuarioRaw.data_abertura) || new Date().toISOString().split("T")[0],
          versao: "1.0",
          membros,
          condicoesHabitacionais: [],
          condicoesEducacionais: [],
          condicoesTrabalho: [],
          condicoesSaude: [],
          condicoesSaudeObservacoes: "",
          beneficiosEventuais: [],
          participacoesServicos: [],
          situacoesViolencia: [],
          medidasSocioeducativas: [],
          acolhimentos: [],
          evolucoes: [],
          servicosAtendimento: [],
          evolucaoAcompanhamento: undefined,
          encaminhamentos: [],
          descumprimentosCondicionalidades: []
        };

        if (active) setProntuario(prontuarioMapeado);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Não foi possível carregar o prontuário pela API."));
      } finally {
        if (active) setCarregando(false);
      }
    };

    carregar();
    return () => {
      active = false;
    };
  }, [cpfParam, idParam, prontuarioIdParam, setSearchParams, reloadTick, stepParam]);

  useEffect(() => {
    if (!prontuarioIdAtual) return;
    writeStoredStep(prontuarioIdAtual, currentStep);
  }, [prontuarioIdAtual, currentStep]);

  useEffect(() => {
    if (!prontuarioIdAtual) return;
    writeStoredCompletedSteps(prontuarioIdAtual, completedSteps);
  }, [prontuarioIdAtual, completedSteps]);

  const updateStep = (nextStep: number) => {
    if (!isValidStep(nextStep)) return;
    setCurrentStep(nextStep);
    if (prontuarioIdAtual) {
      writeStoredStep(prontuarioIdAtual, nextStep);
    }

    const nextSearch = new URLSearchParams(searchParams);
    nextSearch.set("step", String(nextStep));
    if (prontuarioIdAtual && !nextSearch.get("prontuarioId")) {
      nextSearch.set("prontuarioId", prontuarioIdAtual);
    }
    setSearchParams(nextSearch, { replace: true });
  };

  const handleStepClick = (stepId: number) => {
    updateStep(stepId);
  };

  const handleDataChanged = () => {
    setReloadTick((v) => v + 1);
  };

  const handleNext = () => {
    setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);

    if (currentStep < steps.length) {
      updateStep(currentStep + 1);
    }
  };

  const handleSave = () => {
    setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);

    toast.success("Etapa salva com sucesso!");
  };

  const handleHistorico = () => {
    if (cpfAtual) {
      const prontuarioId = prontuarioIdAtual || prontuarioIdParam || localStorage.getItem(`prontuarioIdByCpf:${cpfAtual}`) || "";
      const nextSearch = new URLSearchParams();
      nextSearch.set("cpf", cpfAtual);
      if (prontuarioId) {
        nextSearch.set("prontuarioId", prontuarioId);
      }
      nextSearch.set("step", String(currentStep));
      navigate(`/sistema/historico-prontuario?${nextSearch.toString()}`);
    }
  };

  // const handleEncaminhamento = () => {
  //   if (cpfAtual) {
  //     navigate(`/sistema/encaminhamento-prontuario?cpf=${cpfAtual}`);
  //   }
  // };

  const handlePerfilFamiliar = () => {
    if (cpfAtual) {
      navigate(`/sistema/perfil-familiar?cpf=${cpfAtual}`);
    }
  };

  const CurrentStepComponent = steps[currentStep - 1].component;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />

        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-white flex items-center justify-between px-6 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold text-slate-800">Prontuário Familiar - SUAS</h1>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/sistema/agendamentos")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {prontuario && (
                <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-wrap gap-8">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Prontuário</span>
                    <p className="text-sm font-medium">{prontuario.numero}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Pessoa de Referência</span>
                    <p className="text-sm font-medium">{prontuario.membros.find((m) => m.id === prontuario.pessoaReferenciaId)?.nome}</p>
                  </div>
                  {prontuario.acompanhado && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Status</span>
                      <p className="text-sm font-medium">Família acompanhada</p>
                    </div>
                  )}
                  <div className="ml-auto flex gap-2">
                    {/* <Button variant="secondary" size="sm" onClick={handleEncaminhamento}>
                      <FileText className="h-4 w-4 mr-2" /> Encaminhar
                    </Button> */}
                    <Button variant="secondary" size="sm" onClick={handlePerfilFamiliar}>
                      <BookOpen className="h-4 w-4 mr-2" /> Perfil
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleHistorico}>
                      <History className="h-4 w-4 mr-2" /> Histórico
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-6 items-start">
                <aside className="w-full md:w-72 space-y-1 sticky top-20">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-3">Etapas do Prontuário</p>
                  <nav className="space-y-1">
                    {steps.map((step) => {
                      const isCompleted = completedSteps.includes(step.id);
                      const isActive = step.id === currentStep;

                      return (
                        <button
                          key={step.id}
                          onClick={() => handleStepClick(step.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all group",
                            isActive ? "bg-primary/10 text-primary shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                          )}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div
                              className={cn(
                                "w-1 h-4 rounded-full transition-all",
                                isActive ? "bg-primary" : "bg-transparent group-hover:bg-slate-300",
                              )}
                            />

                            <span className={cn("min-w-0 flex-1 text-left leading-snug break-words transition-colors", isActive ? "font-bold" : "font-medium")}>
                              {step.title}
                            </span>
                          </div>

                          {isCompleted && (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </aside>

                <div className="flex-1 w-full">
                  <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-8">
                      <div className="mb-8 border-b pb-4">
                        <h2 className="text-2xl font-bold text-slate-800">{steps[currentStep - 1].title}</h2>
                        <p className="text-slate-500 text-sm mt-1">Preencha as informações abaixo para atualizar o prontuário.</p>
                      </div>

                      {carregando ? (
                        <div className="text-sm text-slate-500">Carregando prontuário...</div>
                      ) : (
                        <CurrentStepComponent
                          prontuario={prontuario}
                          onNext={handleNext}
                          onSave={handleSave}
                          appointmentId={prontuarioIdParam || idParam}
                          onDataChanged={handleDataChanged}
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
