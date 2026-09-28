import { useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { Appointment } from "@/types/agenda";
import { receitaService, type ReceitaMedicamentoPayload } from "@/services/prontuario/receitaService";
import { medicamentoService, type Medicamento } from "@/services/sistema/medicamentoService";
import { toast } from "@/lib/sonner";

interface ModalRegistrarReceitaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  profissional?: string;
}

type ItemForm = Omit<ReceitaMedicamentoPayload, "quantidade_prescrita"> & { quantidade_prescrita: string };

const VALIDADE_PADRAO_DIAS = "30";

const emptyItem = (): ItemForm => ({
  medicamento: "",
  dosagem: "",
  frequencia: "",
  duracao: "",
  instrucoes: "",
  quantidade_prescrita: "",
});

const dosagemPadrao = (m: Medicamento) => `${m.concentracao} ${m.unidade_medida_display}`;

function extrairMensagemErro(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (!data || typeof data !== "object") return "Erro ao registrar receita. Tente novamente.";
  const primeiro = Object.values(data as Record<string, unknown>)[0];
  const texto = Array.isArray(primeiro) ? primeiro.flat(3).find((v) => typeof v === "string") : primeiro;
  return typeof texto === "string" ? texto : "Erro ao registrar receita. Verifique os campos.";
}

function SeletorMedicamento({
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

export function ModalRegistrarReceita({ open, onOpenChange, appointment }: ModalRegistrarReceitaProps) {
  const [diagnostico, setDiagnostico] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [validadeDias, setValidadeDias] = useState(VALIDADE_PADRAO_DIAS);
  const [itens, setItens] = useState<ItemForm[]>([emptyItem()]);
  const [catalogo, setCatalogo] = useState<Medicamento[]>([]);
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCarregandoCatalogo(true);
    medicamentoService
      .listar({ is_active: true })
      .then(setCatalogo)
      .catch(() => toast.error("Não foi possível carregar o cadastro de medicamentos."))
      .finally(() => setCarregandoCatalogo(false));
  }, [open]);

  const reset = () => {
    setDiagnostico("");
    setObservacoes("");
    setValidadeDias(VALIDADE_PADRAO_DIAS);
    setItens([emptyItem()]);
  };

  const updateItem = (index: number, patch: Partial<ItemForm>) => {
    setItens((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const selecionarMedicamento = (index: number, m: Medicamento) => {
    setItens((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const anterior = catalogo.find((c) => c.id === item.medicamento);
        const dosagemEraPadrao = !item.dosagem || (anterior && item.dosagem === dosagemPadrao(anterior));
        return { ...item, medicamento: m.id, dosagem: dosagemEraPadrao ? dosagemPadrao(m) : item.dosagem };
      })
    );
  };

  const adicionarItem = () => setItens((prev) => [...prev, emptyItem()]);
  const removerItem = (index: number) => setItens((prev) => prev.filter((_, i) => i !== index));

  const salvar = async () => {
    if (!appointment) return;

    const preenchidos = itens.filter((i) => i.medicamento);
    const incompleto = preenchidos.some(
      (i) => !i.frequencia.trim() || !i.duracao.trim() || !(Number(i.quantidade_prescrita) > 0)
    );
    if (!preenchidos.length || incompleto) {
      toast.error("Informe pelo menos um medicamento com frequência, duração e quantidade.");
      return;
    }
    const ids = preenchidos.map((i) => i.medicamento);
    if (new Set(ids).size !== ids.length) {
      toast.error("O mesmo medicamento foi adicionado mais de uma vez.");
      return;
    }
    const validade = Number(validadeDias);
    if (!Number.isInteger(validade) || validade < 1 || validade > 365) {
      toast.error("A validade deve ser de 1 a 365 dias.");
      return;
    }

    setSalvando(true);
    try {
      await receitaService.criar({
        agendamento: appointment.id,
        validade_dias: validade,
        diagnostico: diagnostico.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        medicamentos: preenchidos.map((i) => ({
          medicamento: i.medicamento,
          dosagem: i.dosagem?.trim() || undefined,
          frequencia: i.frequencia.trim(),
          duracao: i.duracao.trim(),
          instrucoes: i.instrucoes?.trim() || undefined,
          quantidade_prescrita: Number(i.quantidade_prescrita),
        })),
      });
      toast.success("Receita registrada com sucesso.");
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(extrairMensagemErro(err));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar receita</DialogTitle>
        </DialogHeader>

        {appointment && (
          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Cidadão:</strong> {appointment.nomeCidadao || "-"}
            </p>
            <p>
              <strong>CPF:</strong> {appointment.cpfCidadao || "-"}
            </p>
            <p>
              <strong>Serviço:</strong> {appointment.servico}
            </p>
          </div>
        )}

        <div className="space-y-3 mt-3">
          <Input placeholder="Diagnóstico / indicação clínica" value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
          <Textarea placeholder="Observações gerais da receita" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          <div className="flex items-center gap-2">
            <Label htmlFor="validade-receita" className="whitespace-nowrap">
              Validade da receita (dias)
            </Label>
            <Input
              id="validade-receita"
              type="number"
              min={1}
              max={365}
              className="w-24"
              value={validadeDias}
              onChange={(e) => setValidadeDias(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {carregandoCatalogo && <p className="text-sm text-muted-foreground">Carregando medicamentos...</p>}
          {!carregandoCatalogo && catalogo.length === 0 && (
            <p className="text-sm text-destructive">
              Nenhum medicamento ativo cadastrado. Peça ao administrador para cadastrar os medicamentos.
            </p>
          )}
          {itens.map((item, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-2">
              <SeletorMedicamento
                medicamentos={catalogo}
                value={item.medicamento}
                onChange={(m) => selecionarMedicamento(index, m)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  placeholder="Dosagem (padrão do cadastro)"
                  value={item.dosagem}
                  onChange={(e) => updateItem(index, { dosagem: e.target.value })}
                />
                <Input
                  type="number"
                  min={1}
                  placeholder="Quantidade a dispensar (ex: 20 comprimidos)"
                  value={item.quantidade_prescrita}
                  onChange={(e) => updateItem(index, { quantidade_prescrita: e.target.value })}
                />
                <Input
                  placeholder="Frequência (ex: 8/8h)"
                  value={item.frequencia}
                  onChange={(e) => updateItem(index, { frequencia: e.target.value })}
                />
                <Input
                  placeholder="Duração (ex: 7 dias)"
                  value={item.duracao}
                  onChange={(e) => updateItem(index, { duracao: e.target.value })}
                />
              </div>
              <Textarea
                placeholder="Instruções adicionais (ex: após refeição, evitar álcool)"
                value={item.instrucoes || ""}
                onChange={(e) => updateItem(index, { instrucoes: e.target.value })}
              />
              {itens.length > 1 && (
                <Button type="button" variant="outline" onClick={() => removerItem(index)}>
                  Remover medicamento
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <Button type="button" variant="outline" onClick={adicionarItem}>
            Adicionar medicamento
          </Button>
          <Button type="button" onClick={salvar} disabled={salvando || carregandoCatalogo}>
            {salvando ? "Salvando..." : "Salvar receita"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
