import { ReactNode, type WheelEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Settings2 } from "lucide-react"; // Importando um ícone para o cabeçalho
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ServicoConfig } from "../../types/servicos";

interface ServicoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idPrefix: string;
  titulo: string;
  descricao: string;
  servico: ServicoConfig | null;
  diasSemanaOptions: { value: string; label: string }[];
  servicosDisponiveis: { id: string; nome: string; tipo: string }[];
  onServicoChange: (campo: keyof ServicoConfig, valor: unknown) => void;
  onToggleDia: (dia: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitIcon?: ReactNode;
}

export function ServicoFormModal({
  open,
  onOpenChange,
  idPrefix,
  titulo,
  descricao,
  servico,
  diasSemanaOptions,
  servicosDisponiveis,
  onServicoChange,
  onToggleDia,
  onCancel,
  onSubmit,
  submitLabel,
  submitIcon,
}: ServicoFormModalProps) {
  const [servicoSelectOpen, setServicoSelectOpen] = useState(false);
  const servicoIdSelecionado = servico?.servicoId ?? "";
  const servicoSelecionado = useMemo(
    () => servicosDisponiveis.find((item) => item.id === servicoIdSelecionado),
    [servicosDisponiveis, servicoIdSelecionado],
  );

  const handleWheelOnCommandList = (event: WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    container.scrollTop += event.deltaY;
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setServicoSelectOpen(false);
    onOpenChange(nextOpen);
  };

  if (!servico) return null;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl border-none overflow-hidden p-0 bg-white rounded-2xl shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Barra de destaque superior laranja */}
        <div className="bg-[#f05a28] h-1.5 w-full" />

        <div className="p-5 sm:p-8">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4">
              {/* Ícone com fundo laranja suave conforme referência */}
              <div className="bg-orange-100 p-3 rounded-full">
                <Settings2 className="w-6 h-6 text-[#f05a28]" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-2xl font-bold text-slate-800">
                  {titulo}
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-sm">
                  {descricao}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

            <div className="space-y-8">
            {/* Campo de Seleção de Serviço */}
            <div className="space-y-2 text-left">
              <Label className="text-sm font-semibold text-slate-700 ml-1">
                Serviço <span className="text-destructive">*</span>
              </Label>
              <Popover open={servicoSelectOpen} onOpenChange={setServicoSelectOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={servicoSelectOpen} className="w-full justify-between rounded-xl border-slate-200 h-12 font-normal">
                    <span className="truncate">
                      {servicoSelecionado ? `${servicoSelecionado.nome}${servicoSelecionado.tipo ? ` (${servicoSelecionado.tipo})` : ""}` : "Selecione o serviço"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar o serviço..." />
                    <CommandList onWheel={handleWheelOnCommandList} className="overscroll-contain">
                      <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
                      <CommandGroup>
                        {servicosDisponiveis.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={`${item.nome} ${item.tipo || ""}`.trim()}
                            onSelect={() => {
                              onServicoChange("servicoId", item.id);
                              setServicoSelectOpen(false);
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${servico.servicoId === item.id ? "opacity-100" : "opacity-0"}`} />
                            <span className="truncate">
                              {item.nome}
                              {item.tipo ? ` (${item.tipo})` : ""}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Dias da Semana */}
            <div className="space-y-4 text-left">
              <Label className="text-sm font-semibold text-slate-700 ml-1">
                Dias da Semana <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4">
                {diasSemanaOptions.map((dia) => (
                  <div key={dia.value} className="flex items-center space-x-3">
                    <Checkbox
                      id={`${idPrefix}-${dia.value}`}
                      checked={servico.diasSemana.includes(dia.value)}
                      onCheckedChange={() => onToggleDia(dia.value)}
                      className="w-5 h-5 rounded-full border-slate-300 data-[state=checked]:bg-[#f05a28] data-[state=checked]:border-[#f05a28]"
                    />
                    <Label 
                      htmlFor={`${idPrefix}-${dia.value}`} 
                      className="text-slate-700 font-medium cursor-pointer"
                    >
                      {dia.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

         

            {/* Cards de Switch (Padronizados com a referência de Bairros) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/80 transition-all hover:bg-slate-50">
                <div className="space-y-0.5 text-left">
                  <Label htmlFor={`${idPrefix}-expediente`} className="text-sm font-bold text-slate-700 cursor-pointer">
                    Usar mesmo expediente do CRAS
                  </Label>
                  <p className="text-xs text-slate-500">Sincroniza os horários com o funcionamento da unidade.</p>
                </div>
                <Switch
                  id={`${idPrefix}-expediente`}
                  className="data-[state=checked]:bg-[#f05a28]"
                  checked={servico.usarExpedienteCras}
                  onCheckedChange={(checked) => onServicoChange("usarExpedienteCras", checked)}
                />
              </div>

                 {!servico.usarExpedienteCras && (
              <div className="space-y-4 text-left">
                <div className="space-y-1">
                  <Label className="text-sm font-semibold text-slate-700 ml-1">Horários do serviço</Label>
                  <p className="text-xs text-slate-500 ml-1">Defina os horários quando não usar o expediente do CRAS.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${idPrefix}-turno1-inicio`} className="text-sm font-medium text-slate-700">
                      Turno 1 - Início
                    </Label>
                    <Input
                      id={`${idPrefix}-turno1-inicio`}
                      type="time"
                      value={servico.turno1Inicio}
                      onChange={(e) => onServicoChange("turno1Inicio", e.target.value)}
                      className="h-11 rounded-xl border-slate-200 focus-visible:ring-[#f05a28]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${idPrefix}-turno1-fim`} className="text-sm font-medium text-slate-700">
                      Turno 1 - Fim
                    </Label>
                    <Input
                      id={`${idPrefix}-turno1-fim`}
                      type="time"
                      value={servico.turno1Fim}
                      onChange={(e) => onServicoChange("turno1Fim", e.target.value)}
                      className="h-11 rounded-xl border-slate-200 focus-visible:ring-[#f05a28]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${idPrefix}-turno2-inicio`} className="text-sm font-medium text-slate-700">
                      Turno 2 - Início
                    </Label>
                    <Input
                      id={`${idPrefix}-turno2-inicio`}
                      type="time"
                      value={servico.turno2Inicio}
                      onChange={(e) => onServicoChange("turno2Inicio", e.target.value)}
                      className="h-11 rounded-xl border-slate-200 focus-visible:ring-[#f05a28]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${idPrefix}-turno2-fim`} className="text-sm font-medium text-slate-700">
                      Turno 2 - Fim
                    </Label>
                    <Input
                      id={`${idPrefix}-turno2-fim`}
                      type="time"
                      value={servico.turno2Fim}
                      onChange={(e) => onServicoChange("turno2Fim", e.target.value)}
                      className="h-11 rounded-xl border-slate-200 focus-visible:ring-[#f05a28]"
                    />
                  </div>
                </div>
              </div>
            )}

              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/80 transition-all hover:bg-slate-50">
                <div className="space-y-0.5 text-left">
                  <Label htmlFor={`${idPrefix}-ativo`} className="text-sm font-bold text-slate-700 cursor-pointer">
                    Serviço Ativo
                  </Label>
                  <p className="text-xs text-slate-500">Define se este serviço está disponível para esta unidade.</p>
                </div>
                <Switch
                  id={`${idPrefix}-ativo`}
                  className="data-[state=checked]:bg-[#f05a28]"
                  checked={servico.ativo}
                  onCheckedChange={(checked) => onServicoChange("ativo", checked)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              className="flex-1 sm:flex-none text-slate-500 font-medium hover:bg-slate-100 rounded-xl px-6"
              onClick={onCancel}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 sm:flex-none bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold px-8 rounded-xl h-11 transition-all shadow-md shadow-orange-100 flex items-center gap-2"
              onClick={onSubmit}
            >
              {submitIcon}
              {submitLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
