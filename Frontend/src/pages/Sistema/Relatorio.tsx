import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RoleBasedSidebar } from "@/components/RoleBasedSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useState } from "react";

import { type FormatoArquivo, type TipoRelatorio, useFormularioCrasRelatorio } from "@/hooks/sistema/useFormularioCrasRelatorio";

const Relatorio = () => {
  const [unidadePopoverOpen, setUnidadePopoverOpen] = useState(false);
  const {
    allUnidadesValue,
    formatoArquivo,
    formatosDisponiveis,
    isCoordenador,
    loadingRelatorio,
    loadingUnidades,
    mesReferencia,
    tipoRelatorio,
    unidades,
    unidadeSelecionada,
    setFormatoArquivo,
    setMesReferencia,
    setTipoRelatorio,
    setUnidadeSelecionada,
    gerarRelatorio,
    limparFiltros,
  } = useFormularioCrasRelatorio();
  const tiposRelatorio = [
    { value: "formulario_cras", label: "Registro mensal de atendimentos do CRAS" },
    { value: "atividades_cadunico", label: "Registro de atividades mensais CADÚNICO/PBF" },
  ] as const;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <RoleBasedSidebar />
        <main className="flex-1 overflow-auto">
          <div className="space-y-6 p-8">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
                <p className="text-muted-foreground">Geração de relatórios</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  className="space-y-6"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void gerarRelatorio();
                  }}
                >
                  <div className={`grid gap-4 ${isCoordenador ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
                    <div className="space-y-2">
                      <Label>Tipo de relatório</Label>
                      <Select value={tipoRelatorio} onValueChange={(value) => setTipoRelatorio(value as TipoRelatorio)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposRelatorio.map((tipo) => (
                            <SelectItem key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mes-referencia">Mês de referência</Label>
                      <Input
                        id="mes-referencia"
                        type="month"
                        value={mesReferencia}
                        onChange={(event) => setMesReferencia(event.target.value)}
                      />
                    </div>

                    {!isCoordenador ? (
                      <div className="space-y-2">
                        <Label>Unidade CRAS</Label>
                        <Popover open={unidadePopoverOpen} onOpenChange={setUnidadePopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              type="button"
                              role="combobox"
                              className="w-full justify-between"
                              disabled={loadingUnidades}
                              aria-expanded={unidadePopoverOpen}
                            >
                              <span className="truncate text-left">
                                {unidadeSelecionada === allUnidadesValue
                                  ? "Todas as unidades"
                                  : unidades.find((unidade) => unidade.id === unidadeSelecionada)?.nome || "Selecione uma unidade"}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[460px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Pesquisar unidade por nome..." />
                              <CommandList>
                                <CommandEmpty>Nenhuma unidade encontrada.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="Todas as unidades"
                                    onSelect={() => {
                                      setUnidadeSelecionada(allUnidadesValue);
                                      setUnidadePopoverOpen(false);
                                    }}
                                  >
                                    <Check className={`mr-2 h-4 w-4 ${unidadeSelecionada === allUnidadesValue ? "opacity-100" : "opacity-0"}`} />
                                    Todas as unidades
                                  </CommandItem>
                                  {unidades.map((unidade) => (
                                    <CommandItem
                                      key={unidade.id}
                                      value={unidade.nome}
                                      onSelect={() => {
                                        setUnidadeSelecionada(unidade.id);
                                        setUnidadePopoverOpen(false);
                                      }}
                                    >
                                      <Check className={`mr-2 h-4 w-4 ${unidadeSelecionada === unidade.id ? "opacity-100" : "opacity-0"}`} />
                                      {unidade.nome}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {loadingUnidades ? <p className="text-xs text-muted-foreground">Carregando unidades...</p> : null}
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <Label>Formato do arquivo</Label>
                      <Select value={formatoArquivo} onValueChange={(valor) => setFormatoArquivo(valor as FormatoArquivo)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o formato" />
                        </SelectTrigger>
                        <SelectContent>
                          {formatosDisponiveis.includes("csv") ? <SelectItem value="csv">CSV</SelectItem> : null}
                          {formatosDisponiveis.includes("xlsx") ? <SelectItem value="xlsx">XLSX (.xlsx)</SelectItem> : null}
                          {formatosDisponiveis.includes("docx") ? <SelectItem value="docx">DOCX (.docx)</SelectItem> : null}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={loadingRelatorio}>
                      {loadingRelatorio ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Gerando...
                        </span>
                      ) : (
                        `Gerar relatório ${formatoArquivo.toUpperCase()}`
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={limparFiltros} disabled={loadingRelatorio}>
                      Limpar filtros
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Relatorio;
