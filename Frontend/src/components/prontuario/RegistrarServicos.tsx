import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Briefcase, Check, CheckCircle, ChevronsUpDown, Info, Save, Flag, Search } from "lucide-react";
import type { Prontuario } from "@/types/prontuario";
import type { AgendamentoResponse, ServicoDetalhado } from "@/types/api";
import { agendamentoService } from "@/services/sistema/agendamentoService";
import { servicoAdminService } from "@/services/sistema/servicoAdminService";
import { appointmentStore } from "@/lib/appointmentStore";
import { getApiErrorMessage } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  prontuario: Prontuario | null;
  onNext: () => void;
  onSave: () => void;
  appointmentId?: string;
}

type StatusFinalAtendimento = "REALIZADO" | "NAO_REALIZADO_REQUISITO" | "NAO_REALIZADO_RECUSA" | "NAO_REALIZADO_RECURSO" | "CANCELADO";

type ServicoOption = {
  id: string;
  nome: string;
  categoria: string;
  tipoServicoNome: string;
  isActive: boolean;
};

const STATUS_OPTIONS: Array<{ value: StatusFinalAtendimento; label: string }> = [
  { value: "REALIZADO", label: "Realizado" },
  { value: "NAO_REALIZADO_REQUISITO", label: "Não Realizado - Pré-requisito" },
  { value: "NAO_REALIZADO_RECUSA", label: "Não Realizado - Recusa do Cidadão" },
  { value: "NAO_REALIZADO_RECURSO", label: "Não Realizado - Indisponibilidade de Recurso" },
  { value: "CANCELADO", label: "Cancelado" },
];
const OBSERVACOES_GERAIS_MAX = 600;

const normalizeAgendamento = (raw: unknown): AgendamentoResponse | null => {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if ("result" in obj) return (obj.result as AgendamentoResponse) || null;
  if ("data" in obj) return (obj.data as AgendamentoResponse) || null;
  return obj as AgendamentoResponse;
};

const getCategoriaServico = (servico?: ServicoDetalhado | null) => {
  if (!servico) return "Sem categoria";
  const classe = servico.classe;
  if (classe && typeof classe === "object") {
    return String(classe.nome || classe.id || "Sem categoria");
  }
  return String(classe || "Sem categoria");
};

const asServicoId = (servico: unknown) => {
  if (servico && typeof servico === "object" && "id" in servico) {
    return String((servico as { id?: unknown }).id || "");
  }
  return String(servico || "");
};

const normalizeTipoServico = (value: string) => value.trim().toUpperCase();

