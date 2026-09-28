import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { Medicamento } from "@/services/sistema/medicamentoService";

export function SeletorMedicamento({
  medicamentos,
  value,
  onChange,
}: {
  medicamentos: Medicamento[];
  value: string;
  onChange: (m: Medicamento) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const selecionado = medicamentos.find((m) => m.id === value);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className="truncate">{selecionado ? selecionado.descricao_completa : "Selecione o medicamento"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nome ou princípio ativo..." />
          <CommandList className="max-h-64">
            <CommandEmpty>Nenhum medicamento encontrado.</CommandEmpty>
            <CommandGroup>
              {medicamentos.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`${m.descricao_completa} ${m.principio_ativo}`}
                  onSelect={() => {
                    onChange(m);
                    setAberto(false);
                  }}
                >
                  <Check className={`mr-2 h-4 w-4 ${m.id === value ? "opacity-100" : "opacity-0"}`} />
                  <span className="flex-1">{m.descricao_completa}</span>
                  {m.controlado && <Badge variant="destructive">Controlado</Badge>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
