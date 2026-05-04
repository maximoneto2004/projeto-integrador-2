import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { useBairros } from "@/hooks/sistema/useBairros";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, User, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: () => Promise<boolean> | boolean;
  cidadaoEditando: boolean;
  nome: string;
  apelido: string;
  cpf: string;
  telefone: string;
  email: string;
  dataNascimento: string;
  sexo: string;
  unidadeOrigem: string;
  unidadesOrigem: { value: string; label: string }[];
  endereco: string;
  enderecoNumero: string;
  enderecoComplemento: string;
  enderecoBairro: string;
  enderecoCep: string;
  submitting?: boolean;
  setNome: (v: string) => void;
  setApelido: (v: string) => void;
  setCpf: (v: string) => void;
  setTelefone: (v: string) => void;
  setEmail: (v: string) => void;
  setDataNascimento: (v: string) => void;
  setSexo: (v: string) => void;
  setUnidadeOrigem: (v: string) => void;
  setEndereco: (v: string) => void;
  setEnderecoNumero: (v: string) => void;
  setEnderecoComplemento: (v: string) => void;
  setEnderecoBairro: (v: string) => void;
  setEnderecoCep: (v: string) => void;
}

export function NovoCidadaoModal({
  open,
  onClose,
  onSubmit,
  cidadaoEditando,
  nome,
  apelido,
  cpf,
  telefone,
  email,
  dataNascimento,
  sexo,
  unidadeOrigem,
  unidadesOrigem,
  endereco,
  enderecoNumero,
  enderecoComplemento,
  enderecoBairro,
  enderecoCep,
  submitting = false,
  setNome,
  setApelido,
  setCpf,
  setTelefone,
  setEmail,
  setDataNascimento,
  setSexo,
  setUnidadeOrigem,
  setEndereco,
  setEnderecoNumero,
  setEnderecoComplemento,
  setEnderecoBairro,
  setEnderecoCep,
}: Props) {
  const { bairros, loading: carregandoBairros, error: erroBairros, fetchBairros } = useBairros();
  const [bairroPopoverOpen, setBairroPopoverOpen] = useState(false);
  const [unidadePopoverOpen, setUnidadePopoverOpen] = useState(false);

  useEffect(() => {
    if (open && !bairros.length) fetchBairros();
    if (!open) {
      setBairroPopoverOpen(false);
      setUnidadePopoverOpen(false);
    }
  }, [open, bairros.length, fetchBairros]);

  const bairrosOptions = useMemo(() => bairros.map((b) => ({ value: String(b.id), label: b.nome })), [bairros]);
  const bairroSelecionado = useMemo(() => bairrosOptions.find((b) => b.value === enderecoBairro), [bairrosOptions, enderecoBairro]);
  const unidadeSelecionada = useMemo(
    () => unidadesOrigem.find((u) => u.value === unidadeOrigem),
    [unidadesOrigem, unidadeOrigem],
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 border-none shadow-2xl bg-slate-50 rounded-2xl overflow-hidden flex flex-col">
        {/* Barra de destaque superior laranja */}
        <div className="bg-[#f05a28] h-1.5 w-full flex-shrink-0" />

        {/* Header Consistente */}
        <DialogHeader className="p-8 bg-white border-b flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 p-3 rounded-2xl text-[#f05a28]">
              <User className="h-6 w-6" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-2xl font-bold text-slate-800">
                {cidadaoEditando ? "Editar Cadastro" : "Novo Cadastro de Cidadão"}
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">Preencha as informações básicas e de localização abaixo.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Área de Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* SEÇÃO 1: DADOS PESSOAIS */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className="p-4 border-b border-slate-100 bg-white flex items-center gap-3">
              <div className="w-1.5 h-5 bg-[#f05a28] rounded-full" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Dados Pessoais</h3>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-6 gap-6">
              <div className="space-y-2 col-span-1 md:col-span-4">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome Completo *</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={cidadaoEditando}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Apelido</Label>
                <Input
                  value={apelido}
                  onChange={(e) => setApelido(e.target.value)}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">CPF *</Label>
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  disabled={cidadaoEditando}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Data de Nascimento *</Label>
                <Input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  disabled={cidadaoEditando}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Sexo *</Label>
                <Select value={sexo} onValueChange={setSexo}>
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                    <SelectItem value="MASCULINO">Masculino</SelectItem>
                    <SelectItem value="FEMININO">Feminino</SelectItem>
                    <SelectItem value="OUTRO">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-1 md:col-span-3">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">E-mail *</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  //disabled={cidadaoEditando}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-2 col-span-1 md:col-span-3">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Telefone *</Label>
                <Input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                />
              </div>
            </div>
          </section>

          {/* SEÇÃO 2: LOCALIZAÇÃO */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className="p-4 border-b border-slate-100 bg-white flex items-center gap-3">
              <div className="w-1.5 h-5 bg-blue-500 rounded-full" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Localização e Vínculo</h3>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2 col-span-1 md:col-span-3">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Logradouro / Endereço</Label>
                <Input
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                  placeholder="Rua, Avenida..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Número</Label>
                <Input
                  value={enderecoNumero}
                  onChange={(e) => setEnderecoNumero(e.target.value)}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Bairro</Label>
                <Popover open={bairroPopoverOpen} onOpenChange={setBairroPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-11 justify-between bg-slate-50/50 border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-100/50 transition-all"
                    >
                      {bairroSelecionado?.label || "Selecione o bairro"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-40 text-[#f05a28]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 rounded-xl shadow-2xl border-slate-100" align="start">
                    <Command className="rounded-xl">
                      <CommandInput placeholder="Buscar bairro..." className="h-11" />
                      <CommandList className="max-h-[200px] custom-scrollbar">
                        <CommandEmpty>Bairro não encontrado.</CommandEmpty>
                        <CommandGroup>
                          {bairrosOptions.map((b) => (
                            <CommandItem
                              key={b.value}
                              onSelect={() => {
                                setEnderecoBairro(b.value);
                                setBairroPopoverOpen(false);
                              }}
                              className="py-3 px-4 flex items-center gap-2"
                            >
                              <div
                                className={cn(
                                  "flex items-center justify-center w-4 h-4 rounded-full border border-slate-200",
                                  enderecoBairro === b.value ? "bg-[#f05a28] border-[#f05a28]" : "",
                                )}
                              >
                                {enderecoBairro === b.value && <Check className="h-3 w-3 text-white" />}
                              </div>
                              {b.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">CEP</Label>
                <Input
                  value={enderecoCep}
                  onChange={(e) => setEnderecoCep(e.target.value)}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Complemento</Label>
                <Input
                  value={enderecoComplemento}
                  onChange={(e) => setEnderecoComplemento(e.target.value)}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-3 col-span-1 md:col-span-4 pt-4 mt-2 border-t border-slate-50">
                <div className="flex items-center gap-2 text-[#f05a28]">
                  <MapPin className="h-4 w-4" />
                  <Label className="text-[11px] font-black uppercase tracking-widest">Unidade de Vínculo (Origem)</Label>
                </div>
                <Popover open={unidadePopoverOpen} onOpenChange={setUnidadePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={unidadePopoverOpen}
                      className="w-full h-12 justify-between bg-orange-50/30 border-orange-100 rounded-xl focus:ring-[#f05a28] focus:border-[#f05a28] transition-all font-bold text-slate-700 hover:bg-orange-50/60"
                    >
                      <span className="truncate">{unidadeSelecionada?.label || "Selecione a unidade de referência"}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40 text-[#f05a28]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl border-orange-100 shadow-2xl" align="start">
                    <Command className="rounded-xl">
                      <CommandInput placeholder="Digite o nome da unidade..." className="h-11" />
                      <CommandList className="max-h-[240px] custom-scrollbar">
                        <CommandEmpty>Unidade não encontrada.</CommandEmpty>
                        <CommandGroup>
                          {unidadesOrigem.map((u) => (
                            <CommandItem
                              key={u.value}
                              value={u.label}
                              onSelect={() => {
                                setUnidadeOrigem(u.value);
                                setUnidadePopoverOpen(false);
                              }}
                              className="py-3 px-4"
                            >
                              <Check className={cn("mr-2 h-4 w-4", unidadeOrigem === u.value ? "opacity-100 text-[#f05a28]" : "opacity-0")} />
                              {u.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Consistente */}
        <DialogFooter className="p-8 bg-white border-t flex flex-row items-center justify-end gap-3 flex-shrink-0">
          <Button variant="ghost" onClick={onClose} className="h-12 px-6 font-bold text-slate-500 rounded-xl hover:bg-slate-50 transition-all">
            Descartar
          </Button>
          <Button
            onClick={() => onSubmit()}
            disabled={submitting}
            className="h-12 px-10 bg-[#f05a28] hover:bg-[#d84a1d] text-white font-bold rounded-xl shadow-lg shadow-orange-100 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Processando..." : cidadaoEditando ? "Atualizar Cadastro" : "Finalizar Cadastro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
