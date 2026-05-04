import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown, ChevronsUpDown } from "lucide-react";

type Option = { value: string; label: string };

interface FiltroProps {
  showFilters: boolean;
  onToggleFilters: () => void;

  filtroData: string;
  setFiltroData: (value: string) => void;

  filtroUnidade: string;
  setFiltroUnidade: (value: string) => void;

  filtroServico: string;
  setFiltroServico: (value: string) => void;

  filtroStatus: string;
  setFiltroStatus: (value: string) => void;

  filtroAtendente: string;
  setFiltroAtendente: (value: string) => void;

  unidades: Option[];
  servicos: Option[];
  status: Option[];
  atendentes: Option[];
}

export function Filtro({
  showFilters,
  onToggleFilters,

  filtroData,
  setFiltroData,

  filtroUnidade,
  setFiltroUnidade,

  filtroServico,
  setFiltroServico,

  filtroStatus,
  setFiltroStatus,

  filtroAtendente,
  setFiltroAtendente,

  unidades,
  servicos,
  status,
  atendentes,
}: FiltroProps) {
  const [unidadeOpen, setUnidadeOpen] = useState(false);
  const [servicoOpen, setServicoOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const unidadeSelecionadaLabel =
    filtroUnidade === "todas" ? "Todas" : unidades.find((u) => u.value === filtroUnidade)?.label || "";
  const servicoSelecionadoLabel =
    filtroServico === "todos" ? "Todos" : servicos.find((s) => s.value === filtroServico)?.label || "";
  const statusSelecionadoLabel =
    filtroStatus === "todos" ? "Todos" : status.find((s) => s.value === filtroStatus)?.label || "";

  return (
    <div className="bg-muted/50 rounded-lg p-4 mb-6">
      {/* Botão de abrir/fechar filtro */}
      <button
        onClick={onToggleFilters}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="font-bold text-foreground text-xl">Filtros</span>
        <ChevronDown
          className={`w-5 h-5 transition-transform ${
            showFilters ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Área de filtros */}
      {showFilters && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Data */}
          <div className="space-y-2">
            <Label htmlFor="filtroData">Data</Label>
            <Input
              id="filtroData"
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
            />
          </div>

          {/* Unidade */}
          <div className="space-y-2">
            <Label htmlFor="filtroUnidade">Unidade</Label>
            <Popover open={unidadeOpen} onOpenChange={setUnidadeOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="filtroUnidade"
                  variant="outline"
                  role="combobox"
                  aria-expanded={unidadeOpen}
                  className="w-full justify-between"
                >
                  <span className="truncate">{unidadeSelecionadaLabel || "Selecione"}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Digite o nome da unidade..." />
                  <CommandList>
                    <CommandEmpty>Nenhuma unidade encontrada.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="Todas"
                        onSelect={() => {
                          setFiltroUnidade("todas");
                          setUnidadeOpen(false);
                        }}
                      >
                        <Check className={`mr-2 h-4 w-4 ${filtroUnidade === "todas" ? "opacity-100" : "opacity-0"}`} />
                        Todas
                      </CommandItem>
                      {unidades.map((u) => (
                        <CommandItem
                          key={u.value}
                          value={u.label}
                          onSelect={() => {
                            setFiltroUnidade(u.value);
                            setUnidadeOpen(false);
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${filtroUnidade === u.value ? "opacity-100" : "opacity-0"}`} />
                          {u.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Serviço */}
          <div className="space-y-2">
            <Label htmlFor="filtroServico">Serviço</Label>
            <Popover open={servicoOpen} onOpenChange={setServicoOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="filtroServico"
                  variant="outline"
                  role="combobox"
                  aria-expanded={servicoOpen}
                  className="w-full justify-between"
                >
                  <span className="truncate">{servicoSelecionadoLabel || "Selecione"}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Digite o nome do serviço..." />
                  <CommandList>
                    <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="Todos"
                        onSelect={() => {
                          setFiltroServico("todos");
                          setServicoOpen(false);
                        }}
                      >
                        <Check className={`mr-2 h-4 w-4 ${filtroServico === "todos" ? "opacity-100" : "opacity-0"}`} />
                        Todos
                      </CommandItem>
                      {servicos.map((s) => (
                        <CommandItem
                          key={s.value}
                          value={s.label}
                          onSelect={() => {
                            setFiltroServico(s.value);
                            setServicoOpen(false);
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${filtroServico === s.value ? "opacity-100" : "opacity-0"}`} />
                          {s.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="filtroStatus">Status</Label>
            <Popover open={statusOpen} onOpenChange={setStatusOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="filtroStatus"
                  variant="outline"
                  role="combobox"
                  aria-expanded={statusOpen}
                  className="w-full justify-between"
                >
                  <span className="truncate">{statusSelecionadoLabel || "Selecione"}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Digite o status..." />
                  <CommandList>
                    <CommandEmpty>Nenhum status encontrado.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="Todos"
                        onSelect={() => {
                          setFiltroStatus("todos");
                          setStatusOpen(false);
                        }}
                      >
                        <Check className={`mr-2 h-4 w-4 ${filtroStatus === "todos" ? "opacity-100" : "opacity-0"}`} />
                        Todos
                      </CommandItem>
                      {status.map((s) => (
                        <CommandItem
                          key={s.value}
                          value={s.label}
                          onSelect={() => {
                            setFiltroStatus(s.value);
                            setStatusOpen(false);
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${filtroStatus === s.value ? "opacity-100" : "opacity-0"}`} />
                          {s.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Atendente */}
          {/* <div className="space-y-2">
            <Label htmlFor="filtroAtendente">Atendente</Label>
            <Select value={filtroAtendente} onValueChange={setFiltroAtendente}>
              <SelectTrigger id="filtroAtendente">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {atendentes.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div> */}
        </div>
      )}
    </div>
  );
}
