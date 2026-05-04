import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Check, ChevronsUpDown, Clock, User, MapPin, AlertCircle, Search } from "lucide-react";
import type { Cidadao } from "@/types/api";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

type SelectOption = { value: string; label: string };
type HorarioOption = { value: string; label: string; complemento?: string };

type Props = {
  open: boolean;
  cidadao: Cidadao | null;
  title?: string;
  confirmLabel?: string;
  allowCidadaoSearch?: boolean;
  cidadaoBusca?: string;
  cidadaoOpcoes?: SelectOption[];
  loadingCidadaos?: boolean;
  unidades: SelectOption[];
  categorias: SelectOption[];
  servicos: SelectOption[];
  horarios: HorarioOption[];
  datasDisponiveis?: string[];
  unidade: string;
  categoria: string;
  servico: string;
  data: string;
  horario: string;
  exibirMotivoOutraUnidade?: boolean;
  agendarOutraUnidade?: boolean;
  motivoOutraUnidade?: string;
  loadingCategorias?: boolean;
  loadingServicos?: boolean;
  loadingHorarios?: boolean;
  carregandoDatas?: boolean;
  confirmando?: boolean;
  onClose: () => void;
  onChangeUnidade: (value: string) => void;
  onChangeCategoria: (value: string) => void;
  onChangeServico: (value: string) => void;
  onChangeData: (value: string) => void;
  onChangeHorario: (value: string) => void;
  onToggleOutraUnidade?: (checked: boolean) => void;
  onChangeMotivoOutraUnidade?: (value: string) => void;
  onChangeCidadaoBusca?: (value: string) => void;
  onSelecionarCidadao?: (id: string) => void;
  onConfirm: () => void;
};

const MOTIVO_MAX = 500;

