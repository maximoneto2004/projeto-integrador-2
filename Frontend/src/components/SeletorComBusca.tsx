import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export type OpcaoSeletor = { valor: string; rotulo: string; detalhe?: string };

type SeletorComBuscaProps = {
  id?: string;
  opcoes: OpcaoSeletor[];
  valor: string;
  onChange: (valor: string) => void;
  placeholder: string;
  placeholderBusca?: string;
  vazio?: string;
  desabilitado?: boolean;
};

// Select com campo de busca, no mesmo padrão do seletor de medicamentos das receitas.
export function SeletorComBusca({ id, opcoes, valor, onChange, placeholder, placeholderBusca = "Buscar...", vazio = "Nada encontrado.", desabilitado }: SeletorComBuscaProps) {
  const [aberto, setAberto] = useState(false);
  const selecionada = opcoes.find((o) => o.valor === valor);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={aberto} disabled={desabilitado} className="w-full min-w-0 justify-between bg-background font-normal">
          <span className={`truncate ${selecionada ? "" : "text-muted-foreground"}`}>{selecionada?.rotulo ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholderBusca} />
          <CommandList className="max-h-64">
            <CommandEmpty>{vazio}</CommandEmpty>
            <CommandGroup>
              {opcoes.map((o) => (
                <CommandItem
                  key={o.valor}
                  value={o.valor}
                  keywords={[o.rotulo, o.detalhe ?? ""]}
                  onSelect={() => {
                    onChange(o.valor);
                    setAberto(false);
                  }}
                >
                  <Check className={`mr-2 h-4 w-4 shrink-0 ${o.valor === valor ? "opacity-100" : "opacity-0"}`} />
                  <div className="min-w-0">
                    <p className="truncate">{o.rotulo}</p>
                    {o.detalhe && <p className="truncate text-xs text-muted-foreground">{o.detalhe}</p>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