export function RegistrarServicos({ onSave, appointmentId }: Props) {
  const navigate = useNavigate();

  const [carregandoApi, setCarregandoApi] = useState(false);
  const [salvandoApi, setSalvandoApi] = useState(false);
  const [servicosDisponiveis, setServicosDisponiveis] = useState<ServicoOption[]>([]);
  const [servicoPrincipalId, setServicoPrincipalId] = useState("");
  const [servicoPrincipalNome, setServicoPrincipalNome] = useState("");
  const [servicoPrincipalCategoria, setServicoPrincipalCategoria] = useState("");
  const [statusFinalAtendimento, setStatusFinalAtendimento] = useState<StatusFinalAtendimento>("REALIZADO");
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [servicosAdicionaisIds, setServicosAdicionaisIds] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const servicoById = useMemo(
    () =>
      servicosDisponiveis.reduce<Record<string, ServicoOption>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {}),
    [servicosDisponiveis],
  );

  const servicosAdicionaisOpcoes = useMemo(
    () =>
      servicosDisponiveis.filter(
        (item) => item.isActive && item.id !== servicoPrincipalId && normalizeTipoServico(item.tipoServicoNome) === "ESPECIALIZADO ADICIONAL",
      ),
    [servicosDisponiveis, servicoPrincipalId],
  );

  const labelsAdicionaisSelecionados = useMemo(
    () =>
      servicosAdicionaisIds
        .map((id) => servicoById[id]?.nome || "")
        .filter(Boolean)
        .join(", "),
    [servicosAdicionaisIds, servicoById],
  );

  useEffect(() => {
    const load = async () => {
      setCarregandoApi(true);
      try {
        const servicosApi = await servicoAdminService.listar();
        const options = servicosApi.map((item) => ({
          id: String(item.id),
          nome: String(item.nome || ""),
          categoria: getCategoriaServico(item),
          tipoServicoNome: String(item.tipo_servico?.nome || ""),
          isActive: item.is_active !== false,
        }));
        setServicosDisponiveis(options);

        if (!appointmentId) return;

        const agendamentoRes = await agendamentoService.obter(appointmentId);
        const agendamento = normalizeAgendamento(agendamentoRes.data);
        if (!agendamento) return;

        const principalServicoId = asServicoId(agendamento.servico);
        const principalServicoOption = options.find((item) => item.id === principalServicoId);

        setServicoPrincipalId(principalServicoId);
        setServicoPrincipalNome(principalServicoOption?.nome || String((agendamento.servico as any)?.nome || ""));
        setServicoPrincipalCategoria(principalServicoOption?.categoria || getCategoriaServico(agendamento.servico as any));
        setStatusFinalAtendimento((String(agendamento.final_atendimento || "REALIZADO") as StatusFinalAtendimento) || "REALIZADO");
        setObservacoesGerais(String(agendamento.observacoes_gerais || ""));
        setServicosAdicionaisIds(
          (agendamento.servicos_adicionais || []).map((item) => asServicoId(item)).filter((id) => !!id && id !== principalServicoId),
        );
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Não foi possível carregar serviços do atendimento."));
      } finally {
        setCarregandoApi(false);
      }
    };

    load();
  }, [appointmentId]);

  const toggleServicoAdicional = (id: string) => {
    setServicosAdicionaisIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const validar = () => {
    if (!appointmentId) {
      toast.error("Agendamento não identificado para registrar os serviços.");
      return false;
    }
    if (!servicoPrincipalId) {
      toast.error("O serviço principal deve estar preenchido.");
      return false;
    }
    return true;
  };

  const salvar = async (finalizar: boolean) => {
    if (!validar()) return;

    try {
      setSalvandoApi(true);
      await agendamentoService.atualizar(String(appointmentId), {
        final_atendimento: statusFinalAtendimento,
        observacoes_gerais: observacoesGerais.trim() || null,
        servicos_adicionais: servicosAdicionaisIds,
        ...(finalizar ? { situacao: "FINALIZADO" } : {}),
      });

      if (finalizar && appointmentId) {
        appointmentStore.updateAppointment(appointmentId, { status: "Finalizado" });
      }

      toast.success(finalizar ? "Atendimento finalizado com sucesso." : "Serviços salvos com sucesso.");
      onSave();
      if (finalizar) navigate("/sistema/agendamentos");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Não foi possível salvar os serviços do atendimento."));
    } finally {
      setSalvandoApi(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-lg text-slate-800">Serviços e Ofertas Realizadas</h3>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="border-l-4 shadow-sm border-l-blue-500">
          <CardHeader className="py-3 px-6 bg-slate-50/50 border-b">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700">Obrigatório</span>
                <CardTitle className="text-sm font-bold text-slate-700">SERVIÇO PRINCIPAL</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">Serviço do Agendamento *</Label>
                <Input value={servicoPrincipalNome} disabled className="bg-white" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">Categoria do Serviço</Label>
                <Input value={servicoPrincipalCategoria} disabled className="bg-white" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Flag className="w-3 h-3" /> Status da Oferta
                </Label>
                <Select
                  value={statusFinalAtendimento}
                  onValueChange={(val) => setStatusFinalAtendimento(val as StatusFinalAtendimento)}
                  disabled={carregandoApi || salvandoApi}
                >
                  <SelectTrigger className="bg-white font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Info className="w-3 h-3" /> Observações e Detalhes
                </Label>
                <Textarea
                  value={observacoesGerais}
                  maxLength={OBSERVACOES_GERAIS_MAX}
                  onChange={(e) => setObservacoesGerais(e.target.value.slice(0, OBSERVACOES_GERAIS_MAX))}
                  placeholder="Anote aqui particularidades sobre este serviço..."
                  rows={2}
                  className="bg-white resize-none"
                  disabled={carregandoApi || salvandoApi}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Serviços Adicionais</Label>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={carregandoApi || salvandoApi}
                      className={cn("w-full h-11 justify-between bg-white", !servicosAdicionaisIds.length && "text-slate-400 font-normal")}
                    >
                      <span className="truncate">{labelsAdicionaisSelecionados || "Selecione os serviços extras..."}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <CommandInput placeholder="Buscar serviço..." className="h-10 border-none focus:ring-0" />
                      </div>
                      <CommandList className="max-h-[250px]">
                        <CommandEmpty>Nenhum serviço especializado adicional encontrado.</CommandEmpty>
                        <CommandGroup>
                          {servicosAdicionaisOpcoes.map((servico) => {
                            const selected = servicosAdicionaisIds.includes(servico.id);
                            return (
                              <CommandItem key={servico.id} value={servico.nome} onSelect={() => toggleServicoAdicional(servico.id)}>
                                <div
                                  className={cn(
                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                                    selected ? "bg-primary border-primary text-primary-foreground" : "opacity-50",
                                  )}
                                >
                                  {selected ? <Check className="h-3 w-3" /> : null}
                                </div>
                                <span>{servico.nome}</span>
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
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3 pt-8 border-t border-slate-200">
        <Button variant="outline" onClick={() => salvar(false)} className="gap-2 border-slate-300" disabled={carregandoApi || salvandoApi}>
          <Save className="w-4 h-4" /> {salvandoApi ? "Salvando..." : "Salvar Rascunho"}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 px-8 shadow-md" disabled={carregandoApi || salvandoApi}>
              <CheckCircle className="w-4 h-4" /> Finalizar Atendimento
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Deseja concluir este atendimento?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação registrará os serviços no agendamento e marcará o atendimento como finalizado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Revisar</AlertDialogCancel>
              <AlertDialogAction onClick={() => salvar(true)} className="bg-emerald-600 hover:bg-emerald-700">
                Sim, finalizar agora
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