export function CidadaoAgendamentoModal({
  open,
  cidadao,
  allowCidadaoSearch = false,
  title = "Dados do Agendamento",
  confirmLabel = "Confirmar Agendamento",
  cidadaoBusca = "",
  cidadaoOpcoes = [],
  loadingCidadaos = false,
  unidades,
  categorias,
  servicos,
  horarios,
  datasDisponiveis = [],
  unidade,
  categoria,
  servico,
  data,
  horario,
  exibirMotivoOutraUnidade = false,
  agendarOutraUnidade = false,
  motivoOutraUnidade = "",
  loadingCategorias = false,
  loadingServicos = false,
  loadingHorarios = false,
  carregandoDatas = false,
  confirmando = false,
  onClose,
  onChangeUnidade,
  onChangeCategoria,
  onChangeServico,
  onChangeData,
  onChangeHorario,
  onToggleOutraUnidade,
  onChangeMotivoOutraUnidade,
  onChangeCidadaoBusca,
  onSelecionarCidadao,
  onConfirm,
}: Props) {
  const [unidadeOpen, setUnidadeOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);

  const unidadeOrigem = (() => {
    if (!cidadao) return "";
    const rawUnidade = (cidadao as any).unidade ?? (cidadao as any).unidade_referencia ?? (cidadao as any).unidade_origem;
    if (!rawUnidade) return "";
    if (typeof rawUnidade === "string") {
      const match = unidades.find((u) => u.value === rawUnidade);
      return match?.label ?? rawUnidade;
    }
    return rawUnidade.nome || rawUnidade.id || "";
  })();

  useEffect(() => {
    if (!open) return;
    if (!horario) return;

    const busca = horarios.find((x) => x.value === horario || x.label === horario);
    if (!busca) return;

    if (busca.value !== horario) onChangeHorario(busca.value);
  }, [open, horarios, horario, onChangeHorario]);

  const datasDisponiveisParsed = datasDisponiveis
    .map((item) => {
      const parsed = new Date(`${item}T00:00:00`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    })
    .filter((item): item is Date => !!item);

  const dataSelecionada = data ? new Date(`${data}T00:00:00`) : undefined;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl border-none p-0 bg-white rounded-2xl shadow-lg h-[95vh] md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Barra de destaque superior laranja */}
        <div className="bg-[#f05a28] h-1.5 w-full flex-shrink-0" />

        {/* Header Fixo */}
        <DialogHeader className="p-6 md:p-8 pb-4 border-b border-slate-50 flex-shrink-0">
          <div className="flex items-center gap-4 text-left">
            <div className="hidden sm:block bg-orange-100 p-3 rounded-2xl text-[#f05a28]">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl md:text-2xl font-bold text-slate-800">{title}</DialogTitle>
              {cidadao ? (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs md:text-sm font-medium text-slate-500">
                    Cidadão: <span className="text-slate-900 font-bold">{cidadao.nome}</span>
                    <span className="mx-2 text-slate-300 hidden sm:inline">|</span>
                    <span className="block sm:inline">CPF: {cidadao.cpf}</span>
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#f05a28] font-black uppercase tracking-wider bg-orange-50 w-fit px-2.5 py-1 rounded-lg">
                    <MapPin className="h-3 w-3" />
                    Unidade de Origem: {unidadeOrigem || "Não informada"}
                  </div>
                </div>
              ) : (
                <DialogDescription className="text-slate-500 text-xs md:text-sm">
                  Selecione um cidadão para prosseguir com o agendamento.
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Área de Conteúdo com Scroll Independente */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar bg-white">
          {/* SEÇÃO: BUSCA DE CIDADÃO */}
          {allowCidadaoSearch && (
            <section className="bg-[#F8FAFC] p-4 md:p-6 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-4 w-4 text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Buscar Cidadão</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-600 ml-1">Busca por CPF</Label>
                  <Input
                    value={cidadaoBusca}
                    onChange={(e) => onChangeCidadaoBusca?.(e.target.value.replace(/\D/g, ""))}
                    placeholder="Ex: 000.000..."
                    className="rounded-xl border-slate-200 focus-visible:ring-[#f05a28] h-11 bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-600 ml-1">Resultado da Busca</Label>
                  <Select value={cidadao?.id ?? ""} onValueChange={onSelecionarCidadao} disabled={loadingCidadaos || !cidadaoOpcoes.length}>
                    <SelectTrigger className="rounded-xl border-slate-200 h-11 bg-white focus:ring-[#f05a28]">
                      <SelectValue placeholder={loadingCidadaos ? "Buscando..." : "Selecione o cidadão"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {cidadaoOpcoes.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>
          )}

          {/* SEÇÃO: CONFIGURAÇÃO DO AGENDAMENTO */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-50 bg-[#F8FAFC]/50 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#f05a28] rounded-full" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Detalhes da Consulta</h3>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-600 ml-1">Unidade de Atendimento</Label>
                  <Popover open={unidadeOpen} onOpenChange={setUnidadeOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={unidadeOpen}
                        className="h-11 w-full justify-between rounded-xl border-slate-200 bg-white"
                      >
                        <span className="truncate text-left">
                          {unidade ? unidades.find((u) => u.value === unidade)?.label || unidade : "Selecione a unidade"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Digite o nome da unidade..." className="h-11" />
                        <CommandList>
                          <CommandEmpty>Nenhuma unidade encontrada.</CommandEmpty>
                          <CommandGroup>
                            {unidades.map((u) => (
                              <CommandItem
                                key={u.value}
                                value={u.label}
                                onSelect={() => {
                                  onChangeUnidade(u.value);
                                  setUnidadeOpen(false);
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${unidade === u.value ? "opacity-100" : "opacity-0"}`} />
                                {u.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-600 ml-1">
                    Categoria <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={categoria}
                    onValueChange={(v) => {
                      onChangeCategoria(v);
                      onChangeServico("");
                    }}
                    disabled={!unidade}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder={loadingCategorias ? "Carregando..." : "Selecione"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {categorias.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-slate-600 ml-1">
                    Serviço <span className="text-destructive">*</span>
                  </Label>
                  <Select value={servico} onValueChange={onChangeServico} disabled={!categoria || loadingServicos}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder={loadingServicos ? "Carregando..." : "Selecione o serviço"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {servicos.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-600 ml-1">
                    Data da Consulta <span className="text-destructive">*</span>
                  </Label>
                  <Popover open={dataOpen} onOpenChange={setDataOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full justify-between rounded-xl border-slate-200 bg-white font-normal"
                      >
                        <span className="truncate text-left">
                          {dataSelecionada ? format(dataSelecionada, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                        </span>
                        <Calendar className="h-4 w-4 opacity-60" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <DateCalendar
                        mode="single"
                        selected={dataSelecionada}
                        locale={ptBR}
                        onSelect={(selected) => {
                          if (!selected) {
                            onChangeData("");
                            return;
                          }
                          onChangeData(format(selected, "yyyy-MM-dd"));
                          setDataOpen(false);
                        }}
                        disabled={(date) => {
                          if (date < startOfDay(new Date())) return true;
                          if (!datasDisponiveisParsed.length) return false;
                          return !datasDisponiveisParsed.some((item) => isSameDay(item, date));
                        }}
                      />
                      {carregandoDatas && <p className="px-3 pb-2 text-xs text-slate-500">Carregando dias disponíveis...</p>}
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-600 ml-1">
                    Horário Disponível <span className="text-destructive">*</span>
                  </Label>
                  <Select value={horario} onValueChange={onChangeHorario} disabled={!servico || loadingHorarios || !horarios.length}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder={loadingHorarios ? "Buscando..." : "Selecione o horário"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {horarios.map((h) => (
                        <SelectItem key={h.value} value={h.value} disabled={h.complemento === "0 vagas"}>
                          <div className="flex justify-between w-full gap-4">
                            <span className="flex items-center gap-2">
                              <Clock className="h-3 w-3" /> {h.label}
                            </span>
                            {h.complemento && <span className="text-[10px] font-bold text-[#f05a28] uppercase">{h.complemento}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* OUTRA UNIDADE - ALERTA VISUAL */}
              {exibirMotivoOutraUnidade && (
                <div
                  className={cn(
                    "p-4 rounded-xl border transition-all",
                    agendarOutraUnidade ? "bg-orange-50/50 border-orange-100" : "bg-slate-50 border-slate-100",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="agendar-outra-unidade"
                      checked={agendarOutraUnidade}
                      onCheckedChange={(checked) => onToggleOutraUnidade?.(checked === true)}
                      className="w-5 h-5 rounded-full border-slate-300 data-[state=checked]:bg-[#f05a28] data-[state=checked]:border-[#f05a28]"
                    />
                    <Label htmlFor="agendar-outra-unidade" className="text-sm font-semibold text-slate-700 cursor-pointer">
                      Agendar em unidade fora da origem
                    </Label>
                  </div>
                  {agendarOutraUnidade && (
                    <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-1">
                      <Label className="text-[10px] font-black uppercase text-[#f05a28] ml-1">Motivo da Exceção *</Label>
                      <Input
                        value={motivoOutraUnidade}
                        onChange={(e) => {
                          const next = e.target.value.slice(0, MOTIVO_MAX);
                          onChangeMotivoOutraUnidade?.(next);
                        }}
                        placeholder="Justifique o agendamento em outra unidade"
                        className="rounded-xl bg-white border-orange-200 focus:ring-[#f05a28]"
                        maxLength={MOTIVO_MAX}
                      />
                      <div className="flex justify-end">
                        <span className="text-[10px] font-bold text-slate-400">
                          {motivoOutraUnidade?.length ?? 0}/{MOTIVO_MAX}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Rodapé Fixo */}
        <DialogFooter className="p-6 md:p-8 bg-white border-t border-slate-50 flex flex-row gap-3 flex-shrink-0">
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            className="flex-1 sm:flex-none text-slate-500 font-bold hover:bg-slate-100 rounded-xl px-6 h-12"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!cidadao || !servico || !horario || confirmando}
            className="flex-1 sm:flex-none bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold px-10 rounded-xl h-12 transition-all shadow-md shadow-orange-100 flex items-center justify-center gap-2"
          >
            {confirmando ? (
              "Processando..."
            ) : (
              <>
                <Calendar className="h-4 w-4" />
                {confirmLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
