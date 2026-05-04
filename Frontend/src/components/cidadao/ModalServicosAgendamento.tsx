import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/sonner";
import { ClipboardList, Check, ChevronsUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

import type { AgendamentoResponse } from "@/types/api";
import { agendamentoService } from "@/services/sistema/agendamentoService";
import { servicoAdminService } from "@/services/sistema/servicoAdminService";
import { tipoServicoService } from "@/services/sistema/tipoServicoService";

type ServicoOption = { value: string; label: string };

type ModalServicosAgendamentoProps = {
  open: boolean;
  agendamentoId?: string | null;
  onOpenChange: (open: boolean) => void;
};

const normalizeAgendamento = (raw: any): AgendamentoResponse | null => {
  if (!raw) return null;
  if (raw?.data || raw?.result) return (raw.data ?? raw.result) as AgendamentoResponse;
  return raw as AgendamentoResponse;
};

const normalizeTipoNome = (value: string) => value.trim().toUpperCase();

const resolveAtendenteTipoRaw = (agendamento?: AgendamentoResponse | null) => {
  if (!agendamento) return [] as Array<string | { id?: string | number; nome?: string }>;
  const atendente = agendamento.atendente as any;
  const tipos = atendente?.tipo_ofertados;
  if (!Array.isArray(tipos) || tipos.length === 0) return [] as string[];
  return tipos as Array<string | { id?: string | number; nome?: string }>;
};

const resolveTipoBaseFromServicoAgendamento = (agendamento?: AgendamentoResponse | null) => {
  if (!agendamento?.servico) return "";
  const servico = agendamento.servico as any;
  const tipoServico = servico?.tipo_servico;

  if (typeof tipoServico === "string" || typeof tipoServico === "number") {
    const nome = normalizeTipoNome(String(tipoServico));
    if (nome === "COMUM") return "COMUM";
    if (nome === "ESPECIALIZADO" || nome === "ESPECIALIZADO ADICIONAL") return "ESPECIALIZADO";
    return "";
  }

  if (tipoServico && typeof tipoServico === "object") {
    const nome = normalizeTipoNome(String((tipoServico as { nome?: unknown }).nome || ""));
    if (nome === "COMUM") return "COMUM";
    if (nome === "ESPECIALIZADO" || nome === "ESPECIALIZADO ADICIONAL") return "ESPECIALIZADO";
  }

  return "";
};

export function ModalServicosAgendamento({ open, agendamentoId, onOpenChange }: ModalServicosAgendamentoProps) {
  const [agendamento, setAgendamento] = useState<AgendamentoResponse | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [finalAtendimento, setFinalAtendimento] = useState("");
  const [observacoesGerais, setObservacoesGerais] = useState("");
  const [servicosAdicionais, setServicosAdicionais] = useState<string[]>([]);
  const [opcoesServicos, setOpcoesServicos] = useState<ServicoOption[]>([]);
  const [carregandoServicos, setCarregandoServicos] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const toggleServico = (id: string) => {
    setServicosAdicionais((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const labelsSelecionados = useMemo(() => {
    return opcoesServicos
      .filter((opt) => servicosAdicionais.includes(opt.value))
      .map((opt) => opt.label)
      .join(", ");
  }, [servicosAdicionais, opcoesServicos]);

  const servicoPrincipal = (() => {
    if (!agendamento?.servico) return "-";
    if (typeof agendamento.servico === "string") return agendamento.servico;
    return agendamento.servico.nome || "-";
  })();
  const possuiDadosSalvos =
    !!agendamento?.final_atendimento ||
    !!agendamento?.observacoes_gerais ||
    (Array.isArray(agendamento?.servicos_adicionais) && agendamento.servicos_adicionais.length > 0);
  const isSomenteLeitura = agendamento?.situacao === "FINALIZADO" && possuiDadosSalvos;

  const finalAtendimentoOptions = [
    { value: "REALIZADO", label: "Realizado" },
    { value: "NAO_REALIZADO_REQUISITO", label: "Não Realizado - Pré-requisito" },
    { value: "NAO_REALIZADO_RECUSA", label: "Não Realizado - Recusa do Cidadão" },
    { value: "NAO_REALIZADO_RECURSO", label: "Não Realizado - Indisponibilidade de Recurso" },
    { value: "CANCELADO", label: "Cancelado" },
  ];
  const tipoAtendenteRaw = useMemo(() => resolveAtendenteTipoRaw(agendamento), [agendamento]);

  useEffect(() => {
    if (!open || !agendamentoId) return;

    const carregar = async () => {
      setCarregando(true);
      try {
        const { data } = await agendamentoService.obter(agendamentoId);
        const payload = normalizeAgendamento(data);
        setAgendamento(payload);
        setFinalAtendimento(payload?.final_atendimento ?? "");
        setObservacoesGerais(payload?.observacoes_gerais ?? "");
        setServicosAdicionais((payload?.servicos_adicionais ?? []).filter(Boolean) as string[]);
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível carregar o agendamento.");
      } finally {
        setCarregando(false);
      }
    };

    carregar();
  }, [open, agendamentoId]);

  useEffect(() => {
    if (!open) return;

    const carregarServicos = async () => {
      setCarregandoServicos(true);
      try {
        const tiposServico = await tipoServicoService.listar();
        const tipoNomeById = new Map<string, string>();
        const tipoIdByNome = new Map<string, string>();

        tiposServico.forEach((tipo) => {
          const id = String(tipo.id || "");
          const nomeNormalizado = normalizeTipoNome(String(tipo.nome || ""));
          if (!id || !nomeNormalizado) return;
          tipoNomeById.set(id, nomeNormalizado);
          if (!tipoIdByNome.has(nomeNormalizado)) {
            tipoIdByNome.set(nomeNormalizado, id);
          }
        });

        const tipoBasesAtendente = new Set<string>();
        tipoAtendenteRaw.forEach((tipo) => {
          if (typeof tipo === "string" || typeof tipo === "number") {
            const raw = String(tipo);
            const nomePorId = tipoNomeById.get(raw);
            const nome = normalizeTipoNome(nomePorId || raw);
            if (nome === "COMUM" || nome === "ESPECIALIZADO") {
              tipoBasesAtendente.add(nome);
            }
            return;
          }

          const nomeDireto = normalizeTipoNome(String(tipo?.nome || ""));
          if (nomeDireto === "COMUM" || nomeDireto === "ESPECIALIZADO") {
            tipoBasesAtendente.add(nomeDireto);
            return;
          }

          const id = String(tipo?.id || "");
          const nomePorId = normalizeTipoNome(tipoNomeById.get(id) || "");
          if (nomePorId === "COMUM" || nomePorId === "ESPECIALIZADO") {
            tipoBasesAtendente.add(nomePorId);
          }
        });

        if (!tipoBasesAtendente.size) {
          const tipoBaseServico = resolveTipoBaseFromServicoAgendamento(agendamento);
          if (tipoBaseServico) {
            tipoBasesAtendente.add(tipoBaseServico);
          }
        }

        const nomesAlvo = new Set<string>();
        if (tipoBasesAtendente.has("COMUM")) nomesAlvo.add("COMUM");
        if (tipoBasesAtendente.has("ESPECIALIZADO")) nomesAlvo.add("ESPECIALIZADO ADICIONAL");

        const tipoServicoIdsAlvo = Array.from(nomesAlvo)
          .map((nome) => tipoIdByNome.get(nome) || "")
          .filter(Boolean);

        if (!tipoServicoIdsAlvo.length) {
          setOpcoesServicos([]);
          return;
        }

        const listas = await Promise.all(tipoServicoIdsAlvo.map((tipoId) => servicoAdminService.listar({ tipo_servico_id: tipoId })));
        const combinada = listas.flat();

        const opcoesMap = new Map<string, ServicoOption>();
        combinada.forEach((servico) => {
          if (servico.is_active === false) return;
          const id = String(servico.id);
          if (!id || opcoesMap.has(id)) return;
          opcoesMap.set(id, { value: id, label: servico.nome });
        });

        setOpcoesServicos(Array.from(opcoesMap.values()));
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível carregar os serviços do atendente.");
      } finally {
        setCarregandoServicos(false);
      }
    };

    carregarServicos();
  }, [open, tipoAtendenteRaw, agendamento]);

  useEffect(() => {
    if (open) return;
    setAgendamento(null);
    setFinalAtendimento("");
    setObservacoesGerais("");
    setServicosAdicionais([]);
    setOpcoesServicos([]);
    setCarregando(false);
    setCarregandoServicos(false);
  }, [open]);

  const salvar = async () => {
    if (!agendamento) return;

    setSalvando(true);
    try {
      await agendamentoService.atualizar(agendamento.id, {
        final_atendimento: finalAtendimento.trim() ? finalAtendimento.trim() : null,
        observacoes_gerais: observacoesGerais.trim() ? observacoesGerais.trim() : null,
        servicos_adicionais: servicosAdicionais.length ? servicosAdicionais : [],
      });
      toast.success("Serviços atualizados com sucesso.");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível salvar as informações do atendimento.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-none p-0 bg-white rounded-2xl shadow-lg h-[95vh] md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-[#f05a28] h-1.5 w-full flex-shrink-0" />

        <DialogHeader className="p-6 md:p-8 pb-4 border-b border-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3 text-left">
            <div className="bg-orange-100 p-3 rounded-2xl text-[#f05a28]">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl md:text-2xl font-bold text-slate-800">Serviços do Atendimento</DialogTitle>
              <DialogDescription className="text-sm text-slate-500">Atualize informações e serviços adicionais</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar min-h-0">
          {carregando ? (
            <p className="text-sm text-slate-500">Carregando agendamento...</p>
          ) : (
            <>
              <div className="space-y-2">
                {isSomenteLeitura && <p className="text-xs text-red-700 font-medium">As informações foram salvas e não podem ser modificadas.</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-600 ml-1">Serviço do Agendamento</Label>
                <Input value={servicoPrincipal} disabled className="rounded-xl border-slate-200 bg-slate-50" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-600 ml-1">Status do Atendimento</Label>
                <Select value={finalAtendimento} onValueChange={(value) => setFinalAtendimento(value)} disabled={isSomenteLeitura}>
                  <SelectTrigger className="rounded-xl border-slate-200 bg-white h-11">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {finalAtendimentoOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-600 ml-1">Observações Gerais</Label>
                <Textarea
                  value={observacoesGerais}
                  onChange={(e) => setObservacoesGerais(e.target.value)}
                  placeholder="Detalhes adicionais do atendimento"
                  className="rounded-xl border-slate-200 bg-white min-h-[120px]"
                  disabled={isSomenteLeitura}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-600 ml-1">Serviços Adicionais</Label>

                <Popover
                  open={isSomenteLeitura ? false : popoverOpen}
                  onOpenChange={(open) => {
                    if (!isSomenteLeitura) setPopoverOpen(open);
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={isSomenteLeitura}
                      className={cn(
                        "w-full h-12 justify-between rounded-2xl border-slate-200 bg-slate-50/50 font-semibold  transition-all",
                        !servicosAdicionais.length && " font-normal",
                      )}
                    >
                      <span className="truncate">{labelsSelecionados || "Selecione os serviços extras..."}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30 text-[#f05a28]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl shadow-2xl border-slate-100 max-h-[60vh] overflow-hidden"
                    align="start"
                  >
                    <Command className="rounded-2xl">
                      <div className="flex items-center border-b px-3 border-slate-100">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-slate-400" />
                        <CommandInput placeholder="Buscar serviço..." className="h-11 border-none focus:ring-0" />
                      </div>
                      <CommandList className="max-h-[min(320px,45vh)] custom-scrollbar">
                        <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
                        <CommandGroup className="p-2">
                          {opcoesServicos.map((servico) => {
                            const isSelected = servicosAdicionais.includes(servico.value);
                            return (
                              <CommandItem
                                value={servico.label}
                                key={servico.value}
                                onSelect={() => {
                                  if (!isSomenteLeitura) toggleServico(servico.value);
                                }}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-3 rounded-xl cursor-pointer transition-colors mb-1",
                                  isSelected ? "bg-teal-500 text-white hover:bg-teal-600" : "hover:bg-slate-50 text-slate-600",
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex items-center justify-center w-4 h-4 rounded border transition-colors",
                                    isSelected ? "border-white/20" : "border-slate-300",
                                  )}
                                >
                                  {isSelected && <Check className="h-3 w-3 text-white stroke-[4px]" />}
                                </div>
                                <span className="font-bold text-xs uppercase tracking-tight">{servico.label}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="p-6 md:p-8 pt-4 border-t border-slate-100 bg-white flex-shrink-0 flex flex-col sm:flex-row gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-none text-slate-500 font-bold hover:bg-slate-100 rounded-xl h-11"
          >
            Cancelar
          </Button>
          <Button
            onClick={salvar}
            disabled={salvando || carregando || isSomenteLeitura}
            className="flex-1 sm:flex-none bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold rounded-xl h-11 shadow-md shadow-orange-100"
          >
            {salvando ? "Salvando..." : "Salvar Serviços"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
